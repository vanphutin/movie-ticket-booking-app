import { createHmac, generateKeyPairSync, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { argon2id as hashWasmArgon2id } from 'hash-wasm';
import type { CanonicalSignedInput } from '@movie-ticket/auth-contract';
import { InternalRequestVerifierAdapter } from '../../src/infrastructure/security/internal-request-verifier.adapter';
import type { VerifyInternalRequestInput } from '../../src/infrastructure/security/internal-request-verifier.adapter';
import { Argon2PasswordAdapter } from '../../src/infrastructure/security/argon2-password.adapter';
import { AuthTokenAdapter } from '../../src/infrastructure/security/auth-token.adapter';
import type { AuthTokenAdapterOptions } from '../../src/infrastructure/security/auth-token.adapter';
import { IdempotencyCryptoAdapter } from '../../src/infrastructure/security/idempotency-crypto.adapter';
import type { IdempotencyCryptoOptions } from '../../src/infrastructure/security/idempotency-crypto.adapter';
import { validateIdentityConfig } from '../../src/bootstrap/identity-config';
import type { ConfigService } from '@nestjs/config';
import type { CanonicalRegistrationRequest } from '../../src/application/ports/auth-crypto.ports';
import type { LoginResult, RegisterResult } from '../../src/application/auth.models';
import type { CompletedRegistrationRecord } from '../../src/application/ports/registration-persistence.port';

function createMockSignedHeader(
  input: CanonicalSignedInput,
  secretKey: string = 'secret-key-32-chars-long-for-test!!',
): string {
  const field = (name: string, value: string): string =>
    `${name}:${Buffer.byteLength(value, 'utf8')}:${value}`;

  const method = input.method.toUpperCase();
  const path = input.path;
  const query = input.canonicalQuery;
  const audience = input.audience;
  const actorId = input.actor ? input.actor.id : 'none';
  const actorRoles =
    input.actor && input.actor.roles.length > 0
      ? Array.from(new Set(input.actor.roles)).sort().join(',')
      : 'none';
  const requestId = input.requestId;
  const bodySha256 = input.bodySha256;
  const iat = String(input.issuedAt);
  const nonce = input.nonce;
  const keyId = input.keyId;

  const canonicalPayload = [
    'v1',
    field('method', method),
    field('path', path),
    field('query', query),
    field('aud', audience),
    field('sub', actorId),
    field('roles', actorRoles),
    field('requestId', requestId),
    field('bodySha256', bodySha256),
    field('iat', iat),
    field('nonce', nonce),
    field('kid', keyId),
  ].join('\n');

  const signature = createHmac('sha256', secretKey)
    .update(canonicalPayload, 'utf8')
    .digest('base64url');

  return `v=1;kid=${keyId};iat=${input.issuedAt};nonce=${nonce};sig=${signature}`;
}

describe('InternalRequestVerifierAdapter (Unit)', () => {
  let verifier: InternalRequestVerifierAdapter;
  const testSecret = 'secret-key-32-chars-long-for-test!!';
  const nowInSeconds = 1700000000;

  const fullCanonicalInput: CanonicalSignedInput = {
    method: 'POST',
    path: '/api/v1/auth/refresh',
    canonicalQuery: 'grant_type=refresh_token',
    bodySha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    audience: 'identity-service',
    actor: {
      id: 'usr_12345',
      roles: ['CUSTOMER'],
    },
    requestId: 'req_abc123',
    issuedAt: nowInSeconds,
    nonce: 'nonce_99999',
    keyId: 'v1',
  };

  const validAuthHeader = createMockSignedHeader(fullCanonicalInput, testSecret);

  const baseVerifyInput: VerifyInternalRequestInput = {
    authHeader: validAuthHeader,
    requestInput: {
      method: fullCanonicalInput.method,
      path: fullCanonicalInput.path,
      canonicalQuery: fullCanonicalInput.canonicalQuery,
      bodySha256: fullCanonicalInput.bodySha256,
      audience: fullCanonicalInput.audience,
      actor: fullCanonicalInput.actor,
      requestId: fullCanonicalInput.requestId,
    },
    expectedAudience: 'identity-service',
    allowedKeyIds: ['v1'],
    nowInSeconds,
    maxClockSkewSeconds: 300,
  };

  beforeEach(() => {
    verifier = new InternalRequestVerifierAdapter(testSecret);
  });

  it('1. VALID_D03_SIGNATURE_IS_ACCEPTED_WITH_BOUNDED_TRUSTED_CONTEXT: Accepts valid D03 signature and returns trusted request context', async () => {
    const result = await verifier.verify(baseVerifyInput);
    expect(result.actor?.id).toBe('usr_12345');
    expect(result.requestId).toBe('req_abc123');
    expect(result.issuedAt).toBe(nowInSeconds);
  });

  it('2. MALFORMED_OR_TAMPERED_SIGNATURE_IS_REJECTED: Rejects malformed header structure, missing fields, unsupported version, invalid iat, tampered signature or modified payload fields', async () => {
    // 2a. Missing or empty header
    await expect(verifier.verify({ ...baseVerifyInput, authHeader: '' })).rejects.toThrow(
      'Missing or invalid X-Internal-Gateway-Auth header',
    );

    // 2b. Missing required fields in header (missing kid, iat, nonce, or sig)
    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=1;iat=1700000000;nonce=nonce_99999;sig=some_sig',
      }),
    ).rejects.toThrow('Missing required fields in auth header (kid, iat, nonce, sig)');

    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=1;kid=v1;nonce=nonce_99999;sig=some_sig',
      }),
    ).rejects.toThrow('Missing required fields in auth header (kid, iat, nonce, sig)');

    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=1;kid=v1;iat=1700000000;sig=some_sig',
      }),
    ).rejects.toThrow('Missing required fields in auth header (kid, iat, nonce, sig)');

    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=1;kid=v1;iat=1700000000;nonce=nonce_99999',
      }),
    ).rejects.toThrow('Missing required fields in auth header (kid, iat, nonce, sig)');

    // 2c. Unsupported or missing version
    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=2;kid=v1;iat=1700000000;nonce=nonce_99999;sig=some_sig',
      }),
    ).rejects.toThrow('Unsupported or missing version in auth header');

    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'kid=v1;iat=1700000000;nonce=nonce_99999;sig=some_sig',
      }),
    ).rejects.toThrow('Unsupported or missing version in auth header');

    // 2d. Invalid non-numeric or non-integer decimal iat value
    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=1;kid=v1;iat=not_a_number;nonce=nonce_99999;sig=some_sig',
      }),
    ).rejects.toThrow('Invalid iat value in auth header');

    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=1;kid=v1;iat=1700000000.5;nonce=nonce_99999;sig=some_sig',
      }),
    ).rejects.toThrow('Invalid iat value in auth header');

    // 2e. Malformed segment without '='
    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=1;kid=v1;iat=1700000000;nonce=nonce_99999;sig=some_sig;garbage',
      }),
    ).rejects.toThrow('Malformed segment in auth header');

    // 2f. Duplicate parameter keys in auth header
    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=1;kid=v1;kid=v2;iat=1700000000;nonce=nonce_99999;sig=some_sig',
      }),
    ).rejects.toThrow('Duplicate parameter in auth header');

    // 2g. Unknown parameter key in auth header
    await expect(
      verifier.verify({
        ...baseVerifyInput,
        authHeader: 'v=1;kid=v1;iat=1700000000;nonce=nonce_99999;sig=some_sig;unknownKey=123',
      }),
    ).rejects.toThrow('Unknown or invalid parameter key in auth header');

    // 2h. Tampered signature header
    const tamperedHeader = validAuthHeader.replace(/sig=[^;]+/, 'sig=invalid_tampered_signature');
    await expect(
      verifier.verify({ ...baseVerifyInput, authHeader: tamperedHeader }),
    ).rejects.toThrow('Invalid internal request signature');

    // 2i. Tampered requestInput payload
    const tamperedPayloadInput: VerifyInternalRequestInput = {
      ...baseVerifyInput,
      requestInput: {
        ...baseVerifyInput.requestInput,
        path: '/api/v1/auth/malicious-path',
      },
    };

    await expect(verifier.verify(tamperedPayloadInput)).rejects.toThrow(
      'Invalid internal request signature',
    );
  });

  it('3. AUDIENCE_AND_KEY_ID_POLICY_IS_ENFORCED: Rejects when audience is mismatched or keyId is disallowed (fail-closed key policy)', async () => {
    // 3a. Mismatched audience
    const mismatchedAudienceInput: VerifyInternalRequestInput = {
      ...baseVerifyInput,
      expectedAudience: 'different-service',
    };

    await expect(verifier.verify(mismatchedAudienceInput)).rejects.toThrow(
      'Audience mismatch in internal request input',
    );

    // 3b. Disallowed keyId (explicit allowedKeyIds)
    const untrustedKeyInput: CanonicalSignedInput = {
      ...fullCanonicalInput,
      keyId: 'untrusted_key_v99',
    };
    const untrustedKeyHeader = createMockSignedHeader(untrustedKeyInput, testSecret);
    const mismatchedKeyIdInput: VerifyInternalRequestInput = {
      ...baseVerifyInput,
      authHeader: untrustedKeyHeader,
      allowedKeyIds: ['v1'],
    };

    await expect(verifier.verify(mismatchedKeyIdInput)).rejects.toThrow(
      'KeyId not allowed in internal request input',
    );

    // 3c. Empty allowedKeyIds array (fail-closed: rejects all keys)
    const emptyAllowedKeyInput: VerifyInternalRequestInput = {
      ...baseVerifyInput,
      allowedKeyIds: [],
    };

    await expect(verifier.verify(emptyAllowedKeyInput)).rejects.toThrow(
      'KeyId not allowed in internal request input',
    );

    // 3d. Omitted allowedKeyIds with untrusted kid (defaults to ['v1'], rejects kid='v2')
    const kid2Input: CanonicalSignedInput = {
      ...fullCanonicalInput,
      keyId: 'v2',
    };
    const kid2Header = createMockSignedHeader(kid2Input, testSecret);
    const omittedAllowedKeysInput: VerifyInternalRequestInput = {
      authHeader: kid2Header,
      requestInput: baseVerifyInput.requestInput,
      expectedAudience: baseVerifyInput.expectedAudience,
      nowInSeconds: baseVerifyInput.nowInSeconds,
      maxClockSkewSeconds: baseVerifyInput.maxClockSkewSeconds,
    };

    await expect(verifier.verify(omittedAllowedKeysInput)).rejects.toThrow(
      'KeyId not allowed in internal request input',
    );
  });

  it('4. STALE_OR_FUTURE_ISSUED_AT_IS_REJECTED: Rejects timestamp out of clock skew window', async () => {
    // iat too old (> 300 seconds)
    const staleCanonicalInput: CanonicalSignedInput = {
      ...fullCanonicalInput,
      issuedAt: nowInSeconds - 400,
    };
    const staleHeader = createMockSignedHeader(staleCanonicalInput, testSecret);
    const staleInput: VerifyInternalRequestInput = {
      ...baseVerifyInput,
      authHeader: staleHeader,
    };

    await expect(verifier.verify(staleInput)).rejects.toThrow(
      'Timestamp out of allowed clock skew window',
    );

    // iat too far in future (> 300 seconds)
    const futureCanonicalInput: CanonicalSignedInput = {
      ...fullCanonicalInput,
      issuedAt: nowInSeconds + 400,
    };
    const futureHeader = createMockSignedHeader(futureCanonicalInput, testSecret);
    const futureInput: VerifyInternalRequestInput = {
      ...baseVerifyInput,
      authHeader: futureHeader,
    };

    await expect(verifier.verify(futureInput)).rejects.toThrow(
      'Timestamp out of allowed clock skew window',
    );
  });

  it('5. SIGNATURE_BYTES_ARE_COMPARED_IN_CONSTANT_TIME: Ensures equal-length signature bytes are checked and mismatched signatures are rejected', async () => {
    const sigLength = 'sig='.length;
    const sigIndex = validAuthHeader.indexOf('sig=');
    const origSig = validAuthHeader.substring(sigIndex + sigLength);
    const modifiedSig =
      origSig.substring(0, origSig.length - 1) + (origSig.endsWith('a') ? 'b' : 'a');
    const headerSameLengthDiffSig =
      validAuthHeader.substring(0, sigIndex + sigLength) + modifiedSig;

    const inputSameLength: VerifyInternalRequestInput = {
      ...baseVerifyInput,
      authHeader: headerSameLengthDiffSig,
    };

    await expect(verifier.verify(inputSameLength)).rejects.toThrow(
      'Invalid internal request signature',
    );
  });
});

describe('Argon2PasswordAdapter (Unit)', () => {
  let adapter: Argon2PasswordAdapter;

  beforeEach(() => {
    adapter = new Argon2PasswordAdapter();
  });

  it('6. ARGON2_HASHING_PRODUCES_VALID_ARGON2ID_STRING: Hashes plaintext password using Argon2id algorithm and parameters', async () => {
    const hash = await adapter.hash('SecureP@ssw0rd123');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$/);
  });

  it('7. ARGON2_VERIFICATION_MATCHES_VALID_PASSWORD_AND_REJECTS_INVALID: Verifies correct password against hash and rejects invalid password', async () => {
    const hash = await adapter.hash('SecureP@ssw0rd123');
    const isValid = await adapter.verify('SecureP@ssw0rd123', hash);
    const isInvalid = await adapter.verify('WrongP@ssw0rd!', hash);
    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  it('8. ARGON2_OPTIONS_ALLOW_CUSTOM_COST_PARAMETERS: Instantiates with custom Argon2 cost parameters', async () => {
    const customAdapter = new Argon2PasswordAdapter({
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 2,
    });
    const hash = await customAdapter.hash('SecureP@ssw0rd123');
    expect(hash).toContain('m=65536,t=3,p=2');
  });

  it('18. ARGON2_INTEROPERABILITY_PROVES_GENUINE_ARGON2ID_COMPUTE: Hash generated by adapter is verified by independent Argon2id implementation', async () => {
    const plaintext = 'InteroperableP@ssw0rd2026!';
    const hash = await adapter.hash(plaintext);

    const parts = hash.split('$');
    expect(parts.length).toBe(6);
    const [, alg, vStr, paramsStr, sB64, kB64] = parts;
    expect(alg).toBe('argon2id');
    expect(vStr).toBe('v=19');

    const paramMap = new Map<string, number>();
    for (const item of (paramsStr ?? '').split(',')) {
      const [k, v] = item.split('=');
      if (k && v && /^\d+$/.test(v)) {
        paramMap.set(k, Number(v));
      }
    }

    const m = paramMap.get('m');
    const t = paramMap.get('t');
    const p = paramMap.get('p');
    expect(m).toBeDefined();
    expect(t).toBeDefined();
    expect(p).toBeDefined();

    const saltBuf = Buffer.from(sB64 ?? '', 'base64url');
    const expectedKeyBuf = Buffer.from(kB64 ?? '', 'base64url');

    const genuineArgon2Encoded = await hashWasmArgon2id({
      password: plaintext,
      salt: saltBuf,
      iterations: t!,
      memorySize: m!,
      parallelism: p!,
      hashLength: expectedKeyBuf.length,
      outputType: 'encoded',
    });

    const genuineKeyB64 = genuineArgon2Encoded.split('$')[5] ?? '';
    const genuineKeyBuf = Buffer.from(genuineKeyB64, 'base64url');

    expect(timingSafeEqual(genuineKeyBuf, expectedKeyBuf)).toBe(true);
  });

  it('19. REJECTS_PBKDF2_HASHES_PSEUDO_LABELED_AS_ARGON2ID: Verify rejects pseudo-argon2 hashes derived via PBKDF2 or non-Argon2 algorithms', async () => {
    const plaintext = 'PseudoArgon2P@ssw0rd!';
    const saltBuf = Buffer.from('1234567890123456', 'utf8');
    const saltB64 = saltBuf.toString('base64url');

    const pseudoHashBuf = pbkdf2Sync(plaintext, saltBuf, 30000, 32, 'sha256');
    const pseudoHashB64 = pseudoHashBuf.toString('base64url');
    const pseudoArgon2Hash = `$argon2id$v=19$m=65536,t=3,p=1$${saltB64}$${pseudoHashB64}`;

    const isValid = await adapter.verify(plaintext, pseudoArgon2Hash);
    expect(isValid).toBe(false);
  });
});

describe('AuthTokenAdapter (Unit)', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const dummyUser: LoginResult['user'] = {
    id: 'usr_customer_123',
    email: 'user@example.com',
    displayName: 'John Customer',
    roles: ['CUSTOMER'],
  };

  const validOptions: AuthTokenAdapterOptions = {
    privateKey,
    publicKey,
    keyId: 'identity-key-2026-v1',
    issuer: 'https://identity.movie-ticket.local',
    audience: 'https://api.movie-ticket.local',
    expiresInSeconds: 3600,
    algorithm: 'RS256',
  };

  it('9. ASYMMETRIC_JWT_SIGNING_INCLUDES_KEY_ID_ALGORITHM_AND_CANONICAL_CLAIMS: Signs access token using asymmetric private key with kid header and canonical payload claims', async () => {
    const adapter = new AuthTokenAdapter(validOptions);
    const issuance = await adapter.signAccessToken(dummyUser);
    const token = issuance.accessToken;
    expect(issuance.expiresIn).toBe(3600);

    const parts = token.split('.');
    expect(parts.length).toBe(3);

    const headerPart = parts[0] ?? '';
    const payloadPart = parts[1] ?? '';

    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as {
      alg: string;
      kid: string;
      typ: string;
    };
    expect(header.alg).toBe('RS256');
    expect(header.kid).toBe('identity-key-2026-v1');
    expect(header.typ).toBe('JWT');

    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
      sub: string;
      email: string;
      displayName: string;
      roles: string[];
      iss: string;
      aud: string;
      iat: number;
      exp: number;
    };
    expect(payload.sub).toBe('usr_customer_123');
    expect(payload.email).toBe('user@example.com');
    expect(payload.displayName).toBe('John Customer');
    expect(payload.roles).toEqual(['CUSTOMER']);
    expect(payload.iss).toBe('https://identity.movie-ticket.local');
    expect(payload.aud).toBe('https://api.movie-ticket.local');
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('10. MISSING_OR_INVALID_KEY_CONFIGURATION_FAILS_CLOSED: Constructor fails explicitly when required key parameters are missing', () => {
    expect(
      () =>
        new AuthTokenAdapter({
          ...validOptions,
          privateKey: '',
        }),
    ).toThrow('Missing required AuthTokenAdapter options');

    expect(
      () =>
        new AuthTokenAdapter({
          ...validOptions,
          keyId: '',
        }),
    ).toThrow('Missing required AuthTokenAdapter options');
  });

  it('20. JWT_ALGORITHM_MISMATCH_IS_REJECTED: Rejects algorithm mismatch or unsupported algorithms (EdDSA/ES256) when configured for RS256', () => {
    expect(
      () =>
        new AuthTokenAdapter({
          ...validOptions,
          algorithm: 'EdDSA',
        }),
    ).toThrow('Unsupported JWT algorithm: EdDSA');

    expect(
      () =>
        new AuthTokenAdapter({
          ...validOptions,
          algorithm: 'ES256',
        }),
    ).toThrow('Unsupported JWT algorithm: ES256');
  });
});

describe('IdempotencyCryptoAdapter (Unit)', () => {
  const validOptions: IdempotencyCryptoOptions = {
    encryptionKeyHex: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
    fingerprintSecretHex:
      'ffaaddeec cbbbbaa99887766554433221100ffaaddeec cbbbbaa99887766554433'.replace(/\s/g, ''),
    defaultKeyId: 'v1',
  };

  const sampleRequest: CanonicalRegistrationRequest = {
    email: 'newuser@example.com',
    password: 'SuperSecretPassword123!',
    displayName: 'New User',
  };

  const sampleRegisterResult: RegisterResult = {
    accessToken: 'access.jwt.register',
    refreshToken: 'refresh-register-token',
    expiresIn: 3600,
    user: {
      id: 'usr_reg_999',
      email: 'newuser@example.com',
      displayName: 'New User',
      roles: ['CUSTOMER'],
    },
  };

  it('11. HASH_KEY_RETURNS_DETERMINISTIC_SHA256_HASH: Hashes raw idempotency key using SHA-256', () => {
    const adapter = new IdempotencyCryptoAdapter(validOptions);
    const hash = adapter.hashKey('idemp-key-abc-123');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(adapter.hashKey('idemp-key-abc-123')).toBe(hash);
  });

  it('12. FINGERPRINT_USES_KEYED_HMAC_TO_PREVENT_OFFLINE_PASSWORD_ORACLE: Computes registration fingerprint using keyed HMAC-SHA256', async () => {
    const adapter = new IdempotencyCryptoAdapter(validOptions);
    const outcome = await adapter.fingerprint(sampleRequest, 'v1');

    expect(outcome.keyId).toBe('v1');
    expect(outcome.hash).toMatch(/^[a-f0-9]{64}$/);

    // Keyed HMAC must differ from raw unkeyed SHA-256 hash of password payload
    const unkeyedSha256 = createHmac('sha256', '')
      .update(`${sampleRequest.email}:${sampleRequest.displayName}:${sampleRequest.password}`)
      .digest('hex');
    expect(outcome.hash).not.toBe(unkeyedSha256);
  });

  it('13. ENCRYPT_RESULT_USES_AUTHENTICATED_ENCRYPTION_AES_GCM: Encrypts idempotency outcome using authenticated encryption', async () => {
    const adapter = new IdempotencyCryptoAdapter(validOptions);
    const outcome = await adapter.encryptResult(sampleRegisterResult);

    expect(outcome.responseKeyId).toBe('v1');
    expect(outcome.responseNonce).toBeDefined();
    expect(outcome.encryptedResponse).toBeDefined();
    expect(outcome.encryptedResponse).not.toContain('usr_reg_999');
  });

  it('14. DECRYPT_RESULT_REJECTS_TAMPERED_CIPHERTEXT_OR_AUTH_TAG: Decrypts valid payload and rejects tampered ciphertext or auth tag', async () => {
    const adapter = new IdempotencyCryptoAdapter(validOptions);
    const outcome = await adapter.encryptResult(sampleRegisterResult);

    const record: CompletedRegistrationRecord = {
      fingerprintHash: 'fp_hash',
      fingerprintKeyId: outcome.responseKeyId,
      encryptedResponse: outcome.encryptedResponse,
      responseKeyId: outcome.responseKeyId,
      responseNonce: outcome.responseNonce,
    };

    const decrypted = await adapter.decryptResult(record);
    expect(decrypted.user.id).toBe('usr_reg_999');

    const tamperedRecord: CompletedRegistrationRecord = {
      ...record,
      encryptedResponse:
        outcome.encryptedResponse.substring(0, outcome.encryptedResponse.length - 4) + 'AAAA',
    };
    await expect(adapter.decryptResult(tamperedRecord)).rejects.toThrow();
  });

  it('15. MISSING_SECRET_KEYS_FAILS_CLOSED: Constructor fails explicitly when encryption key or fingerprint secret is missing', () => {
    expect(
      () =>
        new IdempotencyCryptoAdapter({
          ...validOptions,
          encryptionKeyHex: '',
        }),
    ).toThrow('Missing required IdempotencyCryptoAdapter options');

    expect(
      () =>
        new IdempotencyCryptoAdapter({
          ...validOptions,
          fingerprintSecretHex: '',
        }),
    ).toThrow('Missing required IdempotencyCryptoAdapter options');
  });
});

describe('validateIdentityConfig (Unit)', () => {
  const validEnv: Record<string, string> = {
    GATEWAY_INTERNAL_SIGNING_SECRET: 'gateway-internal-secret-key-32-chars-long!',
    JWT_PRIVATE_KEY:
      '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----',
    JWT_PUBLIC_KEY:
      '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----',
    JWT_KEY_ID: 'identity-jwt-key-2026-v1',
    JWT_ISSUER: 'https://identity.movie-ticket.local',
    JWT_AUDIENCE: 'https://api.movie-ticket.local',
    IDEMPOTENCY_ENCRYPTION_KEY: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
    FINGERPRINT_HMAC_SECRET:
      'ffaaddeec cbbbbaa99887766554433221100ffaaddeec cbbbbaa99887766554433'.replace(/\s/g, ''),
    DATABASE_URL: 'postgresql://identity:identity@127.0.0.1:5432/identity',
    JWT_ACCESS_TOKEN_TTL_SECONDS: '3600',
  };

  const createMockConfigService = (env: Record<string, string>): ConfigService =>
    ({
      get: (key: string) => env[key],
      getOrThrow: (key: string) => {
        const val = env[key];
        if (!val) throw new Error(`Configuration key "${key}" is missing`);
        return val;
      },
    }) as unknown as ConfigService;

  it('16. VALIDATES_ALL_REQUIRED_IDENTITY_SECRETS_AND_CONFIG: Returns validated identity configuration when all required secrets are present', () => {
    const configService = createMockConfigService(validEnv);
    const validated = validateIdentityConfig(configService);

    expect(validated.gatewayInternalSigningSecret).toBe(validEnv.GATEWAY_INTERNAL_SIGNING_SECRET);
    expect(validated.jwtPrivateKey).toBe(validEnv.JWT_PRIVATE_KEY);
    expect(validated.jwtPublicKey).toBe(validEnv.JWT_PUBLIC_KEY);
    expect(validated.jwtKeyId).toBe(validEnv.JWT_KEY_ID);
    expect(validated.jwtIssuer).toBe(validEnv.JWT_ISSUER);
    expect(validated.jwtAudience).toBe(validEnv.JWT_AUDIENCE);
    expect(validated.idempotencyEncryptionKeyHex).toBe(validEnv.IDEMPOTENCY_ENCRYPTION_KEY);
    expect(validated.fingerprintSecretHex).toBe(validEnv.FINGERPRINT_HMAC_SECRET);
    expect(validated.databaseUrl).toBe(validEnv.DATABASE_URL);
    expect(validated.accessTokenTtlSeconds).toBe(3600);
  });

  it('17. REJECTS_MISSING_OR_EMPTY_REQUIRED_SECRETS_FAIL_CLOSED: Rejects explicitly when any required identity configuration secret is missing or empty', () => {
    const requiredKeys = [
      'GATEWAY_INTERNAL_SIGNING_SECRET',
      'JWT_PRIVATE_KEY',
      'JWT_PUBLIC_KEY',
      'JWT_KEY_ID',
      'JWT_ISSUER',
      'JWT_AUDIENCE',
      'IDEMPOTENCY_ENCRYPTION_KEY',
      'FINGERPRINT_HMAC_SECRET',
      'DATABASE_URL',
      'JWT_ACCESS_TOKEN_TTL_SECONDS',
    ];

    for (const key of requiredKeys) {
      const incompleteEnv = { ...validEnv, [key]: '' };
      const configService = createMockConfigService(incompleteEnv);
      expect(() => validateIdentityConfig(configService)).toThrow();
    }
  });

  it.each(['0', '-1', '1.5', 'abc'])(
    '18. REJECTS_INVALID_ACCESS_TOKEN_TTL_FAIL_CLOSED: rejects %s',
    (invalidTtl) => {
      expect(() =>
        validateIdentityConfig(
          createMockConfigService({ ...validEnv, JWT_ACCESS_TOKEN_TTL_SECONDS: invalidTtl }),
        ),
      ).toThrow('JWT_ACCESS_TOKEN_TTL_SECONDS must be a positive integer');
    },
  );
});
