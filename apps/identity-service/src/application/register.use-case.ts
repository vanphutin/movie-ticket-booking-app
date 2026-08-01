import { createCustomerUser } from '../domain/user';
import type { RegisterCommand, RegisterResult } from './auth.models';
import type { IdGenerator, PasswordHasher } from './ports/auth-crypto.ports';
import type { RegistrationPersistencePort } from './ports/registration-persistence.port';

export class RegisterUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly idGenerator: IdGenerator,
    private readonly persistence: RegistrationPersistencePort,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const normalizedEmail = command.email.trim().toLowerCase();

    // Preserve password bytes; only identifier fields are canonicalized.
    const passwordHash = await this.passwordHasher.hash(command.password);

    const customer = createCustomerUser({
      id: this.idGenerator.generate(),
      email: normalizedEmail,
      displayName: command.displayName.trim(),
    });

    const persistenceResult = await this.persistence.registerAtomically({
      user: customer,
      passwordHash,
    });

    return persistenceResult.result;
  }
}
