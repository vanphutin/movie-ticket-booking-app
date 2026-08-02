/**
 * Unit tests for RegisterUseCase, LoginUseCase, and RefreshUseCase verifying domain policy,
 * password redaction, idempotency replay, payload conflict rejection, and valid token rotation.
 */
import {
  IdempotencyKeyConflictError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RegistrationConflictError,
} from '../../src/application/auth.errors';
import type {
  LoginCommand,
  RefreshCommand,
  RegisterCommand,
} from '../../src/application/auth.models';
import type {
  AuthTokenPort,
  IdGenerator,
  IdempotencyCryptoPort,
  PasswordHasher,
  RefreshTokenCryptoPort,
} from '../../src/application/ports/auth-crypto.ports';
import type {
  CredentialReaderPort,
  LoginSessionPort,
} from '../../src/application/ports/login-session.port';
import type {
  RefreshRotationResult,
  RefreshSessionRotationPort,
} from '../../src/application/ports/refresh-session-rotation.port';
import type {
  CompletedRegistrationRecord,
  RegistrationPersistencePort,
} from '../../src/application/ports/registration-persistence.port';
import { RegisterUseCase } from '../../src/application/register.use-case';
import { LoginUseCase } from '../../src/application/login.use-case';
import { RefreshUseCase } from '../../src/application/refresh.use-case';

describe('RegisterUseCase', () => {
  let persistence: jest.Mocked<RegistrationPersistencePort>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let idGenerator: jest.Mocked<IdGenerator>;
  let idempotencyCrypto: jest.Mocked<IdempotencyCryptoPort>;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed_password_123'),
      verify: jest.fn().mockResolvedValue(true),
    };

    idGenerator = {
      generate: jest.fn().mockReturnValue('f2ad40a8-7d46-4a45-b4ec-fda33d17da8b'),
    };

    idempotencyCrypto = {
      hashKey: jest.fn().mockImplementation((key: string) => `hash_${key}`),
      fingerprint: jest.fn().mockResolvedValue({
        hash: 'fp_valid_hash',
        keyId: 'fingerprint-key-v1',
      }),
      encryptResult: jest.fn().mockResolvedValue({
        encryptedResponse: 'enc_payload',
        responseKeyId: 'k1',
        responseNonce: 'nonce1',
      }),
      decryptResult: jest.fn().mockResolvedValue({
        user: {
          id: 'f2ad40a8-7d46-4a45-b4ec-fda33d17da8b',
          email: 'user@example.com',
          displayName: 'John Doe',
          roles: ['CUSTOMER'],
        },
      }),
    };

    persistence = {
      findCompletedByKey: jest.fn().mockResolvedValue(null),
      registerAtomically: jest.fn(({ user }) =>
        Promise.resolve({ kind: 'created' as const, result: { user } }),
      ),
    };

    useCase = new RegisterUseCase(passwordHasher, idGenerator, persistence, idempotencyCrypto);
  });

  it('registers a customer without exposing or persisting the plaintext password', async () => {
    const command: RegisterCommand = {
      email: '  User@Example.COM ',
      password: '  Password123!  ',
      displayName: 'John Doe',
      idempotencyKey: 'idem_key_001_valid',
    };

    const result = await useCase.execute(command);

    expect(result.user.email).toBe('user@example.com');
    expect(result.user.displayName).toBe('John Doe');
    expect(result.user.roles).toEqual(['CUSTOMER']);
    expect(idempotencyCrypto.hashKey).toHaveBeenCalledWith('idem_key_001_valid');
    expect(persistence.findCompletedByKey).toHaveBeenCalledWith(
      'REGISTER',
      'hash_idem_key_001_valid',
    );
    expect(idempotencyCrypto.fingerprint).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: '  Password123!  ',
      displayName: 'John Doe',
    });
    expect(passwordHasher.hash).toHaveBeenCalledWith('  Password123!  ');
    expect(idGenerator.generate).toHaveBeenCalled();

    const persistenceInput = persistence.registerAtomically.mock.calls[0]?.[0];
    expect(persistenceInput).toBeDefined();
    expect(persistenceInput?.passwordHash).toBe('hashed_password_123');
    expect(persistenceInput).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('replays a completed registration for matching idempotency key and canonical request without re-hashing password, generating ID, or calling registerAtomically', async () => {
    const record: CompletedRegistrationRecord = {
      fingerprintHash: 'fp_valid_hash',
      fingerprintKeyId: 'v1',
      encryptedResponse: 'enc_payload',
      responseKeyId: 'k1',
      responseNonce: 'nonce1',
    };
    persistence.findCompletedByKey.mockResolvedValue(record);
    idempotencyCrypto.fingerprint.mockResolvedValue({
      hash: 'fp_valid_hash',
      keyId: 'v1',
    });

    const command: RegisterCommand = {
      email: '  User@Example.COM ',
      password: '  Password123!  ',
      displayName: 'John Doe',
      idempotencyKey: 'idem_key_001_valid',
    };

    const result = await useCase.execute(command);

    expect(idempotencyCrypto.hashKey).toHaveBeenCalledWith('idem_key_001_valid');
    expect(persistence.findCompletedByKey).toHaveBeenCalledWith(
      'REGISTER',
      'hash_idem_key_001_valid',
    );
    expect(idempotencyCrypto.fingerprint).toHaveBeenCalledWith(
      {
        email: 'user@example.com',
        password: '  Password123!  ',
        displayName: 'John Doe',
      },
      'v1',
    );
    expect(idempotencyCrypto.decryptResult).toHaveBeenCalledWith(record);
    expect(result.user.email).toBe('user@example.com');
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(idGenerator.generate).not.toHaveBeenCalled();
    expect(persistence.registerAtomically).not.toHaveBeenCalled();
  });

  it('rejects registration with IdempotencyKeyConflictError when same idempotency key is reused with a different canonical payload', async () => {
    const record: CompletedRegistrationRecord = {
      fingerprintHash: 'fp_original_hash',
      fingerprintKeyId: 'v1',
      encryptedResponse: 'enc_payload',
      responseKeyId: 'k1',
      responseNonce: 'nonce1',
    };
    persistence.findCompletedByKey.mockResolvedValue(record);
    idempotencyCrypto.fingerprint.mockResolvedValue({
      hash: 'fp_different_hash',
      keyId: 'v1',
    });

    const command: RegisterCommand = {
      email: '  User@Example.COM ',
      password: '  DifferentPassword123!  ',
      displayName: 'John Doe',
      idempotencyKey: 'idem_key_001_valid',
    };

    const conflictPromise = useCase.execute(command);

    await expect(conflictPromise).rejects.toThrow(IdempotencyKeyConflictError);
    await expect(conflictPromise).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_CONFLICT',
    });
    expect(idempotencyCrypto.hashKey).toHaveBeenCalledWith('idem_key_001_valid');
    expect(persistence.findCompletedByKey).toHaveBeenCalledWith(
      'REGISTER',
      'hash_idem_key_001_valid',
    );
    expect(idempotencyCrypto.fingerprint).toHaveBeenCalledTimes(1);
    expect(idempotencyCrypto.fingerprint).toHaveBeenCalledWith(
      {
        email: 'user@example.com',
        password: '  DifferentPassword123!  ',
        displayName: 'John Doe',
      },
      'v1',
    );
    expect(idempotencyCrypto.decryptResult).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(idGenerator.generate).not.toHaveBeenCalled();
    expect(persistence.registerAtomically).not.toHaveBeenCalled();
  });

  it('rejects registration with RegistrationConflictError when the persistence layer detects a duplicate email', async () => {
    persistence.registerAtomically.mockResolvedValue({
      kind: 'email_already_exists',
    });
    const command: RegisterCommand = {
      email: '  User@Example.COM ',
      password: '  Password123!  ',
      displayName: 'John Doe',
      idempotencyKey: 'idem_key_001_valid',
    };

    const duplicatePromise = useCase.execute(command);

    await expect(duplicatePromise).rejects.toThrow(RegistrationConflictError);
    await expect(duplicatePromise).rejects.toMatchObject({
      code: 'REGISTRATION_CONFLICT',
    });
    expect(passwordHasher.hash).toHaveBeenCalledWith('  Password123!  ');
    expect(idGenerator.generate).toHaveBeenCalled();
    expect(persistence.registerAtomically).toHaveBeenCalledTimes(1);
    expect(idempotencyCrypto.decryptResult).not.toHaveBeenCalled();
  });

  it('passes the prepared completed idempotency record to registerAtomically without persisting the plaintext password', async () => {
    idempotencyCrypto.encryptResult.mockResolvedValue({
      encryptedResponse: 'encrypted_register_result',
      responseKeyId: 'response-key-v1',
      responseNonce: 'response-nonce-v1',
    });

    const command: RegisterCommand = {
      email: '  User@Example.COM ',
      password: '  TransactionSecret_123!  ',
      displayName: 'John Doe',
      idempotencyKey: 'idem_key_transaction_001',
    };

    await useCase.execute(command);

    expect(idempotencyCrypto.encryptResult).toHaveBeenCalledWith({
      user: {
        id: 'f2ad40a8-7d46-4a45-b4ec-fda33d17da8b',
        email: 'user@example.com',
        displayName: 'John Doe',
        roles: ['CUSTOMER'],
      },
    });
    expect(persistence.registerAtomically).toHaveBeenCalledTimes(1);

    const input = persistence.registerAtomically.mock.calls[0]?.[0];

    expect(input?.user).toEqual({
      id: 'f2ad40a8-7d46-4a45-b4ec-fda33d17da8b',
      email: 'user@example.com',
      displayName: 'John Doe',
      roles: ['CUSTOMER'],
    });

    expect(input?.passwordHash).toBe('hashed_password_123');

    expect(input?.idempotencyRecord).toEqual({
      keyHash: 'hash_idem_key_transaction_001',
      fingerprintHash: 'fp_valid_hash',
      fingerprintKeyId: 'fingerprint-key-v1',
      encryptedResponse: 'encrypted_register_result',
      responseKeyId: 'response-key-v1',
      responseNonce: 'response-nonce-v1',
    });

    expect(JSON.stringify(input)).not.toContain('TransactionSecret_123!');
    expect(input).not.toHaveProperty('password');
    expect(input).not.toHaveProperty('plaintextPassword');
  });

  it('replays winner completed registration when registerAtomically encounters an idempotency key race in transaction with matching payload', async () => {
    const winnerRecord: CompletedRegistrationRecord = {
      fingerprintHash: 'fp_valid_hash',
      fingerprintKeyId: 'v1',
      encryptedResponse: 'enc_winner_payload',
      responseKeyId: 'k1',
      responseNonce: 'nonce1',
    };

    persistence.findCompletedByKey.mockResolvedValueOnce(null).mockResolvedValueOnce(winnerRecord);

    persistence.registerAtomically.mockResolvedValue({
      kind: 'idempotency_key_exists',
    });

    const command: RegisterCommand = {
      email: '  User@Example.COM ',
      password: '  Password123!  ',
      displayName: 'John Doe',
      idempotencyKey: 'idem_key_race_001',
    };

    const result = await useCase.execute(command);

    expect(persistence.findCompletedByKey).toHaveBeenNthCalledWith(
      1,
      'REGISTER',
      'hash_idem_key_race_001',
    );
    expect(persistence.registerAtomically).toHaveBeenCalledTimes(1);
    expect(persistence.findCompletedByKey).toHaveBeenNthCalledWith(
      2,
      'REGISTER',
      'hash_idem_key_race_001',
    );
    expect(idempotencyCrypto.decryptResult).toHaveBeenCalledWith(winnerRecord);
    expect(result.user.email).toBe('user@example.com');
  });

  it('rejects registration with IdempotencyKeyConflictError when registerAtomically encounters an idempotency key race in transaction with mismatched payload', async () => {
    const winnerRecord: CompletedRegistrationRecord = {
      fingerprintHash: 'fp_winner_hash',
      fingerprintKeyId: 'v1',
      encryptedResponse: 'enc_winner_payload',
      responseKeyId: 'k1',
      responseNonce: 'nonce1',
    };

    persistence.findCompletedByKey.mockResolvedValueOnce(null).mockResolvedValueOnce(winnerRecord);

    persistence.registerAtomically.mockResolvedValue({
      kind: 'idempotency_key_exists',
    });

    idempotencyCrypto.fingerprint.mockResolvedValue({
      hash: 'fp_different_hash',
      keyId: 'fingerprint-key-v1',
    });

    const command: RegisterCommand = {
      email: '  User@Example.COM ',
      password: '  DifferentPassword123!  ',
      displayName: 'John Doe',
      idempotencyKey: 'idem_key_race_001',
    };

    const racePromise = useCase.execute(command);

    await expect(racePromise).rejects.toThrow(IdempotencyKeyConflictError);
    await expect(racePromise).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_CONFLICT',
    });
    expect(persistence.findCompletedByKey).toHaveBeenNthCalledWith(
      1,
      'REGISTER',
      'hash_idem_key_race_001',
    );
    expect(persistence.registerAtomically).toHaveBeenCalledTimes(1);
    expect(persistence.findCompletedByKey).toHaveBeenNthCalledWith(
      2,
      'REGISTER',
      'hash_idem_key_race_001',
    );
    expect(idempotencyCrypto.decryptResult).not.toHaveBeenCalled();
  });

  it('rejects registration with IdempotencyKeyConflictError when registerAtomically encounters an idempotency key race in transaction but winner record is missing', async () => {
    persistence.findCompletedByKey.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    persistence.registerAtomically.mockResolvedValue({
      kind: 'idempotency_key_exists',
    });

    const command: RegisterCommand = {
      email: '  User@Example.COM ',
      password: '  Password123!  ',
      displayName: 'John Doe',
      idempotencyKey: 'idem_key_race_001',
    };

    const nullWinnerPromise = useCase.execute(command);

    await expect(nullWinnerPromise).rejects.toThrow(IdempotencyKeyConflictError);
    await expect(nullWinnerPromise).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_CONFLICT',
    });
    expect(idempotencyCrypto.decryptResult).not.toHaveBeenCalled();
  });
});

describe('LoginUseCase', () => {
  const mockUser = {
    id: 'f2ad40a8-7d46-4a45-b4ec-fda33d17da8b',
    email: 'user@example.com',
    displayName: 'John Doe',
    roles: ['CUSTOMER'] as const,
  };

  it('authenticates valid credentials and issues access token and refresh token session', async () => {
    const credentialReader: jest.Mocked<CredentialReaderPort> = {
      findCredentialByEmail: jest.fn().mockResolvedValue({
        user: mockUser,
        passwordHash: 'hashed_password_123',
        status: 'ACTIVE',
      }),
    };

    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn(),
      verify: jest.fn().mockResolvedValue(true),
    };

    const loginSessionPort: jest.Mocked<LoginSessionPort> = {
      issueForActiveUserAtomically: jest.fn().mockResolvedValue({
        refreshToken: 'opaque_refresh_token_xyz',
      }),
    };

    const authTokenPort: jest.Mocked<AuthTokenPort> = {
      signAccessToken: jest.fn().mockResolvedValue('jwt_access_token_abc'),
    };

    const command: LoginCommand = {
      email: '  User@Example.COM ',
      password: 'Password123!',
    };

    const loginUseCase = new LoginUseCase(
      credentialReader,
      passwordHasher,
      loginSessionPort,
      authTokenPort,
    );

    const result = await loginUseCase.execute(command);

    expect(credentialReader.findCredentialByEmail).toHaveBeenCalledWith('user@example.com');
    expect(passwordHasher.verify).toHaveBeenCalledWith('Password123!', 'hashed_password_123');
    expect(loginSessionPort.issueForActiveUserAtomically).toHaveBeenCalledWith(mockUser);
    expect(authTokenPort.signAccessToken).toHaveBeenCalledWith(mockUser);
    expect(result).toMatchObject({
      accessToken: 'jwt_access_token_abc',
      refreshToken: 'opaque_refresh_token_xyz',
      user: mockUser,
    });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects login with InvalidCredentialsError when user status is DISABLED', async () => {
    const credentialReader: jest.Mocked<CredentialReaderPort> = {
      findCredentialByEmail: jest.fn().mockResolvedValue({
        user: mockUser,
        passwordHash: 'hashed_password_123',
        status: 'DISABLED',
      }),
    };

    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    const loginSessionPort: jest.Mocked<LoginSessionPort> = {
      issueForActiveUserAtomically: jest.fn(),
    };

    const authTokenPort: jest.Mocked<AuthTokenPort> = {
      signAccessToken: jest.fn(),
    };

    const command: LoginCommand = {
      email: 'user@example.com',
      password: 'Password123!',
    };

    const loginUseCase = new LoginUseCase(
      credentialReader,
      passwordHasher,
      loginSessionPort,
      authTokenPort,
    );

    await expect(loginUseCase.execute(command)).rejects.toThrow(InvalidCredentialsError);
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(loginSessionPort.issueForActiveUserAtomically).not.toHaveBeenCalled();
    expect(authTokenPort.signAccessToken).not.toHaveBeenCalled();
  });

  it('rejects login with InvalidCredentialsError when credential is not found', async () => {
    const credentialReader: jest.Mocked<CredentialReaderPort> = {
      findCredentialByEmail: jest.fn().mockResolvedValue(null),
    };

    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    const loginSessionPort: jest.Mocked<LoginSessionPort> = {
      issueForActiveUserAtomically: jest.fn(),
    };

    const authTokenPort: jest.Mocked<AuthTokenPort> = {
      signAccessToken: jest.fn(),
    };

    const command: LoginCommand = {
      email: 'nonexistent@example.com',
      password: 'Password123!',
    };

    const loginUseCase = new LoginUseCase(
      credentialReader,
      passwordHasher,
      loginSessionPort,
      authTokenPort,
    );

    await expect(loginUseCase.execute(command)).rejects.toThrow(InvalidCredentialsError);
    expect(passwordHasher.verify).not.toHaveBeenCalled();
  });

  it('rejects login with InvalidCredentialsError when password verification fails', async () => {
    const credentialReader: jest.Mocked<CredentialReaderPort> = {
      findCredentialByEmail: jest.fn().mockResolvedValue({
        user: mockUser,
        passwordHash: 'hashed_password_123',
        status: 'ACTIVE',
      }),
    };

    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn(),
      verify: jest.fn().mockResolvedValue(false),
    };

    const loginSessionPort: jest.Mocked<LoginSessionPort> = {
      issueForActiveUserAtomically: jest.fn(),
    };

    const authTokenPort: jest.Mocked<AuthTokenPort> = {
      signAccessToken: jest.fn(),
    };

    const command: LoginCommand = {
      email: 'user@example.com',
      password: 'WrongPassword123!',
    };

    const loginUseCase = new LoginUseCase(
      credentialReader,
      passwordHasher,
      loginSessionPort,
      authTokenPort,
    );

    await expect(loginUseCase.execute(command)).rejects.toThrow(InvalidCredentialsError);
    expect(loginSessionPort.issueForActiveUserAtomically).not.toHaveBeenCalled();
    expect(authTokenPort.signAccessToken).not.toHaveBeenCalled();
  });
});

describe('RefreshUseCase', () => {
  it('rotates valid refresh token and issues new access token and refresh token', async () => {
    const fakeCryptoPort: jest.Mocked<RefreshTokenCryptoPort> = {
      hashRefreshToken: jest.fn().mockReturnValue('hashed_old_refresh_token'),
      prepareRefreshToken: jest.fn().mockReturnValue({
        rawToken: 'new_opaque_refresh_token_002',
        tokenHash: 'hashed_new_refresh_token_002',
      }),
    };

    const fakeRotationPort: jest.Mocked<RefreshSessionRotationPort> = {
      rotateSessionAtomically: jest.fn().mockResolvedValue({
        kind: 'success',
        user: {
          id: '11111111-1111-4111-a111-111111111111',
          email: 'user@example.com',
          displayName: 'Customer User',
          roles: ['CUSTOMER'],
        },
      }),
    };

    const fakeTokenPort: jest.Mocked<AuthTokenPort> = {
      signAccessToken: jest.fn().mockResolvedValue('signed_new_access_token'),
    };

    const fakeIdGenerator: jest.Mocked<IdGenerator> = {
      generate: jest.fn().mockReturnValue('new_session_uuid_002'),
    };

    const useCase = new RefreshUseCase(
      fakeCryptoPort,
      fakeRotationPort,
      fakeTokenPort,
      fakeIdGenerator,
    );

    const command: RefreshCommand = {
      refreshToken: 'opaque_old_refresh_token_001',
    };

    const result = await useCase.execute(command);

    expect(fakeCryptoPort.hashRefreshToken).toHaveBeenCalledWith('opaque_old_refresh_token_001');
    expect(fakeCryptoPort.prepareRefreshToken).toHaveBeenCalled();
    expect(fakeRotationPort.rotateSessionAtomically).toHaveBeenCalledWith({
      oldTokenHash: 'hashed_old_refresh_token',
      nextSessionId: 'new_session_uuid_002',
      nextTokenHash: 'hashed_new_refresh_token_002',
    });
    expect(fakeTokenPort.signAccessToken).toHaveBeenCalledWith({
      id: '11111111-1111-4111-a111-111111111111',
      email: 'user@example.com',
      displayName: 'Customer User',
      roles: ['CUSTOMER'],
    });

    expect(result).toEqual({
      accessToken: 'signed_new_access_token',
      refreshToken: 'new_opaque_refresh_token_002',
      user: {
        id: '11111111-1111-4111-a111-111111111111',
        email: 'user@example.com',
        displayName: 'Customer User',
        roles: ['CUSTOMER'],
      },
    });

    expect(result).not.toHaveProperty('tokenHash');
    expect(result).not.toHaveProperty('familyId');
    expect(result).not.toHaveProperty('password');
  });

  it.each<[RefreshRotationResult]>([
    [{ kind: 'session_not_found' }],
    [{ kind: 'session_revoked' }],
    [{ kind: 'replay_detected', familyId: 'fam_stolen_123' }],
  ])(
    'throws InvalidRefreshTokenError when session rotation fails with outcome %p without leaking internal details',
    async (failureOutcome) => {
      const fakeCryptoPort: jest.Mocked<RefreshTokenCryptoPort> = {
        hashRefreshToken: jest.fn().mockReturnValue('hashed_token_xyz'),
        prepareRefreshToken: jest.fn().mockReturnValue({
          rawToken: 'new_opaque_refresh_token_002',
          tokenHash: 'hashed_new_refresh_token_002',
        }),
      };
      const fakeRotationPort: jest.Mocked<RefreshSessionRotationPort> = {
        rotateSessionAtomically: jest.fn().mockResolvedValue(failureOutcome),
      };
      const fakeTokenPort: jest.Mocked<AuthTokenPort> = {
        signAccessToken: jest.fn(),
      };
      const fakeIdGenerator: jest.Mocked<IdGenerator> = {
        generate: jest.fn().mockReturnValue('new_session_uuid_002'),
      };

      const useCase = new RefreshUseCase(
        fakeCryptoPort,
        fakeRotationPort,
        fakeTokenPort,
        fakeIdGenerator,
      );

      const action = useCase.execute({ refreshToken: 'invalid_opaque_token' });

      await expect(action).rejects.toThrow(InvalidRefreshTokenError);
      expect(fakeTokenPort.signAccessToken).not.toHaveBeenCalled();

      await action.catch((err: unknown) => {
        expect(err).toBeInstanceOf(InvalidRefreshTokenError);
        expect(err).not.toHaveProperty('tokenHash');
        expect(err).not.toHaveProperty('familyId');
        expect((err as Error).message).not.toContain('hashed_token_xyz');
        expect((err as Error).message).not.toContain('fam_stolen_123');
      });
    },
  );
});
