/**
 * Register use case orchestrating canonicalization, idempotency completed replay,
 * password hashing, domain user creation, and atomic persistence.
 */
import { createCustomerUser } from '../domain/user';
import { IdempotencyKeyConflictError, RegistrationConflictError } from './auth.errors';
import type { RegisterCommand, RegisterResult, TrustedInvocationContext } from './auth.models';
import type {
  AuthTokenPort,
  IdGenerator,
  IdempotencyCryptoPort,
  PasswordHasher,
  RefreshTokenCryptoPort,
} from './ports/auth-crypto.ports';
import type { RegistrationPersistencePort } from './ports/registration-persistence.port';

export class RegisterUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly idGenerator: IdGenerator,
    private readonly persistence: RegistrationPersistencePort,
    private readonly idempotencyCrypto: IdempotencyCryptoPort,
    private readonly refreshTokenCrypto: RefreshTokenCryptoPort,
    private readonly authToken: AuthTokenPort,
  ) {}

  async execute(
    command: RegisterCommand,
    context: TrustedInvocationContext,
  ): Promise<RegisterResult> {
    void context;
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

    const preparedRefreshToken = this.refreshTokenCrypto.prepareRefreshToken();
    const sessionId = this.idGenerator.generate();
    const token = await this.authToken.signAccessToken(customer);
    const registerResult: RegisterResult = {
      accessToken: token.accessToken,
      refreshToken: preparedRefreshToken.rawToken,
      expiresIn: token.expiresIn,
      user: customer,
    };

    const encryptedOutcome = await this.idempotencyCrypto.encryptResult(registerResult);

    const fingerprint = await this.idempotencyCrypto.fingerprint({
      email: normalizedEmail,
      password: command.password,
      displayName: normalizedDisplayName,
    });

    const persistenceResult = await this.persistence.registerAtomically({
      user: customer,
      passwordHash,
      session: { id: sessionId, tokenHash: preparedRefreshToken.tokenHash },
      result: registerResult,
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
