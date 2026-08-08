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
import type {
  RefreshRotationResult,
  RefreshSessionRotationPort,
  RotateSessionInput,
} from '../../application/ports/refresh-session-rotation.port';
import type {
  LogoutSessionPort,
  LogoutSessionResult,
} from '../../application/ports/logout-session.port';
import type { ProfileReaderPort, UserProfile } from '../../application/ports/profile-reader.port';

export class AuthPersistenceAdapter
  implements
    RegistrationPersistencePort,
    CredentialReaderPort,
    LoginSessionPort,
    RefreshSessionRotationPort,
    LogoutSessionPort,
    ProfileReaderPort
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
          `INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, created_at, expires_at)
           VALUES ($1, $2, $3, $1, NOW(), NOW() + INTERVAL '30 days')`,
          [input.session.id, input.user.id, input.session.tokenHash],
        );
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
        return { kind: 'created', result: input.result };
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

  async rotateSessionAtomically(input: RotateSessionInput): Promise<RefreshRotationResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rows = (await queryRunner.query(
        `SELECT s.id AS session_id, s.user_id, s.family_id, s.revoked_at, s.revocation_reason,
              s.expires_at <= NOW() AS is_expired,
              u.email_normalized AS email, u.status AS user_status
       FROM refresh_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1
        FOR UPDATE OF s, u;`,
        [input.oldTokenHash],
      )) as Array<{
        session_id: string;
        user_id: string;
        family_id: string;
        revoked_at: Date | null;
        is_expired: boolean;
        email: string;
        user_status: string;
        revocation_reason: string | null;
      }>;

      const currentSession = rows[0];
      if (!currentSession) {
        await queryRunner.commitTransaction();
        return { kind: 'session_not_found' };
      }

      if (currentSession.revoked_at !== null && currentSession.revocation_reason === 'ROTATED') {
        await queryRunner.query(
          `SELECT id
           FROM refresh_sessions
           WHERE family_id = $1
           ORDER BY id
           FOR UPDATE`,
          [currentSession.family_id],
        );
        await queryRunner.query(
          `UPDATE refresh_sessions
           SET revoked_at = NOW(), revocation_reason = 'REUSE_DETECTED'
           WHERE family_id = $1 AND revoked_at IS NULL`,
          [currentSession.family_id],
        );
        await queryRunner.commitTransaction();
        return {
          kind: 'replay_detected',
          familyId: currentSession.family_id,
        };
      }

      if (
        currentSession.revoked_at !== null ||
        currentSession.is_expired ||
        currentSession.user_status !== 'ACTIVE'
      ) {
        await queryRunner.commitTransaction();
        return { kind: 'session_revoked' };
      }

      await queryRunner.query(
        `UPDATE refresh_sessions
         SET revoked_at = NOW(), revocation_reason = 'ROTATED'
         WHERE id = $1`,
        [currentSession.session_id],
      );

      await queryRunner.query(
        `INSERT INTO refresh_sessions
           (id, user_id, token_hash, family_id, created_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days')`,
        [
          input.nextSessionId,
          currentSession.user_id,
          input.nextTokenHash,
          currentSession.family_id,
        ],
      );

      await queryRunner.commitTransaction();
      return {
        kind: 'success',
        user: {
          id: currentSession.user_id,
          email: currentSession.email,
          displayName: currentSession.email,
          roles: ['CUSTOMER'],
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async revokeFamilyAtomically(input: { tokenHash: string }): Promise<LogoutSessionResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const rows = (await queryRunner.query(
        `SELECT id, family_id, revoked_at,
                expires_at <= NOW() AS is_expired
         FROM refresh_sessions
         WHERE token_hash = $1
         FOR UPDATE;`,
        [input.tokenHash],
      )) as Array<{
        id: string;
        family_id: string;
        revoked_at: Date | null;
        is_expired: boolean;
      }>;

      const session = rows[0];
      if (!session) {
        await queryRunner.rollbackTransaction();
        return { kind: 'session_not_found' };
      }

      if (session.revoked_at !== null) {
        await queryRunner.rollbackTransaction();
        return { kind: 'already_revoked' };
      }

      if (session.is_expired) {
        await queryRunner.rollbackTransaction();
        return { kind: 'expired' };
      }

      await queryRunner.query(
        `SELECT id
         FROM refresh_sessions
         WHERE family_id = $1
         ORDER BY id
         FOR UPDATE;`,
        [session.family_id],
      );

      await queryRunner.query(
        `UPDATE refresh_sessions
         SET revoked_at = NOW(), revocation_reason = 'LOGOUT'
         WHERE family_id = $1 AND revoked_at IS NULL;`,
        [session.family_id],
      );

      await queryRunner.commitTransaction();
      return { kind: 'success' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findProfileById(actorId: string): Promise<UserProfile | null> {
    const rows = await this.dataSource.query<
      {
        id: string;
        email: string;
        displayName: string;
        roles: string[];
      }[]
    >(
      `
       SELECT
  u.id AS "id",
  u.email_normalized AS "email",
  u.email_normalized AS "displayName",
  COALESCE(ARRAY_AGG(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS "roles"
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.id = $1 AND u.status = 'ACTIVE'
GROUP BY u.id;
      `,
      [actorId],
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          email: row.email,
          displayName: row.displayName,
          roles: row.roles,
        }
      : null;
  }
}
