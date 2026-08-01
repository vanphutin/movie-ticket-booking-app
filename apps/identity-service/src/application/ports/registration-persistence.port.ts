import type { CustomerUser } from '../../domain/user';
import type { RegisterResult } from '../auth.models';

export interface RegisterAtomicallyInput {
  readonly user: CustomerUser;
  readonly passwordHash: string;
}

export type RegisterAtomicallyResult = Readonly<{
  kind: 'created';
  result: RegisterResult;
}>;

export interface RegistrationPersistencePort {
  registerAtomically(input: RegisterAtomicallyInput): Promise<RegisterAtomicallyResult>;
}
