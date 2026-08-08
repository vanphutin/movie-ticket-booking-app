/**
 * Shared DTO-independent internal authentication contract for Gateway-to-Service requests.
 */

export const INTERNAL_AUTH_HEADER = 'x-internal-gateway-auth' as const;
export const CORRELATION_ID_HEADER = 'x-correlation-id' as const;

export interface MinimalTrustedActor {
  readonly id: string;
  readonly roles: readonly string[];
}

export interface TrustedRequestContext {
  readonly actor: MinimalTrustedActor | null;
  readonly requestId: string;
  readonly correlationId: string;
  readonly issuedAt: number;
}

export interface CanonicalSignedInput {
  readonly method: string;
  readonly path: string;
  readonly canonicalQuery: string;
  readonly bodySha256: string;
  readonly audience: string;
  readonly actor: MinimalTrustedActor | null;
  readonly requestId: string;
  readonly issuedAt: number;
  readonly nonce: string;
  readonly keyId: string;
}

export type InternalAuthFailureCategory =
  | 'MISSING_SIGNATURE'
  | 'INVALID_SIGNATURE'
  | 'KEY_NOT_FOUND'
  | 'TIMESTAMP_OUT_OF_RANGE'
  | 'REPLAYED_NONCE'
  | 'AUDIENCE_MISMATCH'
  | 'MALFORMED_ACTOR_CONTEXT';
