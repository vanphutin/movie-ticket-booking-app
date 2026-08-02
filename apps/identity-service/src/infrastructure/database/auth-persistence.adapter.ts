import { QueryFailedError } from 'typeorm';
import type { DataSource } from 'typeorm';

import type {
  CompletedRegistrationRecord,
  RegisterAtomicallyInput,
  RegisterAtomicallyResult,
  RegistrationPersistencePort,
} from '../../application/ports/registration-persistence.port';

export class AuthPersistenceAdapter implements RegistrationPersistencePort {
  constructor(private readonly dataSource: DataSource) {}

  async findCompletedByKey(
    operation: 'REGISTER',
    keyHash: string,
  ): Promise<CompletedRegistrationRecord | null> {
    const rows = await this.dataSource.query<CompletedRegistrationRecord[]>(
      `SELECT fingerprint_hash AS "fingerprintHash", fingerprint_key_id AS "fingerprintKeyId",
              encrypted_response AS "encryptedResponse", response_key_id AS "responseKeyId",
              response_nonce AS "responseNonce"
       FROM registration_idempotency_records
       WHERE operation = $1 AND key_hash = $2 AND expires_at > NOW()`,
      [operation, keyHash],
    );
    return rows[0] ?? null;
  }

  async registerAtomically(input: RegisterAtomicallyInput): Promise<RegisterAtomicallyResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO users (id, email_normalized, password_hash, status, version)
           VALUES ($1, $2, $3, 'ACTIVE', 1)`,
          [input.user.id, input.user.email, input.passwordHash],
        );
        const roles = await manager.query<{ id: string }[]>(
          `SELECT id FROM roles WHERE code = 'CUSTOMER'`,
        );
        const customerRole = roles[0];
        if (!customerRole) throw new Error('CUSTOMER_ROLE_NOT_SEEDED');
        await manager.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
          input.user.id,
          customerRole.id,
        ]);
        await manager.query(
          `INSERT INTO registration_idempotency_records
           (operation, key_hash, fingerprint_hash, fingerprint_key_id, user_id, encrypted_response, response_key_id, response_nonce, expires_at)
           VALUES ('REGISTER', $1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '24 hours')`,
          [
            input.idempotencyRecord.keyHash,
            input.idempotencyRecord.fingerprintHash,
            input.idempotencyRecord.fingerprintKeyId,
            input.user.id,
            input.idempotencyRecord.encryptedResponse,
            input.idempotencyRecord.responseKeyId,
            input.idempotencyRecord.responseNonce,
          ],
        );
        return { kind: 'created', result: { user: input.user } };
      });
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        error.message.includes('uq_registration_idempotency_operation_key')
      )
        return { kind: 'idempotency_key_exists' };
      if (error instanceof QueryFailedError && error.message.includes('uq_users_email_normalized'))
        return { kind: 'email_already_exists' };
      throw error;
    }
  }
}
