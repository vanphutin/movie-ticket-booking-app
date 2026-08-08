import type { MinimalTrustedActor } from '@movie-ticket/auth-contract';
import type {
  IdentityAuthClientPort,
  RegisterClientResult,
  LoginClientResult,
  RefreshClientResult,
  GetProfileClientResult,
} from './ports/identity-auth-client.port';

export interface ProxyRequestContext {
  readonly requestId: string;
  readonly actor?: MinimalTrustedActor;
}

export interface ProxyRegisterInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly idempotencyKey: string;
}

export interface ProxyLoginInput {
  readonly email: string;
  readonly password: string;
}

export interface ProxyRefreshInput {
  readonly refreshToken: string;
}

export interface ProxyLogoutInput {
  readonly refreshToken: string;
}

export class ProxyAuthUseCase {
  constructor(private readonly client: IdentityAuthClientPort) {}

  async register(
    input: ProxyRegisterInput,
    context: ProxyRequestContext,
  ): Promise<RegisterClientResult> {
    return this.client.register({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      idempotencyKey: input.idempotencyKey,
      correlationId: context.requestId,
      requestId: context.requestId,
    });
  }

  async login(input: ProxyLoginInput, context: ProxyRequestContext): Promise<LoginClientResult> {
    return this.client.login({
      email: input.email,
      password: input.password,
      correlationId: context.requestId,
      requestId: context.requestId,
    });
  }

  async refresh(
    input: ProxyRefreshInput,
    context: ProxyRequestContext,
  ): Promise<RefreshClientResult> {
    return this.client.refresh({
      refreshToken: input.refreshToken,
      correlationId: context.requestId,
      requestId: context.requestId,
    });
  }

  async logout(input: ProxyLogoutInput, context: ProxyRequestContext): Promise<void> {
    return this.client.logout({
      refreshToken: input.refreshToken,
      correlationId: context.requestId,
      requestId: context.requestId,
    });
  }

  async getProfile(context: ProxyRequestContext): Promise<GetProfileClientResult> {
    if (!context.actor) {
      throw new Error('Missing verified actor context');
    }
    return this.client.getProfile({
      correlationId: context.requestId,
      requestId: context.requestId,
      actor: context.actor,
    });
  }
}
