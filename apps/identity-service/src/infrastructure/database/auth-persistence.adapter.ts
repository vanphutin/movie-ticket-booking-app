import { createHash, randomUUID } from 'node:crypto';
import { QueryFailedError } from 'typeorm';
import type { DataSource } from 'typeorm';

import type {
  CompletedRegistrationRecord,
  RegisterAtomicallyInput,
  RegisterAtomicallyResult,
  RegistrationPersistencePort,
} from '../../application/ports/registration-persistence.port';
import type {
  CredentialRecord,
  CredentialReaderPort,
  LoginSessionPort,
  LoginSessionResult,
} from '../../application/ports/login-session.port';
import type { CustomerUser } from '../../domain/user';

export class AuthPersistenceAdapter
  implements RegistrationPersistencePort, CredentialReaderPort, LoginSessionPort
{
  constructor(private readonly dataSource: DataSource) {}

  async findCompletedByKey(
    operation: 'REGISTER',
    keyHash: string,
  ): Promise<CompletedRegistrationRecord | null> {
    const rows = await this.dataSource.query<CompletedRegistrationRecord[]>(
      `SELECT fingerprint_hash AS "fingerprintHash", fingerprint_key_id AS "fingerprintKeyId",
              encrypted_response AS "encryptedResponse", response_key_id AS "responseKeyId",
              response_nonce AS "responseNonce"
       FROM registration_idempotency_records
       WHERE operation = $1 AND key_hash = $2 AND expires_at > NOW()`,
      [operation, keyHash],
    );
    return rows[0] ?? null;
  }

  async registerAtomically(input: RegisterAtomicallyInput): Promise<RegisterAtomicallyResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO users (id, email_normalized, password_hash, status, version)
           VALUES ($1, $2, $3, 'ACTIVE', 1)`,
          [input.user.id, input.user.email, input.passwordHash],
        );
        const roles = await manager.query<{ id: string }[]>(
          `SELECT id FROM roles WHERE code = 'CUSTOMER'`,
        );
        const customerRole = roles[0];
        if (!customerRole) throw new Error('CUSTOMER_ROLE_NOT_SEEDED');
        await manager.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
          input.user.id,
          customerRole.id,
        ]);
        await manager.query(
          `INSERT INTO registration_idempotency_records
           (operation, key_hash, fingerprint_hash, fingerprint_key_id, user_id, encrypted_response, response_key_id, response_nonce, expires_at)
           VALUES ('REGISTER', $1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '24 hours')`,
          [
            input.idempotencyRecord.keyHash,
            input.idempotencyRecord.fingerprintHash,
            input.idempotencyRecord.fingerprintKeyId,
            input.user.id,
            input.idempotencyRecord.encryptedResponse,
            input.idempotencyRecord.responseKeyId,
            input.idempotencyRecord.responseNonce,
          ],
        );
        return { kind: 'created', result: { user: input.user } };
      });
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        error.message.includes('uq_registration_idempotency_operation_key')
      )
        return { kind: 'idempotency_key_exists' };
      if (error instanceof QueryFailedError && error.message.includes('uq_users_email_normalized'))
        return { kind: 'email_already_exists' };
      throw error;
    }
  }

  async findCredentialByEmail(email: string): Promise<CredentialRecord | null> {
    const result = await this.dataSource.query<
      Array<{ user_id: string; email: string; password_hash: string; status: string }>
    >(
      `SELECT id AS user_id, email_normalized AS email, password_hash, status
       FROM users
       WHERE email_normalized = $1;`,
      [email.trim().toLowerCase()],
    );
    const row = result[0];
    if (!row) return null;
    return {
      user: {
        id: row.user_id,
        email: row.email,
        displayName: row.email,
        roles: ['CUSTOMER'],
      },
      passwordHash: row.password_hash,
      status: row.status as 'ACTIVE' | 'DISABLED',
    };
  }

  async issueForActiveUserAtomically(user: CustomerUser): Promise<LoginSessionResult | null> {
    const userId = user.id;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userRows = (await queryRunner.query(
        `SELECT id, email_normalized AS email
         FROM users
         WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE;`,
        [userId],
      )) as Array<{ id: string; email: string }>;
      const userRow = userRows[0];
      if (!userRow) {
        await queryRunner.rollbackTransaction();
        return null;
      }

      const sessionId = randomUUID();
      const rawRefreshToken = randomUUID();
      const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');

      await queryRunner.query(
        `INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, created_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days');`,
        [sessionId, userId, tokenHash, sessionId],
      );
      await queryRunner.commitTransaction();

      return {
        refreshToken: rawRefreshToken,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
