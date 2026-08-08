import type { LoginResult, RegisterResult } from '../auth.models';
import type { CompletedRegistrationRecord } from './registration-persistence.port';

export interface PasswordHasher {
  readonly hash: (plaintext: string) => Promise<string>;
  readonly verify: (plaintext: string, hash: string) => Promise<boolean>;
}

export interface IdGenerator {
  readonly generate: () => string;
}

export interface CanonicalRegistrationRequest {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}

export interface FingerprintOutcome {
  readonly hash: string;
  readonly keyId: string;
}

export interface EncryptedIdempotencyOutcome {
  readonly encryptedResponse: string;
  readonly responseKeyId: string;
  readonly responseNonce: string;
}

export interface IdempotencyCryptoPort {
  readonly hashKey: (key: string) => string;
  readonly fingerprint: (
    request: CanonicalRegistrationRequest,
    keyId?: string,
  ) => Promise<FingerprintOutcome>;
  readonly encryptResult: (result: RegisterResult) => Promise<EncryptedIdempotencyOutcome>;
  readonly decryptResult: (record: CompletedRegistrationRecord) => Promise<RegisterResult>;
}

export interface AuthTokenPort {
  readonly signAccessToken: (
    user: LoginResult['user'],
  ) => Promise<Readonly<{ accessToken: string; expiresIn: number }>>;
}
export interface PreparedRefreshToken {
  readonly rawToken: string;
  readonly tokenHash: string;
}

export interface RefreshTokenCryptoPort {
  readonly hashRefreshToken: (token: string) => string;
  readonly prepareRefreshToken: () => PreparedRefreshToken;
}
