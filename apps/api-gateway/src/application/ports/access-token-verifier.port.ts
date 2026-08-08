import type { MinimalTrustedActor } from '@movie-ticket/auth-contract';

export type AccessTokenVerificationErrorKind =
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'UNTRUSTED_KEY'
  | 'INVALID_ISSUER_OR_AUDIENCE'
  | 'ALGORITHM_MISMATCH';

export class AccessTokenVerificationError extends Error {
  constructor(
    public readonly kind: AccessTokenVerificationErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AccessTokenVerificationError';
  }
}

export interface AccessTokenVerifierPort {
  verifyAccessToken(token: string): Promise<MinimalTrustedActor>;
}
