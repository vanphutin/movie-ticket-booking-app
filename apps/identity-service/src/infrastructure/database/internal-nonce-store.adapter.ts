import { createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';

export interface NonceClaimInput {
  readonly audience: string;
  readonly nonce: string;
  readonly requestId: string;
  readonly keyId: string;
  readonly issuedAtInSeconds: number;
  readonly ttlSeconds?: number;
}

export interface InternalNonceStorePort {
  claim(input: NonceClaimInput): Promise<boolean>;
}

export class InternalNonceStoreAdapter implements InternalNonceStorePort {
  constructor(private readonly dataSource: DataSource) {}

  async claim(input: NonceClaimInput): Promise<boolean> {
    const { audience, nonce, requestId, keyId, issuedAtInSeconds, ttlSeconds = 300 } = input;

    const nonceHash = createHash('sha256').update(nonce).digest('hex');
    // issued_at is stored for audit traceability; raw nonce is never persisted.
    const issuedAt = new Date(issuedAtInSeconds * 1000);

    try {
      // Step 1: Remove expired record for this (audience, nonce_hash) pair.
      // This enables reclaim of nonces whose retention window has elapsed.
      // An active (not-yet-expired) record is left untouched so the later
      // INSERT … ON CONFLICT will correctly detect it as a replay.
      await this.dataSource.query(
        `DELETE FROM internal_request_nonces
         WHERE audience   = $1
           AND nonce_hash = $2
           AND expires_at <= NOW()`,
        [audience, nonceHash],
      );

      // Step 2: Atomic single-use claim via INSERT … ON CONFLICT DO NOTHING.
      // expires_at is computed from the database clock (NOW()) so that it is
      // independent of the caller-supplied issuedAtInSeconds and always reflects
      // the true wall-clock retention window.
      // The composite PRIMARY KEY (audience, nonce_hash) guarantees at most one
      // contender wins even under concurrent execution — no check-then-insert race.
      const result = await this.dataSource.query<Array<{ claimed: string }>>(
        `INSERT INTO internal_request_nonces
           (audience, nonce_hash, request_id, key_id, issued_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' seconds')::interval)
         ON CONFLICT (audience, nonce_hash) DO NOTHING
         RETURNING 'winner'::text AS claimed`,
        [audience, nonceHash, requestId, keyId, issuedAt, ttlSeconds],
      );

      // If the INSERT produced a row the claim won; otherwise nonce is a replay.
      return result.length > 0;
    } catch (error) {
      throw new Error('Database connection failed or store unavailable', { cause: error });
    }
  }
}
