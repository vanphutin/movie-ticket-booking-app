import type { CustomerUser } from '../../domain/user';

export interface CredentialRecord {
  readonly user: CustomerUser;
  readonly passwordHash: string;
  readonly status: 'ACTIVE' | 'DISABLED';
}

export interface CredentialReaderPort {
  readonly findCredentialByEmail: (email: string) => Promise<CredentialRecord | null>;
}

export interface LoginSessionResult {
  readonly refreshToken: string;
}

export interface LoginSessionPort {
  readonly issueForActiveUserAtomically: (user: CustomerUser) => Promise<LoginSessionResult | null>;
}
