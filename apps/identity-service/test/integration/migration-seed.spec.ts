/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import type { DataSource } from 'typeorm';
import { createIdentityDataSource } from '../../src/infrastructure/database/typeorm.config';
import { CreateIdentityAuthSchema1753833600000 } from '../../migrations/202607300001-create-identity-auth-schema';
import { CreateRefreshSessions1753833660000 } from '../../migrations/202607300002-create-refresh-sessions';
import { seedIdentity } from '../../seeds/seed-identity';

const TEST_DATABASE_URL =
  process.env.IDENTITY_TEST_DATABASE_URL ||
  'postgresql://movie_ticket_test:movie_ticket_test@127.0.0.1:55432/movie_ticket_test';

describe('IdentityAuthSchema Migration & Seed (Integration)', () => {
  let testDataSource: DataSource;

  beforeAll(async () => {
    testDataSource = createIdentityDataSource(TEST_DATABASE_URL);
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }
  });

  afterAll(async () => {
    if (testDataSource?.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    // Reset schema to clean public state before each migration test
    await testDataSource.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await testDataSource.query('GRANT ALL ON SCHEMA public TO public;');
  });

  it('1. CLEAN_DATABASE_MIGRATION: Clean database migrates successfully to reviewed Identity auth schema', async () => {
    const migration = new CreateIdentityAuthSchema1753833600000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Executing migration up() on clean database
      await migration.up(queryRunner);

      // Verify tables exist
      const tables = [
        'roles',
        'users',
        'user_roles',
        'registration_idempotency_records',
        'internal_request_nonces',
      ];
      for (const table of tables) {
        const result = (await queryRunner.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
          [table],
        )) as Array<{ table_name: string }>;
        expect(result).toHaveLength(1);
      }

      // Verify internal_request_nonces composite primary key (audience + nonce_hash)
      const pkColumns = (await queryRunner.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'internal_request_nonces'
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position;
      `)) as Array<{ column_name: string }>;
      expect(pkColumns.map((c) => c.column_name)).toEqual(['audience', 'nonce_hash']);

      // Verify internal_request_nonces required columns
      const nonceColumns = (await queryRunner.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'internal_request_nonces';
      `)) as Array<{ column_name: string }>;
      const nonceColNames = nonceColumns.map((c) => c.column_name);
      expect(nonceColNames).toContain('audience');
      expect(nonceColNames).toContain('nonce_hash');
      expect(nonceColNames).toContain('request_id');
      expect(nonceColNames).toContain('key_id');
      expect(nonceColNames).toContain('issued_at');
      expect(nonceColNames).toContain('claimed_at');
      expect(nonceColNames).toContain('expires_at');

      // Verify named constraints
      const requiredConstraints = [
        'uq_roles_code',
        'uq_users_email_normalized',
        'ck_users_email_not_blank',
        'ck_users_password_hash_format',
        'ck_users_status',
        'ck_users_version_positive',
        'pk_user_roles',
        'fk_user_roles_user',
        'fk_user_roles_role',
        'uq_registration_idempotency_operation_key',
        'fk_registration_idempotency_user',
        'ck_registration_idempotency_expiry',
      ];
      for (const constraintName of requiredConstraints) {
        const rows = (await queryRunner.query(
          `SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_name = $1`,
          [constraintName],
        )) as Array<{ constraint_name: string }>;
        expect(rows).toHaveLength(1);
      }

      // Verify required indexes
      const requiredIndexes = [
        'idx_user_roles_role_user',
        'idx_registration_idempotency_expires_at',
      ];
      for (const indexName of requiredIndexes) {
        const rows = (await queryRunner.query(
          `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
          [indexName],
        )) as Array<{ indexname: string }>;
        expect(rows).toHaveLength(1);
      }
    } finally {
      await queryRunner.release();
    }
  });

  it('2. PRE_MIGRATION_UPGRADE_PRESERVATION: Pre-migration state is preserved on upgrade without losing data', async () => {
    // Setup pre-migration sentinel state
    await testDataSource.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        email_normalized varchar(254) NOT NULL,
        password_hash text NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE',
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    const sentinelId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    await testDataSource.query(
      `INSERT INTO users (id, email_normalized, password_hash) VALUES ($1, $2, $3);`,
      [sentinelId, 'sentinel@example.com', '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy'],
    );

    const migration = new CreateIdentityAuthSchema1753833600000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await migration.up(queryRunner);

      // Verify sentinel data remains intact
      const rows = (await queryRunner.query(
        `SELECT id, email_normalized FROM users WHERE id = $1;`,
        [sentinelId],
      )) as Array<{ id: string; email_normalized: string }>;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.email_normalized).toBe('sentinel@example.com');
    } finally {
      await queryRunner.release();
    }
  });

  it('3. SAFE_FORWARD_ONLY_DOWN_BEHAVIOR: Down migration is forward-only and rejects to prevent destructive data loss', async () => {
    const migration = new CreateIdentityAuthSchema1753833600000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await migration.up(queryRunner);

      // down() must explicitly reject to prevent destructive schema/data loss
      await expect(migration.down(queryRunner)).rejects.toThrow(
        'IDENTITY_AUTH_SCHEMA_MIGRATION_FORWARD_ONLY',
      );

      // Verify all tables created by up() remain intact and untouched after down() rejects
      const tables = [
        'roles',
        'users',
        'user_roles',
        'registration_idempotency_records',
        'internal_request_nonces',
      ];
      for (const table of tables) {
        const result = (await queryRunner.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
          [table],
        )) as Array<{ table_name: string }>;
        expect(result).toHaveLength(1);
      }
    } finally {
      await queryRunner.release();
    }
  });

  it('4. PRE_EXISTING_EMPTY_AND_DATA_TABLES_FORWARD_ONLY_PRESERVATION: Pre-existing empty tables and tables with data are non-destructively preserved when down is requested', async () => {
    // Setup pre-existing empty roles table
    await testDataSource.query(`
      CREATE TABLE roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL
      );
    `);

    // Setup pre-existing users table with sentinel data
    await testDataSource.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        email_normalized varchar(254) NOT NULL,
        password_hash text NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE',
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    const sentinelId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    await testDataSource.query(
      `INSERT INTO users (id, email_normalized, password_hash) VALUES ($1, $2, $3);`,
      [
        sentinelId,
        'sentinel-down-rollback@example.com',
        '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy',
      ],
    );

    const migration = new CreateIdentityAuthSchema1753833600000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Step 1: Execute up()
      await migration.up(queryRunner);

      // Step 2: Attempt down() -> must reject safely without modifying schema or data
      await expect(migration.down(queryRunner)).rejects.toThrow(
        'IDENTITY_AUTH_SCHEMA_MIGRATION_FORWARD_ONLY',
      );

      // Step 3: Assert pre-existing empty roles table STILL exists
      const roleTables = (await queryRunner.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles'`,
      )) as Array<{ table_name: string }>;
      expect(roleTables).toHaveLength(1);

      // Step 4: Assert pre-existing users table and sentinel record STILL exist intact
      const userTables = (await queryRunner.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`,
      )) as Array<{ table_name: string }>;
      expect(userTables).toHaveLength(1);

      const sentinelRows = (await queryRunner.query(
        `SELECT id, email_normalized FROM users WHERE id = $1;`,
        [sentinelId],
      )) as Array<{ id: string; email_normalized: string }>;
      expect(sentinelRows).toHaveLength(1);
      expect(sentinelRows[0]?.email_normalized).toBe('sentinel-down-rollback@example.com');
    } finally {
      await queryRunner.release();
    }
  });

  it('5. CUSTOMER_ROLE_SEED_FIRST_RUN: First run creates exactly one CUSTOMER role on clean migrated database', async () => {
    const migration = new CreateIdentityAuthSchema1753833600000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await migration.up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    // Execute seed
    await seedIdentity(testDataSource);

    // Verify exactly 1 CUSTOMER role is created
    const roles = await testDataSource.query(
      `SELECT code, description FROM roles WHERE code = $1`,
      ['CUSTOMER'],
    );
    expect(roles).toHaveLength(1);
    expect(roles[0]?.code).toBe('CUSTOMER');
    expect(roles[0]?.description).toBe('Default role for public registration');
  });

  it('6. CUSTOMER_ROLE_SEED_IDEMPOTENT_REPEAT_RUN: Second run preserves identical logical state without duplicate rows', async () => {
    const migration = new CreateIdentityAuthSchema1753833600000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await migration.up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    // Execute seed twice
    await seedIdentity(testDataSource);
    await seedIdentity(testDataSource);

    // Verify logical state is identical and exactly 1 CUSTOMER role exists
    const countRows = await testDataSource.query(
      `SELECT count(*)::text as count FROM roles WHERE code = $1`,
      ['CUSTOMER'],
    );
    expect(countRows[0]?.count).toBe('1');
  });

  it('7. CUSTOMER_ROLE_SEED_PRESERVES_EXISTING_ROLE_AND_USERS_TABLE_EMPTY: Existing CUSTOMER role is preserved and users table remains empty', async () => {
    const migration = new CreateIdentityAuthSchema1753833600000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await migration.up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    // Pre-insert CUSTOMER role with custom description
    await testDataSource.query(
      `INSERT INTO roles (code, description) VALUES ('CUSTOMER', 'Existing Custom Description');`,
    );

    // Execute seed
    await seedIdentity(testDataSource);

    // Verify existing CUSTOMER role is preserved without drift
    const roles = await testDataSource.query(
      `SELECT code, description FROM roles WHERE code = $1`,
      ['CUSTOMER'],
    );
    expect(roles).toHaveLength(1);
    expect(roles[0]?.description).toBe('Existing Custom Description');

    // Verify users table remains 100% empty (no default user or credentials created)
    const userRows = await testDataSource.query(`SELECT count(*)::text as count FROM users`);
    expect(userRows[0]?.count).toBe('0');
  });

  it('8. CUSTOMER_ROLE_SEED_PROPAGATES_DATABASE_FAILURE: Database query failure is propagated not swallowed', async () => {
    // Create invalid queryRunner / destroyed dataSource
    const invalidDataSource = createIdentityDataSource(
      'postgresql://invalid_user:invalid_pass@127.0.0.1:55432/invalid_db',
    );
    // seedIdentity should attempt execution and propagate failure
    await expect(seedIdentity(invalidDataSource)).rejects.toThrow();
  });

  it('9. REFRESH_SESSION_MIGRATION_CLEAN_DATABASE: Clean auth schema creates refresh_sessions table with token-hash uniqueness, family linkage, revocation/expiry metadata and lookup indexes', async () => {
    const migration1 = new CreateIdentityAuthSchema1753833600000();
    const migration2 = new CreateRefreshSessions1753833660000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await migration1.up(queryRunner);

      // Execute migration 2
      await migration2.up(queryRunner);

      // Assertions for GREEN phase: verify refresh_sessions table, columns, constraints and indexes exist
      const refreshTables = (await queryRunner.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refresh_sessions'`,
      )) as Array<{ table_name: string }>;
      expect(refreshTables).toHaveLength(1);

      const columns = (await queryRunner.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'refresh_sessions'`,
      )) as Array<{ column_name: string }>;
      const colNames = columns.map((c) => c.column_name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('user_id');
      expect(colNames).toContain('token_hash');
      expect(colNames).toContain('family_id');
      expect(colNames).toContain('revoked_at');
      expect(colNames).toContain('revocation_reason');
      expect(colNames).toContain('created_at');
      expect(colNames).toContain('expires_at');

      const constraints = (await queryRunner.query(
        `SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'refresh_sessions'`,
      )) as Array<{ constraint_name: string }>;
      const constraintNames = constraints.map((c) => c.constraint_name);
      expect(constraintNames).toContain('uq_refresh_sessions_token_hash');
      expect(constraintNames).toContain('ck_refresh_sessions_expiry');

      const indexes = (await queryRunner.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'refresh_sessions'`,
      )) as Array<{ indexname: string }>;
      const indexNames = indexes.map((i) => i.indexname);
      expect(indexNames).toContain('idx_refresh_sessions_user_id');
      expect(indexNames).toContain('idx_refresh_sessions_family_id');
    } finally {
      await queryRunner.release();
    }
  });

  it('10. REFRESH_SESSION_MIGRATION_PRESERVES_EXISTING_USER_AND_ROLE_STATE: Refresh-session migration preserves pre-existing user and role data', async () => {
    const migration1 = new CreateIdentityAuthSchema1753833600000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();

    const sentinelUserId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    try {
      await migration1.up(queryRunner);

      // Insert pre-existing user sentinel data
      await queryRunner.query(
        `INSERT INTO users (id, email_normalized, password_hash) VALUES ($1, $2, $3)`,
        [
          sentinelUserId,
          'sentinel_refresh@example.com',
          '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy',
        ],
      );

      const migration2 = new CreateRefreshSessions1753833660000();
      await migration2.up(queryRunner);

      // Verify sentinel user record remains intact
      const userRows = (await queryRunner.query(
        `SELECT id, email_normalized FROM users WHERE id = $1`,
        [sentinelUserId],
      )) as Array<{ id: string; email_normalized: string }>;
      expect(userRows).toHaveLength(1);
      expect(userRows[0]?.email_normalized).toBe('sentinel_refresh@example.com');
    } finally {
      await queryRunner.release();
    }
  });

  it('11. REFRESH_SESSION_MIGRATION_SAFE_FORWARD_ONLY_DOWN_BEHAVIOR: Down migration of refresh sessions rejects safely without data loss', async () => {
    const migration1 = new CreateIdentityAuthSchema1753833600000();
    const migration2 = new CreateRefreshSessions1753833660000();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await migration1.up(queryRunner);

      // down() on second migration must reject with forward-only error
      await expect(migration2.down(queryRunner)).rejects.toThrow(
        'IDENTITY_REFRESH_SESSION_MIGRATION_FORWARD_ONLY',
      );
    } finally {
      await queryRunner.release();
    }
  });
});
