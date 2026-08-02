/** This boundary accepts only prepared values; its production adapter owns the atomic database transaction. */

import type { CustomerUser } from '../../domain/user';
import type { RegisterResult } from '../auth.models';

export interface CompletedRegistrationRecord {
  readonly fingerprintHash: string;
  readonly fingerprintKeyId: string;
  readonly encryptedResponse: string;
  readonly responseKeyId: string;
  readonly responseNonce: string;
}

export interface PreparedIdempotencyRecordInput {
  readonly keyHash: string;
  readonly fingerprintHash: string;
  readonly fingerprintKeyId: string;
  readonly encryptedResponse: string;
  readonly responseKeyId: string;
  readonly responseNonce: string;
}

export interface RegisterAtomicallyInput {
  readonly user: CustomerUser;
  readonly passwordHash: string;
  readonly idempotencyRecord: PreparedIdempotencyRecordInput;
}

export type RegisterAtomicallyResult =
  | Readonly<{ kind: 'created'; result: RegisterResult }>
  | Readonly<{ kind: 'email_already_exists' }>
  | Readonly<{ kind: 'idempotency_key_exists' }>;

export interface RegistrationPersistencePort {
  readonly registerAtomically: (
    input: RegisterAtomicallyInput,
  ) => Promise<RegisterAtomicallyResult>;

  readonly findCompletedByKey: (
    operation: 'REGISTER',
    keyHash: string,
  ) => Promise<CompletedRegistrationRecord | null>;
}
