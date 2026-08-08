/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { createHash, generateKeyPairSync } from 'node:crypto';
import {
  INTERNAL_AUTH_HEADER,
  CORRELATION_ID_HEADER,
  type TrustedRequestContext,
} from '@movie-ticket/auth-contract';
import { InternalAuthGuard } from '../../src/transport/http/internal-auth.guard';
import { InternalRequestVerifierAdapter } from '../../src/infrastructure/security/internal-request-verifier.adapter';
import { InternalNonceStorePort } from '../../src/infrastructure/database/internal-nonce-store.adapter';
import { InternalAuthController } from '../../src/transport/http/internal-auth.controller';
import { InternalProfileController } from '../../src/transport/http/internal-profile.controller';
import { RegisterUseCase } from '../../src/application/register.use-case';
import { LoginUseCase } from '../../src/application/login.use-case';
import { RefreshUseCase } from '../../src/application/refresh.use-case';
import { LogoutUseCase } from '../../src/application/logout.use-case';
import { GetProfileUseCase } from '../../src/application/get-profile.use-case';
import { IdentityModule } from '../../src/bootstrap/identity.module';
import { DataSource } from 'typeorm';
import { AuthPersistenceAdapter } from '../../src/infrastructure/database/auth-persistence.adapter';
import { InternalNonceStoreAdapter } from '../../src/infrastructure/database/internal-nonce-store.adapter';
import { createIdentityDataSource } from '../../src/infrastructure/database/typeorm.config';

let sentinelCalled = false;

interface AuthorizedFastifyRequest extends FastifyRequest {
  internalContext?: TrustedRequestContext;
}

const mockVerifier: jest.Mocked<Pick<InternalRequestVerifierAdapter, 'verify'>> = {
  verify: jest.fn(),
};

const mockNonceStore: jest.Mocked<Pick<InternalNonceStorePort, 'claim'>> = {
  claim: jest.fn(),
};

const mockRegisterUseCase = {
  execute: jest.fn(),
};

const mockLoginUseCase = {
  execute: jest.fn(),
};

const mockRefreshUseCase = {
  execute: jest.fn(),
};

const mockLogoutUseCase = {
  execute: jest.fn(),
};

const mockGetProfileUseCase = {
  execute: jest.fn(),
};

@Controller('internal')
class SentinelController {
  @Get('test')
  @UseGuards(InternalAuthGuard)
  testEndpoint(@Req() req: AuthorizedFastifyRequest): {
    success: boolean;
    trustedContext: TrustedRequestContext | undefined;
  } {
    sentinelCalled = true;
    return { success: true, trustedContext: req.internalContext };
  }

  @Post('test-body')
  @HttpCode(200)
  @UseGuards(InternalAuthGuard)
  testBodyEndpoint(@Req() req: AuthorizedFastifyRequest): {
    success: boolean;
    trustedContext: TrustedRequestContext | undefined;
  } {
    sentinelCalled = true;
    return { success: true, trustedContext: req.internalContext };
  }
}

@Module({
  controllers: [SentinelController, InternalAuthController, InternalProfileController],
  providers: [
    InternalAuthGuard,
    {
      provide: InternalRequestVerifierAdapter,
      useValue: mockVerifier,
    },
    {
      provide: 'InternalNonceStorePort',
      useValue: mockNonceStore,
    },
    {
      provide: RegisterUseCase,
      useValue: mockRegisterUseCase,
    },
    {
      provide: LoginUseCase,
      useValue: mockLoginUseCase,
    },
    {
      provide: RefreshUseCase,
      useValue: mockRefreshUseCase,
    },
    {
      provide: LogoutUseCase,
      useValue: mockLogoutUseCase,
    },
    {
      provide: GetProfileUseCase,
      useValue: mockGetProfileUseCase,
    },
  ],
})
class TestModule {}

describe('InternalAuthGuard Transport Seam (E2E / Transport)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    const adapter = new FastifyAdapter();
    adapter.getInstance().addHook('preParsing', (request, _reply, payload, done) => {
      const chunks: Buffer[] = [];
      payload.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      payload.on('end', () => {
        (request as unknown as Record<string, unknown>).rawBody = Buffer.concat(chunks);
      });
      done(null, payload);
    });

    app = moduleFixture.createNestApplication<NestFastifyApplication>(adapter);
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    sentinelCalled = false;
    jest.clearAllMocks();
  });

  it('1. MISSING_INTERNAL_AUTH_IS_REJECTED_BEFORE_USE_CASE: Request missing x-internal-gateway-auth header is rejected before use case invocation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/internal/test',
      headers: {
        [CORRELATION_ID_HEADER]: 'test-req-id',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(sentinelCalled).toBe(false);
    expect(mockVerifier.verify).not.toHaveBeenCalled();
    expect(mockNonceStore.claim).not.toHaveBeenCalled();
  });

  it('2. TAMPERED_OR_STALE_INTERNAL_AUTH_IS_REJECTED_BEFORE_USE_CASE: Request with tampered signature or stale timestamp is rejected before use case invocation', async () => {
    mockVerifier.verify.mockRejectedValue(new Error('Invalid internal request signature'));

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=00000000-0000-4000-a000-000000000001;sig=tampered_signature';
    const response = await app.inject({
      method: 'GET',
      url: '/internal/test',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(sentinelCalled).toBe(false);
    expect(mockVerifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        authHeader,
      }),
    );
    expect(mockNonceStore.claim).not.toHaveBeenCalled();
  });

  it('3. REPLAYED_NONCE_IS_REJECTED_BEFORE_USE_CASE: Request with previously claimed nonce is rejected before use case invocation', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(false); // means already claimed, so rejected

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=replayed-nonce-12345;sig=valid_signature';
    const response = await app.inject({
      method: 'GET',
      url: '/internal/test',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(sentinelCalled).toBe(false);
    expect(mockVerifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        authHeader,
      }),
    );
    expect(mockNonceStore.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 'replayed-nonce-12345',
        issuedAtInSeconds: 1700000000,
      }),
    );

    const verifierCallOrder = mockVerifier.verify.mock.invocationCallOrder[0];
    const claimCallOrder = mockNonceStore.claim.mock.invocationCallOrder[0];
    expect(verifierCallOrder).toBeDefined();
    expect(claimCallOrder).toBeDefined();
    if (typeof verifierCallOrder === 'number' && typeof claimCallOrder === 'number') {
      expect(verifierCallOrder).toBeLessThan(claimCallOrder);
    }
  });

  it('4. VERIFIED_AND_CLAIMED_REQUEST_CREATES_MINIMAL_TRUSTED_CONTEXT: Verified request with unused nonce passes guard and creates minimal trusted context', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true); // means successfully claimed

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=valid-nonce-67890;sig=valid_signature';
    const response = await app.inject({
      method: 'GET',
      url: '/internal/test',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(sentinelCalled).toBe(true);
    expect(response.json()).toEqual({
      success: true,
      trustedContext: validContext,
    });
    expect(mockVerifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        authHeader,
      }),
    );
    expect(mockNonceStore.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 'valid-nonce-67890',
        issuedAtInSeconds: 1700000000,
      }),
    );

    const verifierCallOrder = mockVerifier.verify.mock.invocationCallOrder[0];
    const claimCallOrder = mockNonceStore.claim.mock.invocationCallOrder[0];
    expect(verifierCallOrder).toBeDefined();
    expect(claimCallOrder).toBeDefined();
    if (typeof verifierCallOrder === 'number' && typeof claimCallOrder === 'number') {
      expect(verifierCallOrder).toBeLessThan(claimCallOrder);
    }
  });

  it('5. POST_REQUEST_WITH_NON_EMPTY_BODY_BINDS_RAW_BODY_SHA256: Computes exact raw body SHA256 and binds to verifier input', async () => {
    const bodyStr = JSON.stringify({ movie: 'Inception', tickets: 2 });
    const expectedSha256 = createHash('sha256').update(bodyStr).digest('hex');

    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=post-body-nonce-111;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/test-body',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(200);
    expect(sentinelCalled).toBe(true);
    expect(response.json()).toEqual({
      success: true,
      trustedContext: validContext,
    });
    expect(mockVerifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        requestInput: expect.objectContaining({
          method: 'POST',
          path: '/internal/test-body',
          bodySha256: expectedSha256,
        }),
      }),
    );
  });

  it('6. SIGNED_ACTOR_CONTEXT_IS_PASSED_TO_VERIFIER_AND_RETURNED: Extracts Gateway canonical actor headers (X-User-Id, X-User-Roles) and passes to verifier input', async () => {
    const actorContext = {
      id: 'usr_gateway_customer',
      roles: ['CUSTOMER'],
    };
    const validContext: TrustedRequestContext = {
      actor: actorContext,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=signed-actor-nonce-222;sig=valid_signature';
    const response = await app.inject({
      method: 'GET',
      url: '/internal/test',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'x-user-id': 'usr_gateway_customer',
        'x-user-roles': 'CUSTOMER',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(sentinelCalled).toBe(true);
    expect(mockVerifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        requestInput: expect.objectContaining({
          actor: actorContext,
        }),
      }),
    );
    expect(response.json()).toEqual({
      success: true,
      trustedContext: validContext,
    });
  });

  it('7. TAMPERED_BODY_OR_ACTOR_IS_REJECTED_BEFORE_HANDLER: Rejects request when verifier fails body/actor validation', async () => {
    mockVerifier.verify.mockRejectedValue(new Error('Invalid internal request signature'));

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=tampered-body-nonce-333;sig=tampered_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/test-body',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ tampered: true }),
    });

    expect(response.statusCode).toBe(401);
    expect(sentinelCalled).toBe(false);
    expect(mockNonceStore.claim).not.toHaveBeenCalled();
  });

  it('8. MISSING_CORRELATION_ID_HEADER_FAILS_CLOSED_BEFORE_HANDLER: Request missing X-Correlation-Id is rejected with 401 before use case or verifier', async () => {
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=missing-corr-nonce-444;sig=valid_signature';
    const response = await app.inject({
      method: 'GET',
      url: '/internal/test',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(sentinelCalled).toBe(false);
    expect(mockVerifier.verify).not.toHaveBeenCalled();
    expect(mockNonceStore.claim).not.toHaveBeenCalled();
  });

  it('9. UNAPPROVED_ACTOR_ALIAS_HEADERS_ARE_IGNORED: Unapproved alias headers like x-internal-actor-id are ignored and passed as null actor', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=alias-actor-nonce-555;sig=valid_signature';
    const response = await app.inject({
      method: 'GET',
      url: '/internal/test',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'x-internal-actor-id': 'spoofed_usr_id',
        'x-actor-roles': 'ADMIN',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(sentinelCalled).toBe(true);
    expect(mockVerifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        requestInput: expect.objectContaining({
          actor: null,
        }),
      }),
    );
  });

  it('10. INTERNAL_REGISTER_ROUTE_IS_GUARDED_BY_INTERNAL_AUTH_GUARD: Request to /internal/auth/register missing auth headers is rejected before controller or use case', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/register',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      }),
    });

    expect(response.statusCode).toBe(401);
    expect(mockVerifier.verify).not.toHaveBeenCalled();
    expect(mockRegisterUseCase.execute).not.toHaveBeenCalled();
  });

  it('11. INTERNAL_REGISTER_MISSING_IDEMPOTENCY_KEY_REJECTED_WITH_400: Request to /internal/auth/register with valid internal auth but missing idempotency-key header is rejected with 400 Bad Request before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=reg-no-idemp-nonce-666;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/register',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockRegisterUseCase.execute).not.toHaveBeenCalled();
  });

  it('12. INTERNAL_REGISTER_INVALID_INPUT_DTO_REJECTED_WITH_400: Invalid email or short password is rejected by ValidationPipe with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      email: 'invalid-email-address',
      password: 'short',
      displayName: 'Test User',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=reg-invalid-dto-nonce-777;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/register',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'idempotency-key': 'idemp-key-12345',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockRegisterUseCase.execute).not.toHaveBeenCalled();
  });

  it('13. INTERNAL_REGISTER_MASS_ASSIGNMENT_EXTRA_FIELDS_REJECTED_WITH_400: Unallowlisted extra fields (e.g. role) are rejected by ValidationPipe forbidNonWhitelisted with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      role: 'ADMIN',
      isAdmin: true,
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=reg-mass-assign-nonce-888;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/register',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'idempotency-key': 'idemp-key-12345',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockRegisterUseCase.execute).not.toHaveBeenCalled();
  });

  it('14. INTERNAL_REGISTER_VALID_REQUEST_EXECUTES_USE_CASE_AND_RETURNS_ALLOWLISTED_RESPONSE: Valid guarded registration request invokes RegisterUseCase and returns 201 with allowlisted response', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);
    mockRegisterUseCase.execute.mockResolvedValue({
      user: {
        id: 'usr_customer_123',
        email: 'test@example.com',
        displayName: 'Test User',
      },
    });

    const bodyStr = JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=reg-valid-red-nonce-999;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/register',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'idempotency-key': 'idemp-key-12345',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(201);
    expect(mockRegisterUseCase.execute).toHaveBeenCalledWith(
      {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        idempotencyKey: 'idemp-key-12345',
      },
      validContext,
    );
    expect(response.json()).toEqual({
      user: {
        id: 'usr_customer_123',
        email: 'test@example.com',
        displayName: 'Test User',
      },
    });
  });

  it('15. INTERNAL_LOGIN_ROUTE_IS_GUARDED_BY_INTERNAL_AUTH_GUARD: Request to /internal/auth/login missing auth headers is rejected before controller or use case', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/login',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        email: 'user@example.com',
        password: 'Password123!',
      }),
    });

    expect(response.statusCode).toBe(401);
    expect(mockVerifier.verify).not.toHaveBeenCalled();
    expect(mockLoginUseCase.execute).not.toHaveBeenCalled();
  });

  it('16. INTERNAL_LOGIN_INVALID_INPUT_DTO_REJECTED_WITH_400: Invalid email or empty password is rejected by ValidationPipe with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      email: 'not-an-email',
      password: '',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=login-invalid-dto-nonce-101;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/login',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockLoginUseCase.execute).not.toHaveBeenCalled();
  });

  it('17. INTERNAL_LOGIN_MASS_ASSIGNMENT_EXTRA_FIELDS_REJECTED_WITH_400: Unallowlisted extra fields (e.g. role) are rejected by ValidationPipe forbidNonWhitelisted with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      email: 'user@example.com',
      password: 'Password123!',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=login-mass-assign-nonce-102;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/login',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockLoginUseCase.execute).not.toHaveBeenCalled();
  });

  it('18. INTERNAL_LOGIN_VALID_REQUEST_EXECUTES_USE_CASE_AND_RETURNS_ALLOWLISTED_RESPONSE: Valid guarded login request invokes LoginUseCase and returns 200 with allowlisted response', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);
    mockLoginUseCase.execute.mockResolvedValue({
      accessToken: 'signed_jwt_access_token',
      refreshToken: 'opaque_refresh_token_xyz',
      user: {
        id: 'usr_customer_123',
        email: 'user@example.com',
        displayName: 'John Doe',
        roles: ['CUSTOMER'],
      },
    });

    const bodyStr = JSON.stringify({
      email: 'user@example.com',
      password: 'Password123!',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=login-valid-red-nonce-103;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/login',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(200);
    expect(mockLoginUseCase.execute).toHaveBeenCalledWith(
      {
        email: 'user@example.com',
        password: 'Password123!',
      },
      validContext,
    );
    expect(response.json()).toEqual({
      accessToken: 'signed_jwt_access_token',
      refreshToken: 'opaque_refresh_token_xyz',
      user: {
        id: 'usr_customer_123',
        email: 'user@example.com',
        displayName: 'John Doe',
      },
    });
  });

  it('19. INTERNAL_REFRESH_ROUTE_IS_GUARDED_BY_INTERNAL_AUTH_GUARD: Request to /internal/auth/refresh missing auth headers is rejected before controller or use case', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/refresh',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        refreshToken: 'valid_opaque_refresh_token_001',
      }),
    });

    expect(response.statusCode).toBe(401);
    expect(mockVerifier.verify).not.toHaveBeenCalled();
    expect(mockRefreshUseCase.execute).not.toHaveBeenCalled();
  });

  it('20. INTERNAL_REFRESH_EMPTY_TOKEN_REJECTED_WITH_400: Empty refresh token is rejected by ValidationPipe with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      refreshToken: '',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=refresh-empty-token-nonce-201;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/refresh',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockRefreshUseCase.execute).not.toHaveBeenCalled();
  });

  it('21. INTERNAL_REFRESH_EXCEEDING_MAX_LENGTH_REJECTED_WITH_400: Refresh token exceeding 2048 characters is rejected by ValidationPipe with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      refreshToken: 'x'.repeat(2049),
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=refresh-too-long-nonce-202;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/refresh',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockRefreshUseCase.execute).not.toHaveBeenCalled();
  });

  it('22. INTERNAL_REFRESH_MASS_ASSIGNMENT_EXTRA_FIELDS_REJECTED_WITH_400: Unallowlisted extra fields (e.g. role) are rejected by ValidationPipe forbidNonWhitelisted with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      refreshToken: 'valid_opaque_refresh_token_001',
      role: 'ADMIN',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=refresh-mass-assign-nonce-203;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/refresh',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockRefreshUseCase.execute).not.toHaveBeenCalled();
  });

  it('23. INTERNAL_REFRESH_VALID_REQUEST_EXECUTES_USE_CASE_AND_RETURNS_ALLOWLISTED_RESPONSE: Valid guarded refresh request invokes RefreshUseCase and returns 200 with allowlisted response', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);
    mockRefreshUseCase.execute.mockResolvedValue({
      accessToken: 'signed_new_access_token',
      refreshToken: 'opaque_new_refresh_token_002',
      user: {
        id: '11111111-1111-4111-a111-111111111111',
        email: 'user@example.com',
        displayName: 'Customer User',
        roles: ['CUSTOMER'],
      },
    });

    const bodyStr = JSON.stringify({
      refreshToken: 'valid_opaque_refresh_token_001',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=refresh-valid-red-nonce-204;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/refresh',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(200);
    expect(mockRefreshUseCase.execute).toHaveBeenCalledWith(
      {
        refreshToken: 'valid_opaque_refresh_token_001',
      },
      validContext,
    );
    expect(response.json()).toEqual({
      accessToken: 'signed_new_access_token',
      refreshToken: 'opaque_new_refresh_token_002',
      user: {
        id: '11111111-1111-4111-a111-111111111111',
        email: 'user@example.com',
        displayName: 'Customer User',
      },
    });
  });

  it('24. INTERNAL_LOGOUT_ROUTE_IS_GUARDED_BY_INTERNAL_AUTH_GUARD: Request to /internal/auth/logout missing auth headers is rejected before controller or use case', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/logout',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        refreshToken: 'opaque_logout_token_001',
      }),
    });

    expect(response.statusCode).toBe(401);
    expect(mockVerifier.verify).not.toHaveBeenCalled();
    expect(mockLogoutUseCase.execute).not.toHaveBeenCalled();
  });

  it('25. INTERNAL_LOGOUT_EMPTY_TOKEN_REJECTED_WITH_400: Empty refresh token is rejected by ValidationPipe with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      refreshToken: '',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=logout-empty-token-nonce-301;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/logout',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockLogoutUseCase.execute).not.toHaveBeenCalled();
  });

  it('26. INTERNAL_LOGOUT_EXCEEDING_MAX_LENGTH_REJECTED_WITH_400: Refresh token exceeding 2048 characters is rejected by ValidationPipe with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      refreshToken: 'x'.repeat(2049),
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=logout-too-long-nonce-302;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/logout',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockLogoutUseCase.execute).not.toHaveBeenCalled();
  });

  it('27. INTERNAL_LOGOUT_MASS_ASSIGNMENT_EXTRA_FIELDS_REJECTED_WITH_400: Unallowlisted extra fields (e.g. role) are rejected by ValidationPipe forbidNonWhitelisted with 400 before use case', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const bodyStr = JSON.stringify({
      refreshToken: 'opaque_logout_token_001',
      role: 'ADMIN',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=logout-mass-assign-nonce-303;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/logout',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(400);
    expect(mockLogoutUseCase.execute).not.toHaveBeenCalled();
  });

  it('28. INTERNAL_LOGOUT_VALID_REQUEST_EXECUTES_USE_CASE_AND_RETURNS_204_NO_CONTENT: Valid guarded logout request invokes LogoutUseCase and returns 204 No Content', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);
    mockLogoutUseCase.execute.mockResolvedValue(undefined);

    const bodyStr = JSON.stringify({
      refreshToken: 'opaque_logout_token_001',
    });
    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=logout-valid-red-nonce-304;sig=valid_signature';
    const response = await app.inject({
      method: 'POST',
      url: '/internal/auth/logout',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'content-type': 'application/json',
      },
      payload: bodyStr,
    });

    expect(response.statusCode).toBe(204);
    expect(mockLogoutUseCase.execute).toHaveBeenCalledWith(
      {
        refreshToken: 'opaque_logout_token_001',
      },
      validContext,
    );
    expect(response.body).toBe('');
  });

  it('29. INTERNAL_PROFILE_ROUTE_IS_GUARDED_BY_INTERNAL_AUTH_GUARD: Request to /internal/auth/me missing auth headers is rejected before controller or use case', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/internal/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(mockVerifier.verify).not.toHaveBeenCalled();
    expect(mockGetProfileUseCase.execute).not.toHaveBeenCalled();
  });

  it('30. INTERNAL_PROFILE_MISSING_ACTOR_CONTEXT_REJECTED_WITH_401: Request to /internal/auth/me with valid internal auth but no actor headers is rejected with 401 Unauthorized before GetProfileUseCase', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=profile-no-actor-nonce-401;sig=valid_signature';
    const response = await app.inject({
      method: 'GET',
      url: '/internal/auth/me',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(mockGetProfileUseCase.execute).not.toHaveBeenCalled();
  });

  it('31. INTERNAL_PROFILE_IGNORES_SPOOFED_QUERY_OR_ALIAS_ACTOR_PARAM: Spoofed actor ID in query params is ignored; request without canonical actor headers is rejected before GetProfileUseCase', async () => {
    const validContext: TrustedRequestContext = {
      actor: null,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=profile-spoofed-nonce-402;sig=valid_signature';
    const response = await app.inject({
      method: 'GET',
      url: '/internal/auth/me?actorId=spoofed_actor_123',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'x-internal-actor-id': 'spoofed_actor_456',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(mockGetProfileUseCase.execute).not.toHaveBeenCalled();
  });

  it('32. INTERNAL_PROFILE_VALID_ACTOR_EXECUTES_USE_CASE_AND_RETURNS_ALLOWLISTED_RESPONSE: Valid guarded profile request with verified actor invokes GetProfileUseCase and returns 200 with allowlisted response', async () => {
    const actorContext = {
      id: 'usr_gateway_customer',
      roles: ['CUSTOMER'],
    };
    const validContext: TrustedRequestContext = {
      actor: actorContext,
      requestId: 'test-req-id',
      correlationId: 'test-req-id',
      issuedAt: 1700000000,
    };
    mockVerifier.verify.mockResolvedValue(validContext);
    mockNonceStore.claim.mockResolvedValue(true);
    mockGetProfileUseCase.execute.mockResolvedValue({
      id: 'usr_gateway_customer',
      email: 'customer@example.com',
      displayName: 'Gateway Customer',
      roles: ['CUSTOMER'],
    });

    const authHeader =
      'v=1;kid=gateway-key-1;iat=1700000000;nonce=profile-valid-red-nonce-403;sig=valid_signature';
    const response = await app.inject({
      method: 'GET',
      url: '/internal/auth/me',
      headers: {
        [INTERNAL_AUTH_HEADER]: authHeader,
        [CORRELATION_ID_HEADER]: 'test-req-id',
        'x-user-id': 'usr_gateway_customer',
        'x-user-roles': 'CUSTOMER',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetProfileUseCase.execute).toHaveBeenCalledWith('usr_gateway_customer');
    expect(response.json()).toEqual({
      user: {
        id: 'usr_gateway_customer',
        email: 'customer@example.com',
        displayName: 'Gateway Customer',
      },
    });
  });
});

describe('IdentityModule Production Composition (E2E / Bootstrap)', () => {
  let prodApp: NestFastifyApplication;
  let prodModuleRef: TestingModule;

  beforeAll(async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    process.env.GATEWAY_INTERNAL_SIGNING_SECRET =
      process.env.GATEWAY_INTERNAL_SIGNING_SECRET || 'test-signing-secret-32-chars-long!';
    process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || privateKey;
    process.env.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || publicKey;
    process.env.JWT_KEY_ID = process.env.JWT_KEY_ID || 'v1';
    process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'https://identity.movie-ticket.local';
    process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'https://api.movie-ticket.local';
    process.env.JWT_ACCESS_TOKEN_TTL_SECONDS = process.env.JWT_ACCESS_TOKEN_TTL_SECONDS || '3600';
    process.env.IDEMPOTENCY_ENCRYPTION_KEY =
      process.env.IDEMPOTENCY_ENCRYPTION_KEY ||
      '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
    process.env.FINGERPRINT_HMAC_SECRET =
      process.env.FINGERPRINT_HMAC_SECRET ||
      'ffaaddeec cbbbbaa99887766554433221100ffaaddeec cbbbbaa99887766554433'.replace(/\s/g, '');
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/movie_ticket_test';

    prodModuleRef = await Test.createTestingModule({
      imports: [IdentityModule],
    }).compile();

    const adapter = new FastifyAdapter();
    prodApp = prodModuleRef.createNestApplication<NestFastifyApplication>(adapter);
    prodApp.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await prodApp.init();
    await prodApp.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (prodApp) {
      await prodApp.close();
    }
  });

  it('33. PRODUCTION_MODULE_EXPOSES_INTERNAL_AUTH_ROUTES: Real IdentityModule exposes internal auth endpoints guarded by InternalAuthGuard rather than returning 404', async () => {
    const authRoutes: Array<{ method: 'POST'; url: string }> = [
      { method: 'POST', url: '/internal/auth/register' },
      { method: 'POST', url: '/internal/auth/login' },
      { method: 'POST', url: '/internal/auth/refresh' },
      { method: 'POST', url: '/internal/auth/logout' },
    ];

    for (const route of authRoutes) {
      const response = await prodApp.inject({
        method: route.method,
        url: route.url,
      });

      // Guarded production routes must reject unauthenticated requests with 401 Unauthorized, not 404 Not Found
      expect(response.statusCode).toBe(401);
    }
  });

  it('34. PRODUCTION_MODULE_EXPOSES_INTERNAL_PROFILE_ROUTE: Real IdentityModule exposes internal profile endpoint guarded by InternalAuthGuard rather than returning 404', async () => {
    const response = await prodApp.inject({
      method: 'GET',
      url: '/internal/auth/me',
    });

    // Guarded profile route must reject unauthenticated requests with 401 Unauthorized, not 404 Not Found
    expect(response.statusCode).toBe(401);
  });

  it('35. GUARD_AND_NONCE_STORE_ARE_PRODUCTION_PROVIDERS: Real IdentityModule registers InternalAuthGuard, InternalRequestVerifierAdapter, and InternalNonceStorePort as concrete production providers', () => {
    expect(() => {
      prodModuleRef.get(InternalAuthGuard, { strict: false });
    }).not.toThrow();
    const guard = prodModuleRef.get(InternalAuthGuard, { strict: false });
    expect(guard).toBeInstanceOf(InternalAuthGuard);

    expect(() => {
      prodModuleRef.get(InternalRequestVerifierAdapter, { strict: false });
    }).not.toThrow();
    const verifier = prodModuleRef.get(InternalRequestVerifierAdapter, { strict: false });
    expect(verifier).toBeInstanceOf(InternalRequestVerifierAdapter);

    expect(() => {
      prodModuleRef.get('InternalNonceStorePort', { strict: false });
    }).not.toThrow();
    const nonceStore = prodModuleRef.get('InternalNonceStorePort', { strict: false });
    expect(nonceStore).toBeDefined();
    expect(nonceStore).not.toBeNull();
  });

  it('36. AUTH_USE_CASES_HAVE_CONCRETE_PORT_WIRING: Real IdentityModule registers all 5 auth use cases wired to concrete adapters without test doubles', () => {
    const useCases = [
      RegisterUseCase,
      LoginUseCase,
      RefreshUseCase,
      LogoutUseCase,
      GetProfileUseCase,
    ];

    for (const useCaseCls of useCases) {
      expect(() => {
        prodModuleRef.get(useCaseCls, { strict: false });
      }).not.toThrow();
      const instance = prodModuleRef.get(useCaseCls, { strict: false });
      expect(instance).toBeInstanceOf(useCaseCls);
    }
  });

  it('37. TEST_ONLY_DOUBLES_ARE_NOT_PRODUCTION_PROVIDERS: Real IdentityModule providers do not resolve to test mocks or mock function doubles', () => {
    expect(() => {
      prodModuleRef.get(InternalRequestVerifierAdapter, { strict: false });
    }).not.toThrow();
    const verifier = prodModuleRef.get(InternalRequestVerifierAdapter, { strict: false });
    expect(verifier).not.toBe(mockVerifier);

    expect(() => {
      prodModuleRef.get('InternalNonceStorePort', { strict: false });
    }).not.toThrow();
    const nonceStore = prodModuleRef.get('InternalNonceStorePort', { strict: false });
    expect(nonceStore).not.toBe(mockNonceStore);
  });

  it('38. MISSING_PRODUCTION_CONFIGURATION_FAILS_EXPLICITLY: Real IdentityModule fails initialization explicitly when required production signing secret is missing', async () => {
    const originalSecret = process.env.GATEWAY_INTERNAL_SIGNING_SECRET;
    delete process.env.GATEWAY_INTERNAL_SIGNING_SECRET;

    try {
      await expect(async () => {
        const unconfiguredModule = await Test.createTestingModule({
          imports: [IdentityModule],
        }).compile();
        const unconfiguredApp = unconfiguredModule.createNestApplication<NestFastifyApplication>(
          new FastifyAdapter(),
        );
        await unconfiguredApp.init();
        await unconfiguredApp.close();
      }).rejects.toThrow();
    } finally {
      if (originalSecret !== undefined) {
        process.env.GATEWAY_INTERNAL_SIGNING_SECRET = originalSecret;
      }
    }
  });

  it('39. MISSING_DATABASE_URL_FAILS_EXPLICITLY: Real IdentityModule fails initialization explicitly when required DATABASE_URL is missing', async () => {
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
      await expect(async () => {
        const unconfiguredModule = await Test.createTestingModule({
          imports: [IdentityModule],
        }).compile();
        const unconfiguredApp = unconfiguredModule.createNestApplication<NestFastifyApplication>(
          new FastifyAdapter(),
        );
        await unconfiguredApp.init();
        await unconfiguredApp.close();
      }).rejects.toThrow();
    } finally {
      if (originalUrl !== undefined) {
        process.env.DATABASE_URL = originalUrl;
      }
    }
  });

  it('40. DATASOURCE_PROVIDER_IS_REQUIRED_NOT_OPTIONAL: Real IdentityModule registers DataSource as a required non-optional provider', () => {
    expect(() => {
      prodModuleRef.get(DataSource, { strict: false });
    }).not.toThrow();
    const dataSource = prodModuleRef.get(DataSource, { strict: false });
    expect(dataSource).toBeDefined();
    expect(dataSource).toBeInstanceOf(DataSource);
  });

  it('41. PERSISTENCE_AND_NONCE_STORE_SHARE_SAME_DATASOURCE: AuthPersistenceAdapter and InternalNonceStoreAdapter resolve from the exact same production DataSource instance', () => {
    const dataSource = prodModuleRef.get(DataSource, { strict: false });
    expect(dataSource).toBeDefined();

    const persistenceAdapter = prodModuleRef.get(AuthPersistenceAdapter, { strict: false });
    const nonceStoreAdapter = prodModuleRef.get<InternalNonceStoreAdapter>(
      'InternalNonceStorePort',
      {
        strict: false,
      },
    );

    expect((persistenceAdapter as unknown as { dataSource: DataSource }).dataSource).toBe(
      dataSource,
    );
    expect((nonceStoreAdapter as unknown as { dataSource: DataSource }).dataSource).toBe(
      dataSource,
    );
  });

  it('42. TYPEORM_CONFIG_ENFORCES_SYNCHRONIZE_FALSE: TypeORM configuration enforces synchronize false for production database safety', () => {
    const dataSource = createIdentityDataSource('postgres://user:pass@localhost:5432/test_db');
    expect(dataSource.options.synchronize).toBe(false);
  });
});
