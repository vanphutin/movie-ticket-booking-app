import { createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { NonceClaimInput } from '../../src/infrastructure/database/internal-nonce-store.adapter';
import { InternalNonceStoreAdapter } from '../../src/infrastructure/database/internal-nonce-store.adapter';
import { createIdentityDataSource } from '../../src/infrastructure/database/typeorm.config';

const TEST_DATABASE_URL =
  process.env.IDENTITY_TEST_DATABASE_URL ||
  'postgresql://movie_ticket_test:movie_ticket_test@127.0.0.1:55432/movie_ticket_test';

describe('InternalNonceStoreAdapter (Integration)', () => {
  let testDataSource: DataSource;
  let adapter: InternalNonceStoreAdapter;

  const baseInput: NonceClaimInput = {
    audience: 'identity-service',
    nonce: 'nonce_test_claim_12345',
    requestId: 'req_nonce_test_001',
    keyId: 'v1',
    issuedAtInSeconds: 1700000000,
    ttlSeconds: 300,
  };

  beforeAll(async () => {
    testDataSource = createIdentityDataSource(TEST_DATABASE_URL);
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }
    // Always recreate with full reviewed schema so stale fixtures from previous
    // sessions (which may have fewer columns) do not cause QueryFailedError.
    await testDataSource.query('DROP TABLE IF EXISTS internal_request_nonces;');
    await testDataSource.query(`
      CREATE TABLE internal_request_nonces (
        audience    varchar(50)  NOT NULL,
        nonce_hash  varchar(64)  NOT NULL,
        request_id  varchar(100) NOT NULL,
        key_id      varchar(50)  NOT NULL,
        issued_at   timestamptz  NOT NULL,
        claimed_at  timestamptz  NOT NULL DEFAULT NOW(),
        expires_at  timestamptz  NOT NULL,
        CONSTRAINT pk_internal_request_nonces PRIMARY KEY (audience, nonce_hash)
      );
    `);
    adapter = new InternalNonceStoreAdapter(testDataSource);
  });

  afterAll(async () => {
    if (testDataSource?.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.query('TRUNCATE TABLE internal_request_nonces RESTART IDENTITY CASCADE;');
  });

  it('1. FIRST_ATOMIC_NONCE_CLAIM_SUCCEEDS: First claim of a nonce succeeds and records SHA-256 hash in database with complete nonce identity', async () => {
    const claimResult = await adapter.claim(baseInput);
    expect(claimResult).toBe(true);

    const expectedHash = createHash('sha256').update(baseInput.nonce).digest('hex');
    const rows = await testDataSource.query<
      Array<{
        audience: string;
        nonce_hash: string;
        request_id: string;
        key_id: string;
        issued_at: Date;
        claimed_at: Date;
        expires_at: Date;
      }>
    >(
      'SELECT audience, nonce_hash, request_id, key_id, issued_at, claimed_at, expires_at FROM internal_request_nonces WHERE audience = $1 AND nonce_hash = $2',
      [baseInput.audience, expectedHash],
    );

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row?.audience).toBe('identity-service');
    expect(row?.nonce_hash).toBe(expectedHash);
    expect(row?.request_id).toBe('req_nonce_test_001');
    expect(row?.key_id).toBe('v1');
  });

  it('2. REPLAYED_NONCE_IS_REJECTED: Replaying a previously claimed nonce returns false and preserves single record', async () => {
    const firstClaim = await adapter.claim(baseInput);
    expect(firstClaim).toBe(true);

    const replayedClaim = await adapter.claim(baseInput);
    expect(replayedClaim).toBe(false);

    const expectedHash = createHash('sha256').update(baseInput.nonce).digest('hex');
    const countRows = await testDataSource.query<Array<{ count: string }>>(
      'SELECT COUNT(*)::text as count FROM internal_request_nonces WHERE audience = $1 AND nonce_hash = $2',
      [baseInput.audience, expectedHash],
    );
    expect(countRows).toHaveLength(1);
    expect(countRows[0]?.count).toBe('1');
  });

  it('3. CONCURRENT_DUPLICATE_HAS_AT_MOST_ONE_WINNER: Test-only Postgres trigger holds INSERT briefly, allowing independent observation of concurrent backend sessions before release — proving PK atomicity with zero production code hooks', async () => {
    const concurrentInput: NonceClaimInput = {
      ...baseInput,
      nonce: 'nonce_concurrent_contender_88888',
    };

    const contenderCount = 5;

    // Attach a test-only BEFORE INSERT trigger that delays each insert by 300ms using pg_sleep.
    // This keeps multiple PostgreSQL backend sessions inside the INSERT operation simultaneously.
    await testDataSource.query(`
      CREATE OR REPLACE FUNCTION test_nonce_insert_delay()
      RETURNS trigger AS $$
      BEGIN
        PERFORM pg_sleep(0.3);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_test_nonce_insert_delay ON internal_request_nonces;
      CREATE TRIGGER trg_test_nonce_insert_delay
        BEFORE INSERT ON internal_request_nonces
        FOR EACH ROW EXECUTE FUNCTION test_nonce_insert_delay();
    `);

    try {
      // Launch 5 concurrent claims via standard production adapter instance (zero test hooks in production code).
      const claimsPromise = Promise.all(
        Array.from({ length: contenderCount }, () => adapter.claim(concurrentInput)),
      );

      // Wait 100ms for contenders to enter the BEFORE INSERT trigger and sleep
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Observe active database sessions currently executing the INSERT query
      const activeSessions = await testDataSource.query<Array<{ count: string }>>(`
        SELECT COUNT(*)::text AS count
        FROM pg_stat_activity
        WHERE query LIKE '%INSERT INTO internal_request_nonces%'
          AND state = 'active'
          AND pid <> pg_backend_pid()
      `);

      const activeCount = parseInt(activeSessions[0]?.count || '0', 10);
      // Confirm that multiple PostgreSQL sessions were concurrently executing claim insertions
      expect(activeCount).toBeGreaterThanOrEqual(2);

      const results = await claimsPromise;

      const winners = results.filter((res) => res === true);
      const losers = results.filter((res) => res === false);

      // Verify exactly one INSERT succeeded at the DB boundary.
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(contenderCount - 1);

      // Cross-check: only one physical row exists in the database.
      const expectedHash = createHash('sha256').update(concurrentInput.nonce).digest('hex');
      const countRows = await testDataSource.query<Array<{ count: string }>>(
        'SELECT COUNT(*)::text AS count FROM internal_request_nonces WHERE audience = $1 AND nonce_hash = $2',
        [concurrentInput.audience, expectedHash],
      );
      expect(countRows[0]?.count).toBe('1');
    } finally {
      // Clean up test-only trigger and function
      await testDataSource.query(`
        DROP TRIGGER IF EXISTS trg_test_nonce_insert_delay ON internal_request_nonces;
        DROP FUNCTION IF EXISTS test_nonce_insert_delay();
      `);
    }
  });

  it('4. EXPIRED_NONCE_RETENTION_BOUNDARY_IS_EXPLICIT: Expired nonces past retention window can be reclaimed after expiration', async () => {
    const expiredInput: NonceClaimInput = {
      ...baseInput,
      nonce: 'nonce_retention_boundary_99999',
      ttlSeconds: -1,
    };

    const initialClaim = await adapter.claim(expiredInput);
    expect(initialClaim).toBe(true);

    const reclaimed = await adapter.claim({
      ...expiredInput,
      ttlSeconds: 300,
    });
    expect(reclaimed).toBe(true);
  });

  it('5. STORE_FAILURE_FAILS_CLOSED: Store query error or uninitialized connection fails closed by rejecting request', async () => {
    const closedDataSource = createIdentityDataSource(
      'postgresql://invalid:invalid@127.0.0.1:59999/invalid',
    );
    const failingAdapter = new InternalNonceStoreAdapter(closedDataSource);

    await expect(failingAdapter.claim(baseInput)).rejects.toThrow(
      'Database connection failed or store unavailable',
    );
  });
});
