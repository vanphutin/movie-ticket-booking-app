/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createHash, randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { AuthPersistenceAdapter } from '../../src/infrastructure/database/auth-persistence.adapter';
import { createIdentityDataSource } from '../../src/infrastructure/database/typeorm.config';
import { CreateIdentityAuthSchema1753833600000 } from '../../migrations/202607300001-create-identity-auth-schema';
import { CreateRefreshSessions1753833660000 } from '../../migrations/202607300002-create-refresh-sessions';

const TEST_DATABASE_URL =
  process.env.IDENTITY_TEST_DATABASE_URL ||
  'postgresql://movie_ticket_test:movie_ticket_test@127.0.0.1:55432/movie_ticket_test';

interface PostgresActivityRow {
  readonly state: string;
  readonly wait_event_type: string | null;
  readonly wait_event: string | null;
}

async function observePostgresLockContention(
  dataSource: DataSource,
  maxWaitMs: number = 1000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // Query active non-idle backend sessions querying refresh_sessions or FOR UPDATE
    const rows: PostgresActivityRow[] = await dataSource.query(`
      SELECT pid, state, wait_event_type, wait_event, query
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
        AND state != 'idle'
        AND (query LIKE '%refresh_sessions%' OR query LIKE '%FOR UPDATE%')
    `);

    // Session explicitly waiting for PostgreSQL lock
    const lockWaitSessions = rows.filter(
      (r) =>
        r.wait_event_type === 'Lock' ||
        r.wait_event === 'relation' ||
        r.wait_event === 'tuple' ||
        r.wait_event === 'transactionid',
    );

    // Sessions actively executing SQL (state = 'active')
    const activeSessions = rows.filter((r) => r.state === 'active');

    // Rigorous concurrency proof:
    // Requires at least one session explicitly waiting on PostgreSQL Lock
    // OR at least two distinct backend sessions simultaneously in state = 'active'.
    if (lockWaitSessions.length >= 1 || activeSessions.length >= 2) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return false;
}

describe('RefreshSession Rotation Concurrency (Integration)', () => {
  let mainDataSource: DataSource;
  let adapter1: AuthPersistenceAdapter;
  let adapter2: AuthPersistenceAdapter;

  beforeAll(async () => {
    mainDataSource = createIdentityDataSource(TEST_DATABASE_URL);
    if (!mainDataSource.isInitialized) {
      await mainDataSource.initialize();
    }

    const migration1 = new CreateIdentityAuthSchema1753833600000();
    const migration2 = new CreateRefreshSessions1753833660000();
    const queryRunner = mainDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await migration1.up(queryRunner);
      await migration2.up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    adapter1 = new AuthPersistenceAdapter(mainDataSource);
    adapter2 = new AuthPersistenceAdapter(mainDataSource);
  });

  afterAll(async () => {
    if (mainDataSource?.isInitialized) {
      await mainDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await mainDataSource.query('TRUNCATE TABLE refresh_sessions CASCADE;');
    await mainDataSource.query('TRUNCATE TABLE users CASCADE;');
  });

  it('1. DETERMINISTIC_REFRESH_ROTATION_CONCURRENCY: Two overlapping PostgreSQL transactions contending for same refresh token yield exactly one rotation, one replay detection, and no active successor', async () => {
    // Step 1: Install test-only PostgreSQL synchronization trigger to ensure deterministic lock overlap window
    await mainDataSource.query(`
      CREATE OR REPLACE FUNCTION test_refresh_lock_delay_fn()
      RETURNS trigger AS $$
      BEGIN
        PERFORM pg_sleep(0.15);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_test_refresh_lock_delay ON refresh_sessions;
      CREATE TRIGGER trg_test_refresh_lock_delay
      BEFORE UPDATE ON refresh_sessions
      FOR EACH ROW EXECUTE FUNCTION test_refresh_lock_delay_fn();
    `);

    try {
      // Step 2: Create active user and initial refresh session in PostgreSQL
      const userId = randomUUID();
      const email = 'concurrency-user@example.com';
      await mainDataSource.query(
        `INSERT INTO users (id, email_normalized, password_hash, status) VALUES ($1, $2, $3, 'ACTIVE')`,
        [userId, email, '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy'],
      );

      const initialSessionId = randomUUID();
      const initialRawToken = randomUUID();
      const initialTokenHash = createHash('sha256').update(initialRawToken).digest('hex');

      await mainDataSource.query(
        `INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, created_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days')`,
        [initialSessionId, userId, initialTokenHash, initialSessionId],
      );

      // Step 3: Launch concurrent rotation requests and lock observation in parallel
      const rotate1 = adapter1.rotateSessionAtomically({
        oldTokenHash: initialTokenHash,
        nextSessionId: randomUUID(),
        nextTokenHash: createHash('sha256').update(randomUUID()).digest('hex'),
      });

      const rotate2 = adapter2.rotateSessionAtomically({
        oldTokenHash: initialTokenHash,
        nextSessionId: randomUUID(),
        nextTokenHash: createHash('sha256').update(randomUUID()).digest('hex'),
      });

      const observer = observePostgresLockContention(mainDataSource, 800);

      const [res1, res2, lockOverlapObserved] = await Promise.all([rotate1, rotate2, observer]);

      // Assert lock contention overlap was observed at PostgreSQL database boundary
      expect(lockOverlapObserved).toBe(true);

      // Assert exactly one rotation success and one replay detection/revocation
      const outcomes = [res1.kind, res2.kind];
      expect(outcomes).toContain('success');
      expect(outcomes.some((k) => k === 'replay_detected' || k === 'session_revoked')).toBe(true);

      // Assert final family state in database has no active unrevoked successor
      const unrevokedSessions = await mainDataSource.query(
        `SELECT id FROM refresh_sessions WHERE family_id = $1 AND revoked_at IS NULL`,
        [initialSessionId],
      );
      expect(unrevokedSessions).toHaveLength(0);
    } finally {
      // Step 4: Clean up test-only synchronization trigger and function
      await mainDataSource.query(`
        DROP TRIGGER IF EXISTS trg_test_refresh_lock_delay ON refresh_sessions;
        DROP FUNCTION IF EXISTS test_refresh_lock_delay_fn();
      `);
    }
  });
});
