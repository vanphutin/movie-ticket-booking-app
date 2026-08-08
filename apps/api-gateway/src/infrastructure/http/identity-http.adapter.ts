import { createHash, randomUUID } from 'node:crypto';
import {
  INTERNAL_AUTH_HEADER,
  CORRELATION_ID_HEADER,
  type CanonicalSignedInput,
  type MinimalTrustedActor,
} from '@movie-ticket/auth-contract';
import {
  IdentityClientError,
  type IdentityAuthClientPort,
  type IdentityClientErrorKind,
  type IdentityUserResponse,
  type RegisterClientInput,
  type RegisterClientResult,
  type LoginClientInput,
  type LoginClientResult,
  type RefreshClientInput,
  type RefreshClientResult,
  type LogoutClientInput,
  type GetProfileClientInput,
  type GetProfileClientResult,
} from '../../application/ports/identity-auth-client.port';
import type { InternalRequestSignerPort } from '../../application/ports/internal-request-signer.port';

export interface IdentityHttpAdapterOptions {
  readonly baseUrl: string;
  readonly signer: InternalRequestSignerPort;
  readonly keyId?: string;
  readonly audience?: string;
  readonly timeoutMs?: number;
}

export class IdentityHttpAdapter implements IdentityAuthClientPort {
  private readonly baseUrl: string;
  private readonly signer: InternalRequestSignerPort;
  private readonly keyId: string;
  private readonly audience: string;
  private readonly timeoutMs: number;

  constructor(options: IdentityHttpAdapterOptions) {
    if (!options || !options.baseUrl || !options.baseUrl.trim() || !options.signer) {
      throw new Error('Missing required IdentityHttpAdapter options (baseUrl, signer)');
    }
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.signer = options.signer;
    this.keyId = options.keyId || 'v1';
    this.audience = options.audience || 'identity-service';
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  private async request<T>(params: {
    method: 'GET' | 'POST';
    path: string;
    bodyPayload?: unknown;
    correlationId: string;
    requestId: string;
    actor?: MinimalTrustedActor | null;
    idempotencyKey?: string;
    parseResult: (data: unknown) => T;
  }): Promise<T> {
    const { method, path, bodyPayload, correlationId, actor, idempotencyKey, parseResult } = params;

    let bodyStr: string | undefined;
    let bodySha256: string;

    if (bodyPayload !== undefined) {
      bodyStr = JSON.stringify(bodyPayload);
      bodySha256 = createHash('sha256').update(bodyStr).digest('hex');
    } else {
      bodySha256 = createHash('sha256').update('').digest('hex');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const nonce = randomUUID();

    const signedInput: CanonicalSignedInput = {
      method,
      path,
      canonicalQuery: '',
      bodySha256,
      audience: this.audience,
      actor: actor ?? null,
      requestId: correlationId,
      issuedAt,
      nonce,
      keyId: this.keyId,
    };

    const signature = await this.signer.sign(signedInput);

    const headers: Record<string, string> = {
      [INTERNAL_AUTH_HEADER]: signature,
      [CORRELATION_ID_HEADER]: correlationId,
    };

    if (bodyStr !== undefined) {
      headers['content-type'] = 'application/json';
    }

    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }

    if (actor) {
      headers['x-user-id'] = actor.id;
      if (actor.roles && actor.roles.length > 0) {
        headers['x-user-roles'] = actor.roles.join(',');
      }
    }

    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: bodyStr,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        throw new IdentityClientError(
          'TIMEOUT',
          `Request to Identity Service timed out after ${this.timeoutMs}ms`,
        );
      }
      throw new IdentityClientError(
        'SERVICE_UNAVAILABLE',
        `Identity Service is unavailable: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const statusCode = res.status;
      let errorMsg = `Identity Service returned status ${statusCode}`;
      try {
        const errorJson = (await res.json()) as { message?: string };
        if (errorJson && typeof errorJson.message === 'string') {
          errorMsg = errorJson.message;
        }
      } catch {
        // Ignored
      }

      let kind: IdentityClientErrorKind;
      switch (statusCode) {
        case 400:
          kind = 'INVALID_INPUT';
          break;
        case 401:
          kind = 'UNAUTHORIZED';
          break;
        case 403:
          kind = 'FORBIDDEN';
          break;
        case 404:
          kind = 'NOT_FOUND';
          break;
        case 409:
          kind = 'CONFLICT';
          break;
        default:
          kind = 'SERVICE_UNAVAILABLE';
          break;
      }

      throw new IdentityClientError(kind, errorMsg, statusCode);
    }

    if (res.status === 204) {
      return parseResult(undefined);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new IdentityClientError(
        'UNEXPECTED_RESPONSE',
        'Malformed JSON response from Identity Service',
        res.status,
      );
    }

    if (!json || typeof json !== 'object') {
      throw new IdentityClientError(
        'UNEXPECTED_RESPONSE',
        'Identity Service returned non-object JSON response',
        res.status,
      );
    }

    return parseResult(json);
  }

  private parseUserResponse(data: unknown): IdentityUserResponse {
    if (!data || typeof data !== 'object') {
      throw new IdentityClientError('UNEXPECTED_RESPONSE', 'User object missing in response');
    }

    const obj = data as Record<string, unknown>;
    if (
      typeof obj.id !== 'string' ||
      typeof obj.email !== 'string' ||
      typeof obj.displayName !== 'string'
    ) {
      throw new IdentityClientError(
        'UNEXPECTED_RESPONSE',
        'User object missing required fields (id, email, displayName)',
      );
    }

    const result: IdentityUserResponse = {
      id: obj.id,
      email: obj.email,
      displayName: obj.displayName,
    };

    if (Array.isArray(obj.roles)) {
      (result as { roles?: readonly string[] }).roles = obj.roles.map((r) => String(r));
    }

    return result;
  }

  async register(input: RegisterClientInput): Promise<RegisterClientResult> {
    return this.request({
      method: 'POST',
      path: '/internal/auth/register',
      bodyPayload: {
        email: input.email,
        password: input.password,
        displayName: input.displayName,
      },
      correlationId: input.correlationId,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      parseResult: (json) => {
        const obj = json as {
          user?: unknown;
          accessToken?: unknown;
          refreshToken?: unknown;
          expiresIn?: unknown;
        };
        if (
          !obj ||
          !obj.user ||
          typeof obj.accessToken !== 'string' ||
          typeof obj.refreshToken !== 'string' ||
          typeof obj.expiresIn !== 'number' ||
          obj.expiresIn <= 0
        ) {
          throw new IdentityClientError(
            'UNEXPECTED_RESPONSE',
            'Register response missing user, accessToken, refreshToken, or valid expiresIn',
          );
        }
        return {
          user: this.parseUserResponse(obj.user),
          accessToken: obj.accessToken,
          refreshToken: obj.refreshToken,
          expiresIn: obj.expiresIn,
        };
      },
    });
  }

  async login(input: LoginClientInput): Promise<LoginClientResult> {
    return this.request({
      method: 'POST',
      path: '/internal/auth/login',
      bodyPayload: {
        email: input.email,
        password: input.password,
      },
      correlationId: input.correlationId,
      requestId: input.requestId,
      parseResult: (json) => {
        const obj = json as {
          user?: unknown;
          accessToken?: unknown;
          refreshToken?: unknown;
          expiresIn?: unknown;
        };
        if (
          !obj ||
          !obj.user ||
          typeof obj.accessToken !== 'string' ||
          typeof obj.refreshToken !== 'string' ||
          typeof obj.expiresIn !== 'number' ||
          obj.expiresIn <= 0
        ) {
          throw new IdentityClientError(
            'UNEXPECTED_RESPONSE',
            'Login response missing user, accessToken, refreshToken, or valid expiresIn',
          );
        }
        return {
          user: this.parseUserResponse(obj.user),
          accessToken: obj.accessToken,
          refreshToken: obj.refreshToken,
          expiresIn: obj.expiresIn,
        };
      },
    });
  }

  async refresh(input: RefreshClientInput): Promise<RefreshClientResult> {
    return this.request({
      method: 'POST',
      path: '/internal/auth/refresh',
      bodyPayload: {
        refreshToken: input.refreshToken,
      },
      correlationId: input.correlationId,
      requestId: input.requestId,
      parseResult: (json) => {
        const obj = json as {
          user?: unknown;
          accessToken?: unknown;
          refreshToken?: unknown;
          expiresIn?: unknown;
        };
        if (
          !obj ||
          !obj.user ||
          typeof obj.accessToken !== 'string' ||
          typeof obj.refreshToken !== 'string' ||
          typeof obj.expiresIn !== 'number' ||
          obj.expiresIn <= 0
        ) {
          throw new IdentityClientError(
            'UNEXPECTED_RESPONSE',
            'Refresh response missing user, accessToken, refreshToken, or valid expiresIn',
          );
        }
        return {
          user: this.parseUserResponse(obj.user),
          accessToken: obj.accessToken,
          refreshToken: obj.refreshToken,
          expiresIn: obj.expiresIn,
        };
      },
    });
  }

  async logout(input: LogoutClientInput): Promise<void> {
    return this.request({
      method: 'POST',
      path: '/internal/auth/logout',
      bodyPayload: {
        refreshToken: input.refreshToken,
      },
      correlationId: input.correlationId,
      requestId: input.requestId,
      parseResult: () => undefined,
    });
  }

  async getProfile(input: GetProfileClientInput): Promise<GetProfileClientResult> {
    return this.request({
      method: 'GET',
      path: '/internal/auth/me',
      correlationId: input.correlationId,
      requestId: input.requestId,
      actor: input.actor,
      parseResult: (json) => {
        const obj = json as { user?: unknown };
        if (!obj || !obj.user) {
          throw new IdentityClientError(
            'UNEXPECTED_RESPONSE',
            'GetProfile response missing user object',
          );
        }
        return {
          user: this.parseUserResponse(obj.user),
        };
      },
    });
  }
}
