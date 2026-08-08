import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityAuthSchema1753833600000 implements MigrationInterface {
  name = 'CreateIdentityAuthSchema1753833600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL,
        description varchar(255),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_roles_code UNIQUE (code)
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'description') THEN
          ALTER TABLE roles ADD COLUMN description varchar(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'created_at') THEN
          ALTER TABLE roles ADD COLUMN created_at timestamptz NOT NULL DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_roles_code') THEN
          ALTER TABLE roles ADD CONSTRAINT uq_roles_code UNIQUE (code);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        email_normalized varchar(254) NOT NULL,
        password_hash text NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE',
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_users_email_normalized UNIQUE (email_normalized),
        CONSTRAINT ck_users_email_not_blank CHECK (btrim(email_normalized) <> ''),
        CONSTRAINT ck_users_password_hash_format CHECK (password_hash LIKE '$argon2id$%'),
        CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'DISABLED')),
        CONSTRAINT ck_users_version_positive CHECK (version > 0)
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_email_normalized') THEN
          ALTER TABLE users ADD CONSTRAINT uq_users_email_normalized UNIQUE (email_normalized);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_email_not_blank') THEN
          ALTER TABLE users ADD CONSTRAINT ck_users_email_not_blank CHECK (btrim(email_normalized) <> '');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_password_hash_format') THEN
          ALTER TABLE users ADD CONSTRAINT ck_users_password_hash_format CHECK (password_hash LIKE '$argon2id$%');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_status') THEN
          ALTER TABLE users ADD CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'DISABLED'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_version_positive') THEN
          ALTER TABLE users ADD CONSTRAINT ck_users_version_positive CHECK (version > 0);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id uuid NOT NULL,
        role_id uuid NOT NULL,
        granted_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_user_roles_role_user ON user_roles (role_id, user_id);',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS registration_idempotency_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        operation varchar(32) NOT NULL,
        key_hash text NOT NULL,
        fingerprint_hash text NOT NULL,
        fingerprint_key_id varchar(100) NOT NULL,
        user_id uuid NOT NULL,
        encrypted_response text NOT NULL,
        response_key_id varchar(100) NOT NULL,
        response_nonce text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        expires_at timestamptz NOT NULL,
        CONSTRAINT uq_registration_idempotency_operation_key UNIQUE (operation, key_hash),
        CONSTRAINT fk_registration_idempotency_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT ck_registration_idempotency_expiry CHECK (expires_at > created_at)
      );
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_registration_idempotency_expires_at ON registration_idempotency_records (expires_at);',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS internal_request_nonces (
        audience varchar(50) NOT NULL,
        nonce_hash varchar(64) NOT NULL,
        request_id varchar(100) NOT NULL,
        key_id varchar(50) NOT NULL,
        issued_at timestamptz NOT NULL,
        claimed_at timestamptz NOT NULL DEFAULT NOW(),
        expires_at timestamptz NOT NULL,
        CONSTRAINT pk_internal_request_nonces PRIMARY KEY (audience, nonce_hash)
      );
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_internal_request_nonces_expires_at ON internal_request_nonces (expires_at);',
    );
  }

  down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    return Promise.reject(
      new Error(
        'IDENTITY_AUTH_SCHEMA_MIGRATION_FORWARD_ONLY: Down migration is disabled to prevent non-reproducible or destructive data loss on pre-existing schema boundaries.',
      ),
    );
  }
}
