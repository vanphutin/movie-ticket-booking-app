/**
 * Unit tests for RegisterUseCase verifying domain policy, password redaction,
 * completed idempotency replay, and payload conflict rejection boundaries.
 */
import {
  IdempotencyKeyConflictError,
  RegistrationConflictError,
} from '../../src/application/auth.errors';
import type { RegisterCommand } from '../../src/application/auth.models';
import type {
  IdGenerator,
  IdempotencyCryptoPort,
  PasswordHasher,
} from '../../src/application/ports/auth-crypto.ports';
import type {
  CompletedRegistrationRecord,
  RegistrationPersistencePort,
} from '../../src/application/ports/registration-persistence.port';
import { RegisterUseCase } from '../../src/application/register.use-case';

describe('RegisterUseCase', () => {
  let persistence: jest.Mocked<RegistrationPersistencePort>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let idGenerator: jest.Mocked<IdGenerator>;
  let idempotencyCrypto: jest.Mocked<IdempotencyCryptoPort>;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed_password_123'),
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
