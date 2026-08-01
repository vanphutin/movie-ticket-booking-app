import type { CustomerUser } from '../domain/user';

export interface RegisterCommand {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly idempotencyKey: string;
}

export interface RegisterResult {
  readonly user: CustomerUser;
}
