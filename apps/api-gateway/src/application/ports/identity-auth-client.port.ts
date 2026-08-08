import type { MinimalTrustedActor } from '@movie-ticket/auth-contract';

export interface IdentityUserResponse {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles?: readonly string[];
}

export interface RegisterClientInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly requestId: string;
}

export interface RegisterClientResult {
  readonly user: IdentityUserResponse;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface LoginClientInput {
  readonly email: string;
  readonly password: string;
  readonly correlationId: string;
  readonly requestId: string;
}

export interface LoginClientResult {
  readonly user: IdentityUserResponse;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface RefreshClientInput {
  readonly refreshToken: string;
  readonly correlationId: string;
  readonly requestId: string;
}

export interface RefreshClientResult {
  readonly user: IdentityUserResponse;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface LogoutClientInput {
  readonly refreshToken: string;
  readonly correlationId: string;
  readonly requestId: string;
}

export interface GetProfileClientInput {
  readonly correlationId: string;
  readonly requestId: string;
  readonly actor: MinimalTrustedActor;
}

export interface GetProfileClientResult {
  readonly user: IdentityUserResponse;
}

export type IdentityClientErrorKind =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TIMEOUT'
  | 'SERVICE_UNAVAILABLE'
  | 'UNEXPECTED_RESPONSE';

export class IdentityClientError extends Error {
  constructor(
    public readonly kind: IdentityClientErrorKind,
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'IdentityClientError';
  }
}

export interface IdentityAuthClientPort {
  register(input: RegisterClientInput): Promise<RegisterClientResult>;
  login(input: LoginClientInput): Promise<LoginClientResult>;
  refresh(input: RefreshClientInput): Promise<RefreshClientResult>;
  logout(input: LogoutClientInput): Promise<void>;
  getProfile(input: GetProfileClientInput): Promise<GetProfileClientResult>;
}
