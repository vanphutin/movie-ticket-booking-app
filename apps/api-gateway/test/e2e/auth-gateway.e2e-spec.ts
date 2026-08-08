/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import fastify from 'fastify';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash, createSign, generateKeyPairSync } from 'node:crypto';
import {
  BadRequestException,
  UnauthorizedException,
  ValidationPipe,
  type ExecutionContext,
  type ArgumentsHost,
} from '@nestjs/common';
import {
  RegisterRequestDto,
  LoginRequestDto,
  RefreshRequestDto,
  LogoutRequestDto,
} from '../../src/transport/http/auth.dto';
import type { CanonicalSignedInput } from '@movie-ticket/auth-contract';
import { InternalRequestHmacSignerAdapter } from '../../src/infrastructure/security/internal-request-hmac-signer.adapter';
import { IdentityHttpAdapter } from '../../src/infrastructure/http/identity-http.adapter';
import { JwtAccessTokenVerifierAdapter } from '../../src/infrastructure/security/jwt-access-token-verifier.adapter';
import { AccessTokenGuard } from '../../src/transport/http/access-token.guard';
import { PublicErrorFilter } from '../../src/transport/http/public-error.filter';
import { AuthController } from '../../src/transport/http/auth.controller';
import { MeController } from '../../src/transport/http/me.controller';
import {
  requestContextHook,
  type GatewayHttpRequest,
  type GatewayHttpResponse,
} from '../../src/transport/http/request-context.hook';
import {
  AccessTokenVerificationError,
  type AccessTokenVerifierPort,
} from '../../src/application/ports/access-token-verifier.port';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ProxyAuthUseCase,
  type ProxyRequestContext,
  type ProxyLoginInput,
} from '../../src/application/proxy-auth.use-case';
import {
  IdentityClientError,
  type IdentityClientErrorKind,
  type IdentityAuthClientPort,
  type RegisterClientInput,
  type LoginClientInput,
  type RefreshClientInput,
  type LogoutClientInput,
  type GetProfileClientInput,
} from '../../src/application/ports/identity-auth-client.port';

describe('Gateway Identity HTTP Client (E2E / Infrastructure)', () => {
  let mockIdentityServer: FastifyInstance;
  let mockServerUrl: string;
  let signer: InternalRequestHmacSignerAdapter;
  let adapter: IdentityHttpAdapter;
  let signSpy: jest.SpyInstance;

  const testSecret = 'secret-key-32-chars-long-for-gateway!!';

  interface RecordedRequest {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
    body: Record<string, unknown>;
  }

  const lastRecordedRequests: RecordedRequest[] = [];

  beforeAll(async () => {
    signer = new InternalRequestHmacSignerAdapter(testSecret);

    mockIdentityServer = fastify({ logger: false });

    mockIdentityServer.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
      const correlationId = String(req.headers['x-correlation-id'] ?? '');
      if (correlationId.startsWith('corr_status_')) {
        const statusKey = correlationId.replace('corr_status_', '');
        if (statusKey === 'malformed') {
          return reply.code(200).type('text/plain').send('MALFORMED_NOT_JSON');
        }
        const statusCode = parseInt(statusKey, 10);
        if (!isNaN(statusCode)) {
          return reply.code(statusCode).send({
            message: `Simulated error for status ${statusCode}`,
          });
        }
      }
      await Promise.resolve();
    });

    mockIdentityServer.addHook('preHandler', async (req: FastifyRequest, _reply: FastifyReply) => {
      void _reply;
      lastRecordedRequests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: (req.body as Record<string, unknown>) ?? {},
      });
      await Promise.resolve();
    });

    mockIdentityServer.post('/internal/auth/register', async (_req, reply) => {
      return reply.code(201).send({
        user: {
          id: 'usr_reg_123',
          email: 'newuser@example.com',
          displayName: 'New User',
          roles: ['CUSTOMER'],
        },
        accessToken: 'access.jwt.token.reg',
        refreshToken: 'refresh.raw.token.reg',
        expiresIn: 3600,
        internalDbId: 9999,
        passwordHash: '$argon2id$v=19$secret_hash',
      });
    });

    mockIdentityServer.post('/internal/auth/login', async (_req, reply) => {
      return reply.code(200).send({
        user: {
          id: 'usr_login_123',
          email: 'login@example.com',
          displayName: 'Login User',
          roles: ['CUSTOMER'],
        },
        accessToken: 'access.jwt.token',
        refreshToken: 'refresh.raw.token',
        expiresIn: 3600,
        internalSessionId: 'sess_secret_99',
      });
    });

    mockIdentityServer.post('/internal/auth/refresh', async (req, reply) => {
      const correlationId = req.headers['x-correlation-id'];
      if (correlationId === 'corr_timeout_006') {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      return reply.code(200).send({
        user: {
          id: 'usr_login_123',
          email: 'login@example.com',
          displayName: 'Login User',
          roles: ['CUSTOMER'],
        },
        accessToken: 'new.access.jwt.token',
        refreshToken: 'new.refresh.raw.token',
        expiresIn: 3600,
      });
    });

    mockIdentityServer.post('/internal/auth/logout', async (_req, reply) => {
      return reply.code(204).send();
    });

    mockIdentityServer.get('/internal/auth/me', async (_req, reply) => {
      return reply.code(200).send({
        user: {
          id: 'usr_login_123',
          email: 'login@example.com',
          displayName: 'Login User',
          roles: ['CUSTOMER'],
        },
      });
    });

    const address = await mockIdentityServer.listen({ port: 0, host: '127.0.0.1' });
    mockServerUrl = address;

    adapter = new IdentityHttpAdapter({
      baseUrl: mockServerUrl,
      signer,
      keyId: 'v1',
      audience: 'identity-service',
      timeoutMs: 2000,
    });
  });

  afterAll(async () => {
    if (mockIdentityServer) {
      await mockIdentityServer.close();
    }
  });

  beforeEach(() => {
    lastRecordedRequests.length = 0;
    if (signSpy) {
      signSpy.mockRestore();
    }
    signSpy = jest.spyOn(signer, 'sign');
  });

  it('1. EXACT_BODY_BYTES_AND_SIGNATURE_BINDING: Gateway HTTP adapter sends exact raw JSON body bytes and binds bodySha256 in internal auth signature for register and login', async () => {
    const registerInput: RegisterClientInput = {
      email: 'newuser@example.com',
      password: 'SecureP@ssw0rd123',
      displayName: 'New User',
      idempotencyKey: 'idemp-key-12345',
      correlationId: 'corr_reg_001',
      requestId: 'req_reg_001',
    };

    const result = await adapter.register(registerInput);
    expect(result.user.id).toBe('usr_reg_123');

    expect(signSpy).toHaveBeenCalled();
    const calls = signSpy.mock.calls as Array<[CanonicalSignedInput]>;
    const firstCall = calls[0];
    const signedInput = firstCall ? firstCall[0] : undefined;

    const expectedBodyStr = JSON.stringify({
      email: registerInput.email,
      password: registerInput.password,
      displayName: registerInput.displayName,
    });
    const expectedBodySha256 = createHash('sha256').update(expectedBodyStr).digest('hex');
    expect(signedInput?.bodySha256).toBe(expectedBodySha256);
    expect(signedInput?.requestId).toBe(registerInput.correlationId);

    const recorded = lastRecordedRequests.find(
      (r) => r.headers['x-correlation-id'] === registerInput.correlationId,
    );
    expect(recorded).toBeDefined();
    const headerValue = recorded?.headers['x-internal-gateway-auth'];
    const results = signSpy.mock.results as Array<{ value: Promise<string> }>;
    const firstResult = results[0];
    const expectedHeaderValue = firstResult ? await firstResult.value : undefined;
    expect(headerValue).toBe(expectedHeaderValue);
  });

  it('2. INTERNAL_AUTH_AND_CORRELATION_HEADERS_SENT: Gateway HTTP adapter sends X-Internal-Gateway-Auth and X-Correlation-Id headers on all outbound requests', async () => {
    const loginInput: LoginClientInput = {
      email: 'login@example.com',
      password: 'SecureP@ssw0rd123',
      correlationId: 'corr_login_002',
      requestId: 'req_login_002',
    };

    const result = await adapter.login(loginInput);
    expect(result.accessToken).toBe('access.jwt.token');

    const recorded = lastRecordedRequests.find(
      (r) => r.headers['x-correlation-id'] === loginInput.correlationId,
    );
    expect(recorded).toBeDefined();
    expect(recorded?.headers['x-correlation-id']).toBe('corr_login_002');
    expect(recorded?.headers['x-internal-gateway-auth']).toBeDefined();
  });

  it('3. TRUSTED_ACTOR_HEADERS_SENT_AND_CLIENT_HEADERS_NOT_FORWARDED: Gateway HTTP adapter sends X-User-Id and X-User-Roles strictly from trusted actor context', async () => {
    const getProfileInput: GetProfileClientInput = {
      correlationId: 'corr_prof_003',
      requestId: 'req_prof_003',
      actor: {
        id: 'usr_login_123',
        roles: ['CUSTOMER'],
      },
    };

    const result = await adapter.getProfile(getProfileInput);
    expect(result.user.id).toBe('usr_login_123');

    const recorded = lastRecordedRequests.find(
      (r) => r.headers['x-correlation-id'] === getProfileInput.correlationId,
    );
    expect(recorded).toBeDefined();
    expect(recorded?.headers['x-user-id']).toBe('usr_login_123');
    expect(recorded?.headers['x-user-roles']).toBe('CUSTOMER');
  });

  it('4. LOGOUT_INVOKES_POST_LOGOUT_AND_RESOLVES_VOID: Gateway HTTP adapter sends POST /internal/auth/logout with refreshToken and correlation header and resolves void', async () => {
    const logoutInput: LogoutClientInput = {
      refreshToken: 'raw_refresh_token_123',
      correlationId: 'corr_logout_004',
      requestId: 'req_logout_004',
    };

    const result = await adapter.logout(logoutInput);
    expect(result).toBeUndefined();

    const recorded = lastRecordedRequests.find(
      (r) => r.headers['x-correlation-id'] === logoutInput.correlationId,
    );
    expect(recorded).toBeDefined();
    expect(recorded?.method).toBe('POST');
    expect(recorded?.url).toBe('/internal/auth/logout');
    expect(recorded?.body).toEqual({ refreshToken: 'raw_refresh_token_123' });
    expect(recorded?.headers['x-correlation-id']).toBe('corr_logout_004');
    expect(recorded?.headers['x-internal-gateway-auth']).toBeDefined();
  });

  it.each([
    ['400', 'INVALID_INPUT', 400],
    ['401', 'UNAUTHORIZED', 401],
    ['403', 'FORBIDDEN', 403],
    ['404', 'NOT_FOUND', 404],
    ['409', 'CONFLICT', 409],
    ['500', 'SERVICE_UNAVAILABLE', 500],
    ['503', 'SERVICE_UNAVAILABLE', 503],
    ['malformed', 'UNEXPECTED_RESPONSE', 200],
  ] as const)(
    '5. HTTP_STATUS_CODES_ARE_MAPPED_TO_TYPED_IDENTITY_CLIENT_ERRORS: Identity HTTP status code %s maps to kind %s',
    async (
      statusKey: string,
      expectedKind: IdentityClientErrorKind,
      expectedStatusCode: number,
    ) => {
      const loginInput: LoginClientInput = {
        email: 'status@example.com',
        password: 'Password123',
        correlationId: `corr_status_${statusKey}`,
        requestId: `req_status_${statusKey}`,
      };

      try {
        await adapter.login(loginInput);
        throw new Error(
          `Expected adapter.login to throw IdentityClientError (${expectedKind}) for status ${statusKey}`,
        );
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(IdentityClientError);
        const clientErr = err as IdentityClientError;
        expect(clientErr.kind).toBe(expectedKind);
        if (expectedStatusCode !== undefined) {
          expect(clientErr.statusCode).toBe(expectedStatusCode);
        }
      }
    },
  );

  it('6. TIMEOUT_IS_MAPPED_TO_BOUNDED_ERROR: Network timeouts are mapped to bounded IdentityClientError with kind TIMEOUT', async () => {
    const timeoutAdapter = new IdentityHttpAdapter({
      baseUrl: mockServerUrl,
      signer,
      keyId: 'v1',
      audience: 'identity-service',
      timeoutMs: 50,
    });

    const timeoutRefreshInput: RefreshClientInput = {
      refreshToken: 'raw_refresh_token_123',
      correlationId: 'corr_timeout_006',
      requestId: 'req_ref_006_timeout',
    };

    try {
      await timeoutAdapter.refresh(timeoutRefreshInput);
      throw new Error('Expected adapter.refresh to throw IdentityClientError with kind TIMEOUT');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(IdentityClientError);
      expect((err as IdentityClientError).kind).toBe('TIMEOUT');
    }
  });

  it('7. CONNECTION_FAILURE_IS_MAPPED_TO_SERVICE_UNAVAILABLE: Connection refusal or unreachable server is mapped to bounded IdentityClientError with kind SERVICE_UNAVAILABLE', async () => {
    const tempServer = fastify({ logger: false });
    const address = await tempServer.listen({ port: 0, host: '127.0.0.1' });
    await tempServer.close();

    const unreachableAdapter = new IdentityHttpAdapter({
      baseUrl: address,
      signer,
      timeoutMs: 100,
    });

    const networkRefreshInput: RefreshClientInput = {
      refreshToken: 'raw_refresh_token_123',
      correlationId: 'corr_net_007',
      requestId: 'req_ref_007_net',
    };

    try {
      await unreachableAdapter.refresh(networkRefreshInput);
      throw new Error(
        'Expected unreachableAdapter.refresh to throw IdentityClientError with kind SERVICE_UNAVAILABLE',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(IdentityClientError);
      expect((err as IdentityClientError).kind).toBe('SERVICE_UNAVAILABLE');
    }
  });

  it('8. RESPONSE_ALLOWLISTING_STRIPS_PRIVATE_FIELDS: Register returns only mandatory session fields and canonical IdentityUserResponse', async () => {
    const registerInput: RegisterClientInput = {
      email: 'newuser@example.com',
      password: 'SecureP@ssw0rd123',
      displayName: 'New User',
      idempotencyKey: 'idemp-key-12345',
      correlationId: 'corr_reg_008',
      requestId: 'req_reg_008',
    };

    const result = await adapter.register(registerInput);
    expect(result).toEqual({
      accessToken: 'access.jwt.token.reg',
      refreshToken: 'refresh.raw.token.reg',
      expiresIn: 3600,
      user: {
        id: 'usr_reg_123',
        email: 'newuser@example.com',
        displayName: 'New User',
        roles: ['CUSTOMER'],
      },
    });
    expect((result as unknown as Record<string, unknown>).internalDbId).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('9. MISSING_REQUIRED_OPTIONS_FAILS_CLOSED: Constructor fails explicitly when required baseUrl or signer is missing', () => {
    expect(
      () =>
        new IdentityHttpAdapter({
          baseUrl: '',
          signer,
        }),
    ).toThrow('Missing required IdentityHttpAdapter options');
  });
});

describe('Gateway AccessToken Verifier (E2E / Security)', () => {
  let verifier: JwtAccessTokenVerifierAdapter;
  let testPrivateKeyPem: string;
  let testPublicKeyPem: string;

  beforeAll(() => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    testPrivateKeyPem = privateKey;
    testPublicKeyPem = publicKey;

    verifier = new JwtAccessTokenVerifierAdapter({
      publicKeysByKid: {
        v1: testPublicKeyPem,
      },
      expectedIssuer: 'https://identity.movie-ticket.local',
      expectedAudience: 'https://api.movie-ticket.local',
    });
  });

  function createTestJwt(
    header: Record<string, unknown>,
    payload: Record<string, unknown>,
    privKey: string = testPrivateKeyPem,
  ): string {
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const message = `${headerB64}.${payloadB64}`;

    const signer = createSign('SHA256');
    signer.update(message);
    const signatureB64 = signer.sign(privKey, 'base64url');

    return `${message}.${signatureB64}`;
  }

  it('1. VALID_RS256_TOKEN_VERIFIES_AND_RETURNS_MINIMAL_TRUSTED_ACTOR: Valid RS256 token signed by trusted key matching kid, issuer, audience, and unexpired returns minimal trusted actor', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256', kid: 'v1' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://api.movie-ticket.local',
        exp: now + 3600,
      },
    );

    const actor = await verifier.verifyAccessToken(token);
    expect(actor).toEqual({
      id: 'usr_123',
      roles: ['CUSTOMER'],
    });
  });

  it('2. WRONG_ALGORITHM_REJECTED: Token using HS256 algorithm is rejected with ALGORITHM_MISMATCH', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'HS256', kid: 'v1' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://api.movie-ticket.local',
        exp: now + 3600,
      },
    );

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind ALGORITHM_MISMATCH',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('ALGORITHM_MISMATCH');
    }
  });

  it('3a. UNKNOWN_KID_REJECTED: Token containing unknown kid is rejected with UNTRUSTED_KEY', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256', kid: 'unknown_kid_v99' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://api.movie-ticket.local',
        exp: now + 3600,
      },
    );

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind UNTRUSTED_KEY',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('UNTRUSTED_KEY');
    }
  });

  it('3b. MISSING_KID_REJECTED: Token missing kid claim in header is rejected with UNTRUSTED_KEY', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://api.movie-ticket.local',
        exp: now + 3600,
      },
    );

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind UNTRUSTED_KEY',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('UNTRUSTED_KEY');
    }
  });

  it('4. WRONG_ISSUER_REJECTED: Token with mismatched issuer is rejected with INVALID_ISSUER_OR_AUDIENCE', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256', kid: 'v1' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://evil.issuer.com',
        aud: 'https://api.movie-ticket.local',
        exp: now + 3600,
      },
    );

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind INVALID_ISSUER_OR_AUDIENCE',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('INVALID_ISSUER_OR_AUDIENCE');
    }
  });

  it('5. WRONG_AUDIENCE_REJECTED: Token with mismatched audience is rejected with INVALID_ISSUER_OR_AUDIENCE', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256', kid: 'v1' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://wrong.audience.com',
        exp: now + 3600,
      },
    );

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind INVALID_ISSUER_OR_AUDIENCE',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('INVALID_ISSUER_OR_AUDIENCE');
    }
  });

  it('6a. EXPIRED_TOKEN_REJECTED: Token with past exp claim is rejected with EXPIRED_TOKEN', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256', kid: 'v1' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://api.movie-ticket.local',
        exp: now - 100,
      },
    );

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind EXPIRED_TOKEN',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('EXPIRED_TOKEN');
    }
  });

  it('6b. MISSING_EXP_CLAIM_REJECTED: Token payload missing exp claim is rejected with EXPIRED_TOKEN', async () => {
    const token = createTestJwt(
      { alg: 'RS256', kid: 'v1' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://api.movie-ticket.local',
      },
    );

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind EXPIRED_TOKEN',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('EXPIRED_TOKEN');
    }
  });

  it('7. FUTURE_NBF_TOKEN_REJECTED: Token with future nbf claim is rejected with EXPIRED_TOKEN', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256', kid: 'v1' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://api.movie-ticket.local',
        exp: now + 3600,
        nbf: now + 300,
      },
    );

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind EXPIRED_TOKEN',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('EXPIRED_TOKEN');
    }
  });

  it('7b. NON_NUMERIC_NBF_CLAIM_REJECTED: Token with non-numeric nbf claim is rejected with EXPIRED_TOKEN', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256', kid: 'v1' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://api.movie-ticket.local',
        exp: now + 3600,
        nbf: 'tomorrow',
      },
    );

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind EXPIRED_TOKEN',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('EXPIRED_TOKEN');
    }
  });

  it('8. TAMPERED_SIGNATURE_REJECTED: Token with tampered payload or signature is rejected with INVALID_TOKEN', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256', kid: 'v1' },
      {
        sub: 'usr_123',
        roles: ['CUSTOMER'],
        iss: 'https://identity.movie-ticket.local',
        aud: 'https://api.movie-ticket.local',
        exp: now + 3600,
      },
    );

    const tamperedToken = token + 'extra_tampered_bytes';

    try {
      await verifier.verifyAccessToken(tamperedToken);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind INVALID_TOKEN',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('INVALID_TOKEN');
    }
  });

  it('9. MALFORMED_TOKEN_REJECTED: Malformed token string is rejected with INVALID_TOKEN', async () => {
    try {
      await verifier.verifyAccessToken('not.a.valid.jwt.string.at.all');
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind INVALID_TOKEN',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('INVALID_TOKEN');
    }
  });

  it('9b. NON_OBJECT_HEADER_JSON_REJECTED: Token with null or non-object header JSON is rejected with INVALID_TOKEN', async () => {
    const headerB64 = Buffer.from('null').toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify({ sub: 'usr_123' })).toString('base64url');
    const token = `${headerB64}.${payloadB64}.sig`;

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind INVALID_TOKEN',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('INVALID_TOKEN');
    }
  });

  it('9c. NON_OBJECT_PAYLOAD_JSON_REJECTED: Token with null or non-object payload JSON signed with valid key is rejected with INVALID_TOKEN', async () => {
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'v1' })).toString(
      'base64url',
    );
    const payloadB64 = Buffer.from('null').toString('base64url');
    const message = `${headerB64}.${payloadB64}`;

    const signer = createSign('SHA256');
    signer.update(message);
    const signatureB64 = signer.sign(testPrivateKeyPem, 'base64url');
    const token = `${message}.${signatureB64}`;

    try {
      await verifier.verifyAccessToken(token);
      throw new Error(
        'Expected verifyAccessToken to throw AccessTokenVerificationError with kind INVALID_TOKEN',
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AccessTokenVerificationError);
      expect((err as AccessTokenVerificationError).kind).toBe('INVALID_TOKEN');
    }
  });

  it.each([
    [undefined, 'missing sub'],
    ['', 'empty string sub'],
  ] as const)(
    '10a. MISSING_OR_EMPTY_SUB_REJECTED: Token payload with %s is rejected with INVALID_TOKEN',
    async (subVal, _label) => {
      void _label;
      const now = Math.floor(Date.now() / 1000);
      const token = createTestJwt(
        { alg: 'RS256', kid: 'v1' },
        {
          sub: subVal,
          roles: ['CUSTOMER'],
          iss: 'https://identity.movie-ticket.local',
          aud: 'https://api.movie-ticket.local',
          exp: now + 3600,
        },
      );

      try {
        await verifier.verifyAccessToken(token);
        throw new Error(
          'Expected verifyAccessToken to throw AccessTokenVerificationError with kind INVALID_TOKEN',
        );
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AccessTokenVerificationError);
        expect((err as AccessTokenVerificationError).kind).toBe('INVALID_TOKEN');
      }
    },
  );

  it.each([
    ['NOT_AN_ARRAY', 'string roles'],
    [12345, 'number roles'],
    [null, 'null roles'],
  ] as const)(
    '10b. NON_ARRAY_ROLES_REJECTED: Token payload with %s is rejected with INVALID_TOKEN',
    async (rolesVal, _label) => {
      void _label;
      const now = Math.floor(Date.now() / 1000);
      const token = createTestJwt(
        { alg: 'RS256', kid: 'v1' },
        {
          sub: 'usr_123',
          roles: rolesVal,
          iss: 'https://identity.movie-ticket.local',
          aud: 'https://api.movie-ticket.local',
          exp: now + 3600,
        },
      );

      try {
        await verifier.verifyAccessToken(token);
        throw new Error(
          'Expected verifyAccessToken to throw AccessTokenVerificationError with kind INVALID_TOKEN',
        );
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AccessTokenVerificationError);
        expect((err as AccessTokenVerificationError).kind).toBe('INVALID_TOKEN');
      }
    },
  );

  it.each([
    [[123], 'array with number element'],
    [['CUSTOMER', true], 'array with boolean element'],
  ] as const)(
    '10c. NON_STRING_ROLE_ELEMENT_REJECTED: Token payload with %s is rejected with INVALID_TOKEN',
    async (rolesVal, _label) => {
      void _label;
      const now = Math.floor(Date.now() / 1000);
      const token = createTestJwt(
        { alg: 'RS256', kid: 'v1' },
        {
          sub: 'usr_123',
          roles: rolesVal,
          iss: 'https://identity.movie-ticket.local',
          aud: 'https://api.movie-ticket.local',
          exp: now + 3600,
        },
      );

      try {
        await verifier.verifyAccessToken(token);
        throw new Error(
          'Expected verifyAccessToken to throw AccessTokenVerificationError with kind INVALID_TOKEN',
        );
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AccessTokenVerificationError);
        expect((err as AccessTokenVerificationError).kind).toBe('INVALID_TOKEN');
      }
    },
  );

  it('11. CONSTRUCTOR_MISSING_KEYS_OR_CONFIG_FAILS_CLOSED: Constructor fails explicitly when publicKeysByKid, issuer, or audience is missing', () => {
    expect(
      () =>
        new JwtAccessTokenVerifierAdapter({
          publicKeysByKid: {},
          expectedIssuer: '',
          expectedAudience: '',
        }),
    ).toThrow('Missing required JwtAccessTokenVerifierAdapter options');
  });
});

describe('Gateway AccessToken Guard (E2E / Transport)', () => {
  let verifySpy: jest.Mock;
  let mockVerifier: AccessTokenVerifierPort;
  let guard: AccessTokenGuard;

  beforeEach(() => {
    verifySpy = jest.fn();
    mockVerifier = {
      verifyAccessToken: verifySpy,
    };
    guard = new AccessTokenGuard(mockVerifier);
  });

  function createMockExecutionContext(headers: Record<string, string | string[] | undefined>): {
    context: ExecutionContext;
    request: Record<string, unknown>;
  } {
    const request: Record<string, unknown> = {
      headers,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  it('1. VALID_BEARER_TOKEN_ATTACHED_TO_REQUEST_ACTOR: Valid Authorization Bearer token delegates to verifier and attaches trusted actor to request.actor', async () => {
    verifySpy.mockResolvedValueOnce({
      id: 'usr_actor_001',
      roles: ['CUSTOMER'],
    });

    const { context, request } = createMockExecutionContext({
      authorization: 'Bearer valid_token_abc123',
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(verifySpy).toHaveBeenCalledWith('valid_token_abc123');
    expect(request.actor).toEqual({
      id: 'usr_actor_001',
      roles: ['CUSTOMER'],
    });
  });

  it('2. MISSING_AUTHORIZATION_HEADER_REJECTED: Request missing Authorization header throws neutral UnauthorizedException', async () => {
    const { context } = createMockExecutionContext({});

    try {
      await guard.canActivate(context);
      throw new Error('Expected guard.canActivate to throw UnauthorizedException');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(UnauthorizedException);
    }
  });

  it.each([
    ['Basic dXNlcjpwYXNz', 'Basic scheme'],
    ['Token abc123xyz', 'Token scheme'],
    ['BearerToken 123', 'BearerToken scheme'],
  ] as const)(
    '3. NON_BEARER_SCHEME_REJECTED: Request with %s scheme throws neutral UnauthorizedException',
    async (authHeader, _label) => {
      void _label;
      const { context } = createMockExecutionContext({
        authorization: authHeader,
      });

      try {
        await guard.canActivate(context);
        throw new Error('Expected guard.canActivate to throw UnauthorizedException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    },
  );

  it.each([
    ['Bearer ', 'empty Bearer token'],
    ['Bearer   ', 'whitespace Bearer token'],
  ] as const)(
    '4. EMPTY_BEARER_TOKEN_REJECTED: Request with %s throws neutral UnauthorizedException',
    async (authHeader, _label) => {
      void _label;
      const { context } = createMockExecutionContext({
        authorization: authHeader,
      });

      try {
        await guard.canActivate(context);
        throw new Error('Expected guard.canActivate to throw UnauthorizedException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    },
  );

  it.each([
    [['Bearer token1', 'Bearer token2'], 'array of authorization headers'],
    ['Bearer token1, Bearer token2', 'comma-separated tokens'],
  ] as const)(
    '5. MULTIPLE_AUTHORIZATION_HEADERS_OR_BEARER_TOKENS_REJECTED: Request with %s throws neutral UnauthorizedException',
    async (authHeader, _label) => {
      void _label;
      const { context } = createMockExecutionContext({
        authorization: authHeader as unknown as string | string[],
      });

      try {
        await guard.canActivate(context);
        throw new Error('Expected guard.canActivate to throw UnauthorizedException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    },
  );

  it('6. CLIENT_SPOOFED_USER_HEADERS_NOT_TRUSTED: Request sending spoofed user headers receives actor strictly from verifier', async () => {
    verifySpy.mockResolvedValueOnce({
      id: 'usr_trusted_001',
      roles: ['CUSTOMER'],
    });

    const { context, request } = createMockExecutionContext({
      authorization: 'Bearer valid_token_abc123',
      'x-user-id': 'spoofed_admin',
      'x-user-roles': 'SUPERADMIN',
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.actor).toEqual({
      id: 'usr_trusted_001',
      roles: ['CUSTOMER'],
    });
  });

  it('7. VERIFIER_ERROR_MAPPED_TO_NEUTRAL_UNAUTHORIZED: When verifier throws AccessTokenVerificationError, guard throws neutral UnauthorizedException', async () => {
    verifySpy.mockRejectedValueOnce(
      new AccessTokenVerificationError('EXPIRED_TOKEN', 'Internal key expired at timestamp 12345'),
    );

    const { context } = createMockExecutionContext({
      authorization: 'Bearer expired_token_xyz',
    });

    try {
      await guard.canActivate(context);
      throw new Error('Expected guard.canActivate to throw UnauthorizedException');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      const unauthErr = err as UnauthorizedException;
      expect(unauthErr.message).not.toContain('12345');
      expect(unauthErr.message).not.toContain('Internal key expired');
    }
  });

  it('8. CONSTRUCTOR_MISSING_VERIFIER_FAILS_CLOSED: Constructor fails explicitly when verifier dependency is missing', () => {
    expect(() => new AccessTokenGuard(null as unknown as AccessTokenVerifierPort)).toThrow(
      'Missing required AccessTokenGuard dependency',
    );
  });
});

describe('Gateway Request Context Hook (E2E / Transport)', () => {
  it('1. TRUSTED_REQUEST_ID_GENERATED_AND_SET_IN_RESPONSE: Hook generates a trusted request ID, binds it to req.requestId, and sets response header X-Request-Id', async () => {
    const req: GatewayHttpRequest = {
      headers: {},
    };
    const responseHeaders: Record<string, string> = {};
    const res: GatewayHttpResponse = {
      header: (name: string, value: string) => {
        responseHeaders[name.toLowerCase()] = value;
      },
    };

    await requestContextHook(req, res);

    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
    expect(req.requestId?.length).toBeGreaterThan(0);
    expect(responseHeaders['x-request-id']).toBe(req.requestId);
  });

  it('2. CLIENT_REQUEST_ID_AND_CORRELATION_ID_NOT_TRUSTED: Request sending client X-Request-Id or X-Correlation-Id gets a new server-generated trusted ID', async () => {
    const req: GatewayHttpRequest = {
      headers: {
        'x-request-id': 'client_req_spoofed_999',
        'x-correlation-id': 'client_corr_spoofed_999',
      },
    };
    const responseHeaders: Record<string, string> = {};
    const res: GatewayHttpResponse = {
      header: (name: string, value: string) => {
        responseHeaders[name.toLowerCase()] = value;
      },
    };

    await requestContextHook(req, res);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).not.toBe('client_req_spoofed_999');
    expect(req.requestId).not.toBe('client_corr_spoofed_999');
    expect(responseHeaders['x-request-id']).toBe(req.requestId);
  });

  it.each([
    ['x-request-id', 'client_req_spoofed_123'],
    ['x-correlation-id', 'client_corr_spoofed_123'],
    ['x-user-id', 'spoofed_user_id_123'],
    ['x-user-roles', 'SUPERADMIN'],
    ['x-internal-gateway-auth', 'spoofed_signature_bytes'],
  ] as const)(
    '3. UNTRUSTED_CLIENT_HEADER_STRIPPED: Hook deletes untrusted header %s while preserving content-type',
    async (headerName, spoofedValue) => {
      const req: GatewayHttpRequest = {
        headers: {
          'content-type': 'application/json',
          [headerName]: spoofedValue,
        },
      };
      const res: GatewayHttpResponse = {
        header: () => {},
      };

      await requestContextHook(req, res);

      expect(req.headers['content-type']).toBe('application/json');
      expect(req.headers[headerName]).toBeUndefined();
    },
  );
});

describe('Gateway Public Error Filter (E2E / Transport)', () => {
  let filter: PublicErrorFilter;

  beforeEach(() => {
    filter = new PublicErrorFilter();
  });

  function createMockArgumentsHost(requestId = 'req_trusted_123'): {
    host: ArgumentsHost;
    req: Record<string, unknown>;
    res: {
      statusCode?: number;
      headers: Record<string, string>;
      body?: Record<string, unknown>;
      header: (name: string, value: string) => void;
      setHeader: (name: string, value: string) => void;
      status: (code: number) => { json: (data: Record<string, unknown>) => void };
    };
  } {
    const req: Record<string, unknown> = {
      requestId,
    };
    const headersRecord: Record<string, string> = {};
    const res = {
      statusCode: undefined as number | undefined,
      headers: headersRecord,
      body: undefined as Record<string, unknown> | undefined,
      header(name: string, value: string) {
        headersRecord[name.toLowerCase()] = value;
      },
      setHeader(name: string, value: string) {
        headersRecord[name.toLowerCase()] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return {
          json: (data: Record<string, unknown>) => {
            this.body = data;
          },
        };
      },
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost;

    return { host, req, res };
  }

  it('1. BAD_REQUEST_OR_VALIDATION_ERROR_MAPPED_TO_400_INVALID_INPUT: BadRequestException maps to HTTP 400 with code INVALID_INPUT and trusted requestId', () => {
    const { host, res } = createMockArgumentsHost('req_val_001');
    const exception = new BadRequestException('Validation failed: email is required');

    filter.catch(exception, host);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      code: 'INVALID_INPUT',
      message: 'Validation failed: email is required',
      requestId: 'req_val_001',
    });
    expect(res.headers['x-request-id']).toBe('req_val_001');
    expect(res.headers['x-request-id']).toBe(res.body?.requestId);
  });

  it('2. UNAUTHORIZED_EXCEPTION_MAPPED_TO_401_UNAUTHORIZED: UnauthorizedException maps to HTTP 401 with code UNAUTHORIZED and trusted requestId', () => {
    const { host, res } = createMockArgumentsHost('req_unauth_002');
    const exception = new UnauthorizedException('Unauthorized access: Invalid or missing token');

    filter.catch(exception, host);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized access: Invalid or missing token',
      requestId: 'req_unauth_002',
    });
    expect(res.headers['x-request-id']).toBe('req_unauth_002');
    expect(res.headers['x-request-id']).toBe(res.body?.requestId);
  });

  it.each([
    ['INVALID_INPUT', 400, 'INVALID_INPUT', 'Invalid input request'],
    ['UNAUTHORIZED', 401, 'UNAUTHORIZED', 'Authentication required'],
    ['FORBIDDEN', 403, 'FORBIDDEN', 'Access forbidden'],
    ['NOT_FOUND', 404, 'NOT_FOUND', 'Resource not found'],
    ['CONFLICT', 409, 'CONFLICT', 'Resource conflict'],
    ['TIMEOUT', 503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable'],
    ['SERVICE_UNAVAILABLE', 503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable'],
    ['UNEXPECTED_RESPONSE', 503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable'],
  ] as const)(
    '3. IDENTITY_CLIENT_ERRORS_MAPPED_TO_PUBLIC_STATUS_AND_CODE: IdentityClientError kind %s maps to HTTP status %i, code %s, and sanitized public message',
    (kind, expectedStatus, expectedCode, expectedPublicMsg) => {
      const { host, res } = createMockArgumentsHost('req_id_003');
      const sensitiveInternalMsg =
        'INTERNAL_FAIL: postgres://db:secret@10.0.0.1:5432 or fetch failed at /internal/auth/login with token secret_jwt_123';
      const exception = new IdentityClientError(kind, sensitiveInternalMsg);

      filter.catch(exception, host);

      expect(res.statusCode).toBe(expectedStatus);
      expect(res.body).toEqual({
        code: expectedCode,
        message: expectedPublicMsg,
        requestId: 'req_id_003',
      });
      expect(res.headers['x-request-id']).toBe('req_id_003');
      expect(res.headers['x-request-id']).toBe(res.body?.requestId);
      expect(JSON.stringify(res.body)).not.toContain('postgres');
      expect(JSON.stringify(res.body)).not.toContain('secret_jwt_123');
    },
  );

  it('4. UNKNOWN_OR_CRYPTO_OR_DB_ERRORS_MAPPED_TO_NEUTRAL_500: Raw internal error or TypeError maps to HTTP 500 without leaking stack or internal details', () => {
    const { host, res } = createMockArgumentsHost('req_err_004');
    const exception = new Error(
      'FATAL: Database connection failed at postgres://user:secret@localhost:5432/db',
    );

    filter.catch(exception, host);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
      requestId: 'req_err_004',
    });
    expect(res.headers['x-request-id']).toBe('req_err_004');
    expect(res.headers['x-request-id']).toBe(res.body?.requestId);
    expect(JSON.stringify(res.body)).not.toContain('postgres');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('5. PUBLIC_ERROR_PAYLOAD_CONTAINS_ONLY_CODE_MESSAGE_REQUEST_ID: Public error response body object contains strictly keys code, message, and requestId', () => {
    const { host, res } = createMockArgumentsHost('req_keys_005');
    const exception = new BadRequestException('Invalid input');

    filter.catch(exception, host);

    expect(res.body).toBeDefined();
    const keys = Object.keys(res.body ?? {}).sort();
    expect(keys).toEqual(['code', 'message', 'requestId']);
    expect(res.headers['x-request-id']).toBe('req_keys_005');
    expect(res.headers['x-request-id']).toBe(res.body?.requestId);
  });
});

describe('Gateway Proxy Auth Application UseCase (E2E / Application)', () => {
  let mockClient: jest.Mocked<IdentityAuthClientPort>;
  let useCase: ProxyAuthUseCase;

  beforeEach(() => {
    mockClient = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };
    useCase = new ProxyAuthUseCase(mockClient);
  });

  it('1a. REGISTER_DELEGATES_EXACTLY_ONCE: register delegates to IdentityAuthClientPort.register exactly once', async () => {
    mockClient.register.mockResolvedValueOnce({
      user: { id: 'u1', email: 'reg@test.com', displayName: 'Reg Test' },
      accessToken: 'acc_reg_1',
      refreshToken: 'ref_reg_1',
      expiresIn: 900,
    });
    const ctx: ProxyRequestContext = { requestId: 'req_del_reg' };

    await useCase.register(
      { email: 'reg@test.com', password: 'pass', displayName: 'Reg Test', idempotencyKey: 'ik_1' },
      ctx,
    );

    expect(mockClient.register).toHaveBeenCalledTimes(1);
  });

  it('1b. LOGIN_DELEGATES_EXACTLY_ONCE: login delegates to IdentityAuthClientPort.login exactly once', async () => {
    mockClient.login.mockResolvedValueOnce({
      user: { id: 'u1', email: 'login@test.com', displayName: 'Login Test' },
      accessToken: 'acc_1',
      refreshToken: 'ref_1',
      expiresIn: 900,
    });
    const ctx: ProxyRequestContext = { requestId: 'req_del_login' };

    await useCase.login({ email: 'login@test.com', password: 'pass' }, ctx);

    expect(mockClient.login).toHaveBeenCalledTimes(1);
  });

  it('1c. REFRESH_DELEGATES_EXACTLY_ONCE: refresh delegates to IdentityAuthClientPort.refresh exactly once', async () => {
    mockClient.refresh.mockResolvedValueOnce({
      user: { id: 'u1', email: 'ref@test.com', displayName: 'Ref Test' },
      accessToken: 'acc_2',
      refreshToken: 'ref_2',
      expiresIn: 900,
    });
    const ctx: ProxyRequestContext = { requestId: 'req_del_ref' };

    await useCase.refresh({ refreshToken: 'ref_1' }, ctx);

    expect(mockClient.refresh).toHaveBeenCalledTimes(1);
  });

  it('1d. LOGOUT_DELEGATES_EXACTLY_ONCE: logout delegates to IdentityAuthClientPort.logout exactly once', async () => {
    mockClient.logout.mockResolvedValueOnce();
    const ctx: ProxyRequestContext = { requestId: 'req_del_logout' };

    await useCase.logout({ refreshToken: 'ref_1' }, ctx);

    expect(mockClient.logout).toHaveBeenCalledTimes(1);
  });

  it('1e. PROFILE_DELEGATES_EXACTLY_ONCE: profile delegates to IdentityAuthClientPort.getProfile exactly once', async () => {
    mockClient.getProfile.mockResolvedValueOnce({
      user: { id: 'u1', email: 'prof@test.com', displayName: 'Prof Test' },
    });
    const ctx: ProxyRequestContext = {
      requestId: 'req_del_prof',
      actor: { id: 'u1', roles: ['CUSTOMER'] },
    };

    await useCase.getProfile(ctx);

    expect(mockClient.getProfile).toHaveBeenCalledTimes(1);
  });

  it('2. TRUSTED_REQUEST_ID_PROPAGATES_AS_INTERNAL_CORRELATION_CONTEXT: Trusted requestId passes as correlationId and requestId to client', async () => {
    mockClient.register.mockResolvedValueOnce({
      user: { id: 'u2', email: 'cor@test.com', displayName: 'Cor Test' },
      accessToken: 'acc_cor_2',
      refreshToken: 'ref_cor_2',
      expiresIn: 900,
    });
    const ctx: ProxyRequestContext = { requestId: 'req_corr_999' };

    await useCase.register(
      { email: 'cor@test.com', password: 'pass', displayName: 'Cor Test', idempotencyKey: 'ik_2' },
      ctx,
    );

    expect(mockClient.register).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'req_corr_999',
        requestId: 'req_corr_999',
      }),
    );
  });

  it('3. PROFILE_FORWARDS_ONLY_VERIFIED_MINIMAL_ACTOR: Profile forwards strictly verified minimal actor from request context', async () => {
    mockClient.getProfile.mockResolvedValueOnce({
      user: { id: 'usr_verified_777', email: 'ver@test.com', displayName: 'Ver Test' },
    });

    const verifiedActor = { id: 'usr_verified_777', roles: ['CUSTOMER'] };
    const ctx: ProxyRequestContext = { requestId: 'req_prof_777', actor: verifiedActor };

    await useCase.getProfile(ctx);

    expect(mockClient.getProfile).toHaveBeenCalledWith({
      correlationId: 'req_prof_777',
      requestId: 'req_prof_777',
      actor: verifiedActor,
    });
  });

  it('4. PUBLIC_CREDENTIAL_FIELDS_NEVER_CREATE_OR_OVERRIDE_ACTOR_CONTEXT: Unauthenticated endpoints do not inject or fabricate actor context', async () => {
    mockClient.login.mockResolvedValueOnce({
      user: { id: 'u4', email: 'spoof@test.com', displayName: 'Spoof' },
      accessToken: 'acc_4',
      refreshToken: 'ref_4',
      expiresIn: 900,
    });

    const ctx: ProxyRequestContext = { requestId: 'req_spoof_000' };
    const spoofInput = {
      email: 'spoof@test.com',
      password: 'pass',
      actor: { id: 'admin', roles: ['ADMIN'] },
    } as unknown as ProxyLoginInput;

    await useCase.login(spoofInput, ctx);

    const callArg = mockClient.login.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('actor');
    expect(callArg?.email).toBe('spoof@test.com');
  });

  it('5a. IDENTITY_CLIENT_RESULTS_PROPAGATE_WITHOUT_DOMAIN_REINTERPRETATION: Identity client success results pass through transparently', async () => {
    const expectedResult = {
      user: { id: 'u5', email: 'res@test.com', displayName: 'Res' },
      accessToken: 'a5',
      refreshToken: 'r5',
      expiresIn: 900,
    };
    mockClient.login.mockResolvedValueOnce(expectedResult);

    const ctx: ProxyRequestContext = { requestId: 'req_prop_555' };
    const res = await useCase.login({ email: 'res@test.com', password: 'p' }, ctx);
    expect(res).toBe(expectedResult);
  });

  it('5b. IDENTITY_CLIENT_TYPED_FAILURES_PROPAGATE_WITHOUT_DOMAIN_REINTERPRETATION: IdentityClientError typed failures pass through transparently', async () => {
    const typedError = new IdentityClientError('CONFLICT', 'Email already registered');
    mockClient.register.mockRejectedValueOnce(typedError);

    const ctx: ProxyRequestContext = { requestId: 'req_prop_err' };
    await expect(
      useCase.register(
        { email: 'res@test.com', password: 'p', displayName: 'Res', idempotencyKey: 'ik_5' },
        ctx,
      ),
    ).rejects.toThrow(typedError);
  });

  it('6. APPLICATION_BOUNDARY_HAS_NO_NESTJS_TYPEORM_OR_IDENTITY_PRIVATE_IMPORT: Source file has no dependency on NestJS, TypeORM, or Identity internal paths', () => {
    const filePath = join(__dirname, '../../src/application/proxy-auth.use-case.ts');
    const content = readFileSync(filePath, 'utf-8');

    expect(content).not.toContain('@nestjs');
    expect(content).not.toContain('typeorm');
    expect(content).not.toContain('identity-service');
  });
});

describe('Gateway Auth Public DTOs (E2E / Transport)', () => {
  let validationPipe: ValidationPipe;

  beforeEach(() => {
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  // --- 1. RegisterRequestDto ---

  it('1a. REGISTER_DTO_VALID_PAYLOAD_ACCEPTED: Valid OpenAPI register payload passes ValidationPipe transform', async () => {
    const validPayload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
    };

    const result = (await validationPipe.transform(validPayload, {
      type: 'body',
      metatype: RegisterRequestDto,
    })) as RegisterRequestDto;

    expect(result).toBeDefined();
    expect(result.email).toBe('customer@example.com');
    expect(result.password).toBe('correct horse battery staple');
    expect(result.displayName).toBe('Nguyen Van A');
  });

  it('1b1. REGISTER_DTO_MISSING_EMAIL_REJECTED: Register payload missing email is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1b2. REGISTER_DTO_MISSING_PASSWORD_REJECTED: Register payload missing password is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      displayName: 'Nguyen Van A',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1b3. REGISTER_DTO_MISSING_DISPLAY_NAME_REJECTED: Register payload missing displayName is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1c1. REGISTER_DTO_INVALID_EMAIL_FORMAT_REJECTED: Register payload with invalid email format is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'not-an-email',
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1c2. REGISTER_DTO_EMAIL_EXCEEDING_MAX_LENGTH_REJECTED: Register payload with email exceeding 254 characters is rejected by ValidationPipe with BadRequestException', async () => {
    const overlongEmail = `${'a'.repeat(245)}@example.com`;
    const payload = {
      email: overlongEmail,
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1c3. REGISTER_DTO_SHORT_PASSWORD_REJECTED: Register payload with password under 12 characters is rejected by ValidationPipe with BadRequestException', async () => {
    const shortPassword = 'short_pass1';
    expect(shortPassword.length).toBe(11);

    const payload = {
      email: 'customer@example.com',
      password: shortPassword,
      displayName: 'Nguyen Van A',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1c4. REGISTER_DTO_LONG_PASSWORD_REJECTED: Register payload with password exceeding 128 characters is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'a'.repeat(129),
      displayName: 'Nguyen Van A',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1c5. REGISTER_DTO_EMPTY_DISPLAY_NAME_REJECTED: Register payload with empty displayName is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      displayName: '',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1c6. REGISTER_DTO_LONG_DISPLAY_NAME_REJECTED: Register payload with displayName exceeding 100 characters is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      displayName: 'A'.repeat(101),
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1d1. REGISTER_DTO_EXTRA_ACTOR_FIELD_REJECTED: Register payload with unallowlisted actor field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
      actor: { id: 'admin_123', roles: ['ADMIN'] },
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1d2. REGISTER_DTO_EXTRA_ROLE_FIELD_REJECTED: Register payload with unallowlisted role field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
      role: 'ADMIN',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1d3. REGISTER_DTO_EXTRA_ID_FIELD_REJECTED: Register payload with unallowlisted id field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
      id: 'usr_spoofed_999',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1d4. REGISTER_DTO_EXTRA_INTERNAL_FIELD_REJECTED: Register payload with unallowlisted internal header/correlation field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
      'x-internal-gateway-auth': 'spoofed_sig',
      correlationId: 'spoofed_corr_id',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RegisterRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('1e. REGISTER_DTO_PASSWORD_WHITESPACE_PRESERVED: Register payload password with leading/trailing spaces is preserved without trimming or normalization', async () => {
    const rawPassword = '  correct horse battery staple  ';
    const payload = {
      email: 'customer@example.com',
      password: rawPassword,
      displayName: 'Nguyen Van A',
    };

    const result = (await validationPipe.transform(payload, {
      type: 'body',
      metatype: RegisterRequestDto,
    })) as RegisterRequestDto;

    expect(result.password).toBe(rawPassword);
  });

  // --- 2. LoginRequestDto ---

  it('2a. LOGIN_DTO_VALID_PAYLOAD_ACCEPTED: Valid OpenAPI login payload passes ValidationPipe transform', async () => {
    const validPayload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
    };

    const result = (await validationPipe.transform(validPayload, {
      type: 'body',
      metatype: LoginRequestDto,
    })) as LoginRequestDto;

    expect(result).toBeDefined();
    expect(result.email).toBe('customer@example.com');
    expect(result.password).toBe('correct horse battery staple');
  });

  it('2b1. LOGIN_DTO_MISSING_EMAIL_REJECTED: Login payload missing email is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      password: 'correct horse battery staple',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2b2. LOGIN_DTO_MISSING_PASSWORD_REJECTED: Login payload missing password is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2c1. LOGIN_DTO_INVALID_EMAIL_FORMAT_REJECTED: Login payload with invalid email format is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'not-an-email',
      password: 'correct horse battery staple',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2c2. LOGIN_DTO_EMAIL_EXCEEDING_MAX_LENGTH_REJECTED: Login payload with email exceeding 254 characters is rejected by ValidationPipe with BadRequestException', async () => {
    const overlongEmail = `${'a'.repeat(245)}@example.com`;
    const payload = {
      email: overlongEmail,
      password: 'correct horse battery staple',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2c3. LOGIN_DTO_EMPTY_PASSWORD_REJECTED: Login payload with empty password is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: '',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2c4. LOGIN_DTO_LONG_PASSWORD_REJECTED: Login payload with password exceeding 128 characters is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'a'.repeat(129),
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2d1. LOGIN_DTO_EXTRA_ACTOR_FIELD_REJECTED: Login payload with unallowlisted actor field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      actor: { id: 'admin_123', roles: ['ADMIN'] },
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2d2. LOGIN_DTO_EXTRA_ROLE_FIELD_REJECTED: Login payload with unallowlisted role field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      role: 'ADMIN',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2d3. LOGIN_DTO_EXTRA_ID_FIELD_REJECTED: Login payload with unallowlisted id field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      id: 'usr_spoofed_999',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2d4. LOGIN_DTO_EXTRA_INTERNAL_FIELD_REJECTED: Login payload with unallowlisted correlationId field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      email: 'customer@example.com',
      password: 'correct horse battery staple',
      correlationId: 'spoofed_corr_id',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('2e. LOGIN_DTO_PASSWORD_WHITESPACE_PRESERVED: Login payload password with leading/trailing spaces is preserved without trimming or normalization', async () => {
    const rawPassword = '  correct horse battery staple  ';
    const payload = {
      email: 'customer@example.com',
      password: rawPassword,
    };

    const result = (await validationPipe.transform(payload, {
      type: 'body',
      metatype: LoginRequestDto,
    })) as LoginRequestDto;

    expect(result.password).toBe(rawPassword);
  });

  // --- 3. RefreshRequestDto ---

  it('3a. REFRESH_DTO_VALID_PAYLOAD_ACCEPTED: Valid OpenAPI refresh payload passes ValidationPipe transform', async () => {
    const validPayload = {
      refreshToken: 'opaque-refresh-token-12345',
    };

    const result = (await validationPipe.transform(validPayload, {
      type: 'body',
      metatype: RefreshRequestDto,
    })) as RefreshRequestDto;

    expect(result).toBeDefined();
    expect(result.refreshToken).toBe('opaque-refresh-token-12345');
  });

  it('3b1. REFRESH_DTO_MISSING_TOKEN_FIELD_REJECTED: Refresh payload missing refreshToken field is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {};

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RefreshRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('3b2. REFRESH_DTO_EMPTY_TOKEN_REJECTED: Refresh payload with empty refreshToken is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      refreshToken: '',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RefreshRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('3c1. REFRESH_DTO_EXCEEDING_MAX_LENGTH_REJECTED: Refresh payload with refreshToken exceeding 2048 characters is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      refreshToken: 'a'.repeat(2049),
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RefreshRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('3d1. REFRESH_DTO_EXTRA_ACTOR_FIELD_REJECTED: Refresh payload with unallowlisted actor field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      refreshToken: 'opaque-refresh-token-12345',
      actor: { id: 'admin_123' },
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RefreshRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('3d2. REFRESH_DTO_EXTRA_ROLE_FIELD_REJECTED: Refresh payload with unallowlisted role field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      refreshToken: 'opaque-refresh-token-12345',
      role: 'ADMIN',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RefreshRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('3d3. REFRESH_DTO_EXTRA_ID_FIELD_REJECTED: Refresh payload with unallowlisted id field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      refreshToken: 'opaque-refresh-token-12345',
      id: 'usr_spoofed_999',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: RefreshRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // --- 4. LogoutRequestDto ---

  it('4a. LOGOUT_DTO_VALID_PAYLOAD_ACCEPTED: Valid OpenAPI logout payload passes ValidationPipe transform', async () => {
    const validPayload = {
      refreshToken: 'opaque-refresh-token-12345',
    };

    const result = (await validationPipe.transform(validPayload, {
      type: 'body',
      metatype: LogoutRequestDto,
    })) as LogoutRequestDto;

    expect(result).toBeDefined();
    expect(result.refreshToken).toBe('opaque-refresh-token-12345');
  });

  it('4b1. LOGOUT_DTO_MISSING_TOKEN_FIELD_REJECTED: Logout payload missing refreshToken field is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {};

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LogoutRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('4b2. LOGOUT_DTO_EMPTY_TOKEN_REJECTED: Logout payload with empty refreshToken is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      refreshToken: '',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LogoutRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('4c1. LOGOUT_DTO_EXCEEDING_MAX_LENGTH_REJECTED: Logout payload with refreshToken exceeding 2048 characters is rejected by ValidationPipe with BadRequestException', async () => {
    const payload = {
      refreshToken: 'a'.repeat(2049),
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LogoutRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('4d1. LOGOUT_DTO_EXTRA_ACTOR_FIELD_REJECTED: Logout payload with unallowlisted actor field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      refreshToken: 'opaque-refresh-token-12345',
      actor: { id: 'admin_123' },
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LogoutRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('4d2. LOGOUT_DTO_EXTRA_ROLE_FIELD_REJECTED: Logout payload with unallowlisted role field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      refreshToken: 'opaque-refresh-token-12345',
      role: 'ADMIN',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LogoutRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('4d3. LOGOUT_DTO_EXTRA_ID_FIELD_REJECTED: Logout payload with unallowlisted id field is rejected by ValidationPipe forbidNonWhitelisted with BadRequestException', async () => {
    const payload = {
      refreshToken: 'opaque-refresh-token-12345',
      id: 'usr_spoofed_999',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: LogoutRequestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('Gateway Public Auth Controller (E2E / Transport)', () => {
  let mockProxyUseCase: jest.Mocked<ProxyAuthUseCase>;
  let controller: AuthController;
  const validIdempotencyKey = 'reg_01K1FQ0A7CXJY4KBRRXQDPEQAC';

  beforeEach(() => {
    mockProxyUseCase = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    } as unknown as jest.Mocked<ProxyAuthUseCase>;

    controller = new AuthController(mockProxyUseCase);
  });

  function createMockRequest(requestId?: string): FastifyRequest & {
    requestId?: string;
  } {
    return {
      requestId: arguments.length > 0 ? requestId : 'req_ctrl_trusted_123',
      headers: {},
    } as unknown as FastifyRequest & { requestId?: string };
  }

  it('1a. REGISTER_ROUTE_DELEGATES_BODY_IDEMPOTENCY_KEY_AND_REQUEST_ID: register route delegates body, valid idempotency key (>=16 chars), and trusted requestId to use case', async () => {
    mockProxyUseCase.register.mockResolvedValueOnce({
      user: {
        id: 'usr_reg_001',
        email: 'reg@example.com',
        displayName: 'Reg User',
        roles: ['CUSTOMER'],
      },
      accessToken: 'access.jwt.token.reg',
      refreshToken: 'refresh.jwt.token.reg',
      expiresIn: 900,
    });

    const body: RegisterRequestDto = {
      email: 'reg@example.com',
      password: 'correct horse battery staple',
      displayName: 'Reg User',
    };
    const req = createMockRequest('req_reg_ctrl_999');

    await controller.register(body, validIdempotencyKey, req);

    expect(mockProxyUseCase.register).toHaveBeenCalledWith(
      {
        email: 'reg@example.com',
        password: 'correct horse battery staple',
        displayName: 'Reg User',
        idempotencyKey: validIdempotencyKey,
      },
      {
        requestId: 'req_reg_ctrl_999',
      },
    );
  });

  it('1b. REGISTER_ROUTE_RETURNS_201_WITH_D04_AUTH_SESSION_ALLOWLIST: register route maps result to exact D04 AuthSessionResponse allowlist including accessToken, refreshToken, and expiresIn', async () => {
    mockProxyUseCase.register.mockResolvedValueOnce({
      user: {
        id: 'usr_reg_001',
        email: 'reg@example.com',
        displayName: 'Reg User',
        roles: ['CUSTOMER'],
      },
      accessToken: 'access.jwt.token.reg',
      refreshToken: 'refresh.jwt.token.reg',
      expiresIn: 900,
    });

    const body: RegisterRequestDto = {
      email: 'reg@example.com',
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
    };
    const req = createMockRequest('req_reg_shape_123');

    const result = (await controller.register(body, validIdempotencyKey, req)) as Record<
      string,
      unknown
    >;

    expect(result).toEqual({
      accessToken: 'access.jwt.token.reg',
      refreshToken: 'refresh.jwt.token.reg',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 'usr_reg_001',
        email: 'reg@example.com',
        displayName: 'Reg User',
        roles: ['CUSTOMER'],
      },
    });
  });

  it('1c. REGISTER_ROUTE_MISSING_IDEMPOTENCY_KEY_REJECTED: register route rejects missing or empty Idempotency-Key header with BadRequestException', async () => {
    const body: RegisterRequestDto = {
      email: 'reg@example.com',
      password: 'correct horse battery staple',
      displayName: 'Reg User',
    };
    const req = createMockRequest('req_reg_no_idemp');

    await expect(controller.register(body, undefined as unknown as string, req)).rejects.toThrow(
      BadRequestException,
    );

    await expect(controller.register(body, '   ', req)).rejects.toThrow(BadRequestException);
  });

  it('1d. REGISTER_ROUTE_INVALID_IDEMPOTENCY_KEY_LENGTH_REJECTED: register route rejects Idempotency-Key under 16 characters with BadRequestException', async () => {
    const body: RegisterRequestDto = {
      email: 'reg@example.com',
      password: 'correct horse battery staple',
      displayName: 'Reg User',
    };
    const req = createMockRequest('req_reg_short_idemp');
    const shortKey = 'short_key_15cha';
    expect(shortKey.length).toBe(15);

    await expect(controller.register(body, shortKey, req)).rejects.toThrow(BadRequestException);
  });

  it('2a. LOGIN_ROUTE_DELEGATES_VALIDATED_BODY_AND_TRUSTED_REQUEST_ID: login route delegates body and trusted requestId to use case', async () => {
    mockProxyUseCase.login.mockResolvedValueOnce({
      user: {
        id: 'usr_login_002',
        email: 'login@example.com',
        displayName: 'Login User',
        roles: ['CUSTOMER'],
      },
      accessToken: 'access.jwt.token',
      refreshToken: 'refresh.raw.token',
      expiresIn: 900,
    });

    const body: LoginRequestDto = {
      email: 'login@example.com',
      password: 'correct horse battery staple',
    };
    const req = createMockRequest('req_login_ctrl_888');

    await controller.login(body, req);

    expect(mockProxyUseCase.login).toHaveBeenCalledWith(
      {
        email: 'login@example.com',
        password: 'correct horse battery staple',
      },
      {
        requestId: 'req_login_ctrl_888',
      },
    );
  });

  it('2b. LOGIN_ROUTE_RETURNS_200_WITH_D04_AUTH_SESSION_ALLOWLIST: login route maps result to exact D04 AuthSessionResponse allowlist with expiresIn from result', async () => {
    mockProxyUseCase.login.mockResolvedValueOnce({
      user: {
        id: 'usr_login_002',
        email: 'login@example.com',
        displayName: 'Login User',
        roles: ['CUSTOMER'],
      },
      accessToken: 'access.jwt.token',
      refreshToken: 'refresh.raw.token',
      expiresIn: 900,
    });

    const body: LoginRequestDto = {
      email: 'login@example.com',
      password: 'correct horse battery staple',
    };
    const req = createMockRequest('req_login_shape_123');

    const result = (await controller.login(body, req)) as Record<string, unknown>;

    expect(result).toEqual({
      accessToken: 'access.jwt.token',
      refreshToken: 'refresh.raw.token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 'usr_login_002',
        email: 'login@example.com',
        displayName: 'Login User',
        roles: ['CUSTOMER'],
      },
    });
  });

  it('3a. REFRESH_ROUTE_DELEGATES_VALIDATED_BODY_AND_TRUSTED_REQUEST_ID: refresh route delegates body and trusted requestId to use case', async () => {
    mockProxyUseCase.refresh.mockResolvedValueOnce({
      user: {
        id: 'usr_ref_003',
        email: 'refresh@example.com',
        displayName: 'Ref User',
        roles: ['CUSTOMER'],
      },
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token',
      expiresIn: 900,
    });

    const body: RefreshRequestDto = {
      refreshToken: 'opaque-refresh-token-123',
    };
    const req = createMockRequest('req_ref_ctrl_777');

    await controller.refresh(body, req);

    expect(mockProxyUseCase.refresh).toHaveBeenCalledWith(
      {
        refreshToken: 'opaque-refresh-token-123',
      },
      {
        requestId: 'req_ref_ctrl_777',
      },
    );
  });

  it('3b. REFRESH_ROUTE_RETURNS_200_WITH_D04_AUTH_SESSION_ALLOWLIST: refresh route maps result to exact D04 AuthSessionResponse allowlist with expiresIn from result', async () => {
    mockProxyUseCase.refresh.mockResolvedValueOnce({
      user: {
        id: 'usr_ref_003',
        email: 'refresh@example.com',
        displayName: 'Ref User',
        roles: ['CUSTOMER'],
      },
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token',
      expiresIn: 900,
    });

    const body: RefreshRequestDto = {
      refreshToken: 'opaque-refresh-token-123',
    };
    const req = createMockRequest('req_ref_shape_123');

    const result = (await controller.refresh(body, req)) as Record<string, unknown>;

    expect(result).toEqual({
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 'usr_ref_003',
        email: 'refresh@example.com',
        displayName: 'Ref User',
        roles: ['CUSTOMER'],
      },
    });
  });

  it('4a. LOGOUT_ROUTE_DELEGATES_VALIDATED_BODY_AND_TRUSTED_REQUEST_ID: logout route delegates body and trusted requestId to use case', async () => {
    mockProxyUseCase.logout.mockResolvedValueOnce();

    const body: LogoutRequestDto = {
      refreshToken: 'opaque-logout-token-456',
    };
    const req = createMockRequest('req_logout_ctrl_666');

    await controller.logout(body, req);

    expect(mockProxyUseCase.logout).toHaveBeenCalledWith(
      {
        refreshToken: 'opaque-logout-token-456',
      },
      {
        requestId: 'req_logout_ctrl_666',
      },
    );
  });

  it('4b. LOGOUT_ROUTE_RETURNS_VOID_NO_BODY: logout route resolves undefined (204 No Content with no body)', async () => {
    mockProxyUseCase.logout.mockResolvedValueOnce();

    const body: LogoutRequestDto = {
      refreshToken: 'opaque-logout-token-456',
    };
    const req = createMockRequest('req_logout_shape_123');

    const result = await controller.logout(body, req);

    expect(result).toBeUndefined();
  });

  it('5. CONTROLLERS_NEVER_ACCEPT_OR_RECONSTRUCT_ACTOR_OR_INTERNAL_CONTEXT_FROM_BODY: Unauthenticated endpoints do not forward actor context or internal fields', async () => {
    mockProxyUseCase.register.mockResolvedValueOnce({
      user: { id: 'usr_reg_001', email: 'reg@example.com', displayName: 'Reg User' },
      accessToken: 'access.jwt.token.reg',
      refreshToken: 'refresh.jwt.token.reg',
      expiresIn: 900,
    });

    const spoofedBody = {
      email: 'reg@example.com',
      password: 'correct horse battery staple',
      displayName: 'Nguyen Van A',
      actor: { id: 'admin', roles: ['ADMIN'] },
    } as unknown as RegisterRequestDto;

    const req = createMockRequest('req_spoof_ctrl_000');

    await controller.register(spoofedBody, validIdempotencyKey, req);

    const callArg = mockProxyUseCase.register.mock.calls[0]?.[0] as unknown as Record<
      string,
      unknown
    >;
    expect(callArg).not.toHaveProperty('actor');
  });

  it('6. CONSTRUCTOR_MISSING_USE_CASE_FAILS_CLOSED: AuthController fails explicitly when ProxyAuthUseCase dependency is missing', () => {
    expect(() => new AuthController(null as unknown as ProxyAuthUseCase)).toThrow(
      'Missing required AuthController dependencies',
    );
  });

  it('7. CONTROLLER_METHODS_DECLARE_EXACT_OPENAPI_HTTP_CODES: AuthController handlers declare @HttpCode metadata for 201, 200, 200, and 204', () => {
    const registerCode = Reflect.getMetadata('__httpCode__', AuthController.prototype.register);
    const loginCode = Reflect.getMetadata('__httpCode__', AuthController.prototype.login);
    const refreshCode = Reflect.getMetadata('__httpCode__', AuthController.prototype.refresh);
    const logoutCode = Reflect.getMetadata('__httpCode__', AuthController.prototype.logout);

    expect(registerCode).toBe(201);
    expect(loginCode).toBe(200);
    expect(refreshCode).toBe(200);
    expect(logoutCode).toBe(204);
  });

  it('8a1. REGISTER_ROUTE_MISSING_TRUSTED_REQUEST_ID_REJECTED: register route rejects missing trusted requestId with BadRequestException without invoking use case', async () => {
    const body: RegisterRequestDto = {
      email: 'reg@example.com',
      password: 'correct horse battery staple',
      displayName: 'Reg User',
    };
    const reqMissing = createMockRequest(undefined);

    await expect(controller.register(body, validIdempotencyKey, reqMissing)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockProxyUseCase.register).not.toHaveBeenCalled();
  });

  it('8a2. REGISTER_ROUTE_BLANK_TRUSTED_REQUEST_ID_REJECTED: register route rejects blank trusted requestId with BadRequestException without invoking use case', async () => {
    const body: RegisterRequestDto = {
      email: 'reg@example.com',
      password: 'correct horse battery staple',
      displayName: 'Reg User',
    };
    const reqBlank = createMockRequest('   ');

    await expect(controller.register(body, validIdempotencyKey, reqBlank)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockProxyUseCase.register).not.toHaveBeenCalled();
  });

  it('8b1. LOGIN_ROUTE_MISSING_TRUSTED_REQUEST_ID_REJECTED: login route rejects missing trusted requestId with BadRequestException without invoking use case', async () => {
    const body: LoginRequestDto = {
      email: 'login@example.com',
      password: 'correct horse battery staple',
    };
    const reqMissing = createMockRequest(undefined);

    await expect(controller.login(body, reqMissing)).rejects.toThrow(BadRequestException);

    expect(mockProxyUseCase.login).not.toHaveBeenCalled();
  });

  it('8b2. LOGIN_ROUTE_BLANK_TRUSTED_REQUEST_ID_REJECTED: login route rejects blank trusted requestId with BadRequestException without invoking use case', async () => {
    const body: LoginRequestDto = {
      email: 'login@example.com',
      password: 'correct horse battery staple',
    };
    const reqBlank = createMockRequest('   ');

    await expect(controller.login(body, reqBlank)).rejects.toThrow(BadRequestException);

    expect(mockProxyUseCase.login).not.toHaveBeenCalled();
  });

  it('8c1. REFRESH_ROUTE_MISSING_TRUSTED_REQUEST_ID_REJECTED: refresh route rejects missing trusted requestId with BadRequestException without invoking use case', async () => {
    const body: RefreshRequestDto = {
      refreshToken: 'opaque-refresh-token-123',
    };
    const reqMissing = createMockRequest(undefined);

    await expect(controller.refresh(body, reqMissing)).rejects.toThrow(BadRequestException);

    expect(mockProxyUseCase.refresh).not.toHaveBeenCalled();
  });

  it('8c2. REFRESH_ROUTE_BLANK_TRUSTED_REQUEST_ID_REJECTED: refresh route rejects blank trusted requestId with BadRequestException without invoking use case', async () => {
    const body: RefreshRequestDto = {
      refreshToken: 'opaque-refresh-token-123',
    };
    const reqBlank = createMockRequest('   ');

    await expect(controller.refresh(body, reqBlank)).rejects.toThrow(BadRequestException);

    expect(mockProxyUseCase.refresh).not.toHaveBeenCalled();
  });

  it('8d1. LOGOUT_ROUTE_MISSING_TRUSTED_REQUEST_ID_REJECTED: logout route rejects missing trusted requestId with BadRequestException without invoking use case', async () => {
    const body: LogoutRequestDto = {
      refreshToken: 'opaque-logout-token-456',
    };
    const reqMissing = createMockRequest(undefined);

    await expect(controller.logout(body, reqMissing)).rejects.toThrow(BadRequestException);

    expect(mockProxyUseCase.logout).not.toHaveBeenCalled();
  });

  it('8d2. LOGOUT_ROUTE_BLANK_TRUSTED_REQUEST_ID_REJECTED: logout route rejects blank trusted requestId with BadRequestException without invoking use case', async () => {
    const body: LogoutRequestDto = {
      refreshToken: 'opaque-logout-token-456',
    };
    const reqBlank = createMockRequest('   ');

    await expect(controller.logout(body, reqBlank)).rejects.toThrow(BadRequestException);

    expect(mockProxyUseCase.logout).not.toHaveBeenCalled();
  });
});

describe('Gateway Public Me Controller (E2E / Transport)', () => {
  let mockProxyUseCase: jest.Mocked<ProxyAuthUseCase>;
  let controller: MeController;

  beforeEach(() => {
    mockProxyUseCase = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    } as unknown as jest.Mocked<ProxyAuthUseCase>;

    controller = new MeController(mockProxyUseCase);
  });

  function createMockMeRequest(
    requestId?: string,
    actor?: { id: string; roles: string[] },
  ): FastifyRequest & {
    requestId?: string;
    actor?: { id: string; roles: string[] };
  } {
    return {
      requestId: arguments.length > 0 ? requestId : 'req_me_trusted_123',
      actor: arguments.length > 1 ? actor : { id: 'usr_me_123', roles: ['CUSTOMER'] },
      headers: {},
    } as unknown as FastifyRequest & {
      requestId?: string;
      actor?: { id: string; roles: string[] };
    };
  }

  it('1a. ME_ROUTE_DELEGATES_ACTOR_AND_TRUSTED_REQUEST_ID: getProfile delegates verified actor and trusted requestId to use case', async () => {
    mockProxyUseCase.getProfile.mockResolvedValueOnce({
      user: {
        id: 'usr_me_123',
        email: 'me@example.com',
        displayName: 'Me User',
        roles: ['CUSTOMER'],
      },
    });

    const req = createMockMeRequest('req_me_del_999', { id: 'usr_me_123', roles: ['CUSTOMER'] });

    await controller.getProfile(req);

    expect(mockProxyUseCase.getProfile).toHaveBeenCalledWith({
      requestId: 'req_me_del_999',
      actor: { id: 'usr_me_123', roles: ['CUSTOMER'] },
    });
  });

  it('1b. ME_ROUTE_RETURNS_200_WITH_USER_PROFILE_ALLOWLIST: getProfile maps result to exact D04 UserProfileResponse allowlist', async () => {
    mockProxyUseCase.getProfile.mockResolvedValueOnce({
      user: {
        id: 'usr_me_123',
        email: 'me@example.com',
        displayName: 'Me User',
        roles: ['CUSTOMER'],
      },
    });

    const req = createMockMeRequest('req_me_shape_123');

    const result = (await controller.getProfile(req)) as Record<string, unknown>;

    expect(result).toEqual({
      user: {
        id: 'usr_me_123',
        email: 'me@example.com',
        displayName: 'Me User',
        roles: ['CUSTOMER'],
      },
    });
  });

  it('1c1. ME_ROUTE_MISSING_TRUSTED_REQUEST_ID_REJECTED: getProfile rejects missing trusted requestId with BadRequestException without invoking use case', async () => {
    const reqMissing = createMockMeRequest(undefined);

    await expect(controller.getProfile(reqMissing)).rejects.toThrow(BadRequestException);

    expect(mockProxyUseCase.getProfile).not.toHaveBeenCalled();
  });

  it('1c2. ME_ROUTE_BLANK_TRUSTED_REQUEST_ID_REJECTED: getProfile rejects blank trusted requestId with BadRequestException without invoking use case', async () => {
    const reqBlank = createMockMeRequest('   ');

    await expect(controller.getProfile(reqBlank)).rejects.toThrow(BadRequestException);

    expect(mockProxyUseCase.getProfile).not.toHaveBeenCalled();
  });

  it('1d. ME_ROUTE_MISSING_VERIFIED_ACTOR_REJECTED: getProfile rejects missing or invalid actor in request context with UnauthorizedException without invoking use case', async () => {
    const reqNoActor = createMockMeRequest('req_me_no_actor', undefined);

    await expect(controller.getProfile(reqNoActor)).rejects.toThrow(UnauthorizedException);

    expect(mockProxyUseCase.getProfile).not.toHaveBeenCalled();
  });

  it('2. CONSTRUCTOR_MISSING_USE_CASE_FAILS_CLOSED: MeController fails explicitly when ProxyAuthUseCase dependency is missing', () => {
    expect(() => new MeController(null as unknown as ProxyAuthUseCase)).toThrow(
      'Missing required MeController dependencies',
    );
  });

  it('3. ME_ROUTE_HAS_ACCESS_TOKEN_GUARD_AND_200_HTTP_CODE: MeController handlers declare AccessTokenGuard and @HttpCode(200)', () => {
    const classGuards = Reflect.getMetadata('__guards__', MeController);
    const getProfileCode = Reflect.getMetadata('__httpCode__', MeController.prototype.getProfile);

    expect(classGuards).toContain(AccessTokenGuard);
    expect(getProfileCode).toBe(200);
  });

  it('4. ME_ROUTE_DECLARES_EXACT_D04_PATH: MeController declares GET /api/v1/me rather than nesting profile under /auth', () => {
    const controllerPath = Reflect.getMetadata('path', MeController);
    const methodPath = Reflect.getMetadata('path', MeController.prototype.getProfile);
    const requestMethod = Reflect.getMetadata('method', MeController.prototype.getProfile);

    expect(controllerPath).toBe('api/v1');
    expect(methodPath).toBe('me');
    expect(requestMethod).toBe(0);
  });
});
