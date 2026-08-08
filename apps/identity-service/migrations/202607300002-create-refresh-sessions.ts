import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshSessions1753833660000 implements MigrationInterface {
  name = 'CreateRefreshSessions1753833660000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_sessions (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        token_hash varchar(64) NOT NULL,
        family_id uuid NOT NULL,
        revoked_at timestamptz,
        revocation_reason varchar(64),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        expires_at timestamptz NOT NULL,
        CONSTRAINT uq_refresh_sessions_token_hash UNIQUE (token_hash),
        CONSTRAINT fk_refresh_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT ck_refresh_sessions_expiry CHECK (expires_at > created_at)
      );
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id ON refresh_sessions(user_id);',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_refresh_sessions_family_id ON refresh_sessions(family_id);',
    );
  }

  down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    return Promise.reject(
      new Error(
        'IDENTITY_REFRESH_SESSION_MIGRATION_FORWARD_ONLY: Down migration is disabled to prevent non-reproducible or destructive data loss on pre-existing schema boundaries.',
      ),
    );
  }
}
