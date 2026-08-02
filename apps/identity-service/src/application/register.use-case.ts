/**
 * Register use case orchestrating canonicalization, idempotency completed replay,
 * password hashing, domain user creation, and atomic persistence.
 */
import { createCustomerUser } from '../domain/user';
import { IdempotencyKeyConflictError, RegistrationConflictError } from './auth.errors';
import type { RegisterCommand, RegisterResult } from './auth.models';
import type { IdGenerator, IdempotencyCryptoPort, PasswordHasher } from './ports/auth-crypto.ports';
import type { RegistrationPersistencePort } from './ports/registration-persistence.port';

export class RegisterUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly idGenerator: IdGenerator,
    private readonly persistence: RegistrationPersistencePort,
    private readonly idempotencyCrypto: IdempotencyCryptoPort,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const normalizedEmail = command.email.trim().toLowerCase();
    const normalizedDisplayName = command.displayName.trim();

    const keyHash = this.idempotencyCrypto.hashKey(command.idempotencyKey);

    const record = await this.persistence.findCompletedByKey('REGISTER', keyHash);

    if (record) {
      const computedFingerprint = await this.idempotencyCrypto.fingerprint(
        {
          email: normalizedEmail,
          password: command.password,
          displayName: normalizedDisplayName,
        },
        record.fingerprintKeyId,
      );

      if (computedFingerprint.hash !== record.fingerprintHash) {
        throw new IdempotencyKeyConflictError();
      }

      return this.idempotencyCrypto.decryptResult(record);
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    const customer = createCustomerUser({
      id: this.idGenerator.generate(),
      email: normalizedEmail,
      displayName: normalizedDisplayName,
    });

    const registerResult: RegisterResult = { user: customer };

    const encryptedOutcome = await this.idempotencyCrypto.encryptResult(registerResult);

    const fingerprint = await this.idempotencyCrypto.fingerprint({
      email: normalizedEmail,
      password: command.password,
      displayName: normalizedDisplayName,
    });

    const persistenceResult = await this.persistence.registerAtomically({
      user: customer,
      passwordHash,
      idempotencyRecord: {
        keyHash,
        fingerprintHash: fingerprint.hash,
        fingerprintKeyId: fingerprint.keyId,
        ...encryptedOutcome,
      },
    });

    if (persistenceResult.kind === 'email_already_exists') {
      throw new RegistrationConflictError();
    }

    if (persistenceResult.kind === 'idempotency_key_exists') {
      const winnerRecord = await this.persistence.findCompletedByKey('REGISTER', keyHash);

      if (!winnerRecord) {
        throw new IdempotencyKeyConflictError();
      }

      const winnerFingerprint = await this.idempotencyCrypto.fingerprint(
        {
          email: normalizedEmail,
          password: command.password,
          displayName: normalizedDisplayName,
        },
        winnerRecord.fingerprintKeyId,
      );

      if (winnerFingerprint.hash !== winnerRecord.fingerprintHash) {
        throw new IdempotencyKeyConflictError();
      }

      return this.idempotencyCrypto.decryptResult(winnerRecord);
    }

    return persistenceResult.result;
  }
}
