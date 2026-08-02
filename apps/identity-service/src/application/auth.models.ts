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

export interface LoginCommand {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: CustomerUser;
}

export interface RefreshCommand {
  readonly refreshToken: string;
}

export interface RefreshResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: CustomerUser;
}
