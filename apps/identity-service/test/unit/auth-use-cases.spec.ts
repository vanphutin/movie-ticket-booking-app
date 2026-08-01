import type { RegisterCommand } from '../../src/application/auth.models';
import type { IdGenerator, PasswordHasher } from '../../src/application/ports/auth-crypto.ports';
import type { RegistrationPersistencePort } from '../../src/application/ports/registration-persistence.port';
import { RegisterUseCase } from '../../src/application/register.use-case';

describe('RegisterUseCase', () => {
  let persistence: jest.Mocked<RegistrationPersistencePort>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let idGenerator: jest.Mocked<IdGenerator>;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed_password_123'),
    };

    idGenerator = {
      generate: jest.fn().mockReturnValue('f2ad40a8-7d46-4a45-b4ec-fda33d17da8b'),
    };

    persistence = {
      registerAtomically: jest.fn(({ user }) =>
        Promise.resolve({
          kind: 'created' as const,
          result: { user },
        }),
      ),
    };

    useCase = new RegisterUseCase(passwordHasher, idGenerator, persistence);
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

    expect(passwordHasher.hash).toHaveBeenCalledWith('  Password123!  ');

    const persistenceInput = persistence.registerAtomically.mock.calls[0]?.[0];

    expect(persistenceInput).toBeDefined();
    expect(persistenceInput?.passwordHash).toBe('hashed_password_123');
    expect(persistenceInput).not.toHaveProperty('password');

    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('passwordHash');
  });
});
