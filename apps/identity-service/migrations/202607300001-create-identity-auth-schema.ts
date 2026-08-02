import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityAuthSchema1753833600000 implements MigrationInterface {
  name = 'CreateIdentityAuthSchema1753833600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(`
      CREATE TABLE roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL,
        description varchar(255),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_roles_code UNIQUE (code)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE users (
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
      )
    `);
    await queryRunner.query(`
      CREATE TABLE user_roles (
        user_id uuid NOT NULL,
        role_id uuid NOT NULL,
        granted_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_user_roles_role_user ON user_roles (role_id, user_id)',
    );
    await queryRunner.query(`
      CREATE TABLE registration_idempotency_records (
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
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_registration_idempotency_expires_at ON registration_idempotency_records (expires_at)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE registration_idempotency_records');
    await queryRunner.query('DROP INDEX idx_user_roles_role_user');
    await queryRunner.query('DROP TABLE user_roles');
    await queryRunner.query('DROP TABLE users');
    await queryRunner.query('DROP TABLE roles');
  }
}
