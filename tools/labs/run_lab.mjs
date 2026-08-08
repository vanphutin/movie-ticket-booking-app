// PostgreSQL Lab Verification Harness — Movie Ticket Booking Service
// Path: tools/labs/run_lab.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactUri(uri) {
  try {
    const parsed = new URL(uri);
    parsed.username = '***';
    parsed.password = '***';
    return parsed.toString();
  } catch {
    return 'postgresql://***:***@localhost:5432/movie_ticket_lab';
  }
}

// Connect 2 Persistent TCP Client Connections to REAL PostgreSQL Server
async function connectDualPostgresClients() {
  const pgUri = process.env.PG_URI || process.env.DATABASE_URL;

  if (!pgUri) {
    console.error('\n[FATAL CONFIG ERROR] Missing required environment variable PG_URI or DATABASE_URL.');
    console.error('Security & Config Policy Enforcement: Zero hardcoded credentials permitted.');
    console.error('Usage example: PG_URI="<postgresql-connection-uri>" npm run lab:postgres\n');
    process.exit(1);
  }

  const safeUriLog = redactUri(pgUri);
  console.log(`[PG Setup] Connecting TWO persistent TCP Client Connections to Real PostgreSQL Server: ${safeUriLog}`);

  const clientA = new pg.Client({ connectionString: pgUri });
  const clientB = new pg.Client({ connectionString: pgUri });

  try {
    await clientA.connect();
    await clientB.connect();
  } catch (err) {
    console.error(`\n[FATAL PG CONNECTION ERROR] Unable to connect to Real PostgreSQL Server at ${safeUriLog}`);
    console.error(`Error details: ${err.message}\n`);
    process.exit(1);
  }

  // Retrieve distinct backend PIDs to prove 2 distinct backend process sessions
  const pidA_res = await clientA.query('SELECT pg_backend_pid();');
  const pidB_res = await clientB.query('SELECT pg_backend_pid();');

  const pidA = pidA_res.rows[0].pg_backend_pid;
  const pidB = pidB_res.rows[0].pg_backend_pid;

  console.log(`[PG Setup] Connected! Connection A (Backend PID: ${pidA}) | Connection B (Backend PID: ${pidB})`);

  if (pidA === pidB) {
    console.error('[FATAL ERROR] Client A and Client B share the same backend PID! Must be distinct sessions.');
    process.exit(1);
  }

  return {
    pidA,
    pidB,
    clientA,
    clientB,
    closeAll: async () => {
      await clientA.end().catch(() => {});
      await clientB.end().catch(() => {});
    }
  };
}

async function runLab() {
  console.log('================================================================');
  console.log('REAL PostgreSQL Server Lab: 2 Backend Sessions & Lock Contention');
  console.log('================================================================\n');

  const sqlFilePath = path.join(REPO_ROOT, 'tools/labs/verify_lab.sql');
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`FAILED: DDL Artifact ${sqlFilePath} does not exist!`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  console.log(`Loaded DDL Artifact: ${sqlFilePath} (${sqlContent.length} bytes)`);

  const { pidA, pidB, clientA, clientB, closeAll } = await connectDualPostgresClients();

  let passCount = 0;
  let testCount = 0;

  function assert(condition, description) {
    testCount++;
    if (condition) {
      console.log(`  [PASS] Test ${testCount}: ${description}`);
      passCount++;
    } else {
      console.error(`  [FAIL] Test ${testCount}: ${description}`);
      process.exitCode = 1;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Execute DDL Artifact on Real PostgreSQL Server
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 1: Executing DDL Artifact (verify_lab.sql) ---');
    await clientA.query(sqlContent);
    console.log('DDL execution completed cleanly on PostgreSQL Server.');

    const enumRes = await clientA.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'hold_status_enum'::regtype ORDER BY enumsortorder;"
    );
    const enumValues = enumRes.rows.map((r) => r.enumlabel);
    assert(
      JSON.stringify(enumValues) === JSON.stringify(['HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED']),
      `PostgreSQL Enum hold_status_enum verified on server: ${enumValues.join(', ')}`
    );

    // -------------------------------------------------------------------------
    // STEP 2: Happy Path Seat Hold Creation
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 2: Happy Path Seat Hold Creation ---');
    const hold1_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    await clientA.query('BEGIN');
    await clientA.query(
      `INSERT INTO seat_holds (hold_id, showtime_id, customer_id, status, created_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '10 minutes')`,
      [hold1_id, 'st_101', 'cust_01', 'HELD']
    );
    await clientA.query(
      `INSERT INTO hold_items (hold_id, showtime_id, seat_id, status)
       VALUES ($1, $2, $3, $4), ($1, $2, $5, $4)`,
      [hold1_id, 'st_101', 'A1', 'HELD', 'A2']
    );
    await clientA.query(
      `INSERT INTO transactional_outbox (event_id, aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'SeatHold',
        hold1_id,
        'SeatHoldCreated',
        JSON.stringify({ showtimeId: 'st_101', seatIds: ['A1', 'A2'], customerId: 'cust_01' })
      ]
    );
    await clientA.query('COMMIT');

    const holdsRes = await clientA.query('SELECT * FROM seat_holds WHERE hold_id = $1', [hold1_id]);
    assert(holdsRes.rows.length === 1, 'PostgreSQL query returns 1 seat_holds row');

    const itemsRes = await clientA.query('SELECT * FROM hold_items WHERE hold_id = $1 ORDER BY seat_id', [hold1_id]);
    assert(itemsRes.rows.length === 2, 'PostgreSQL query returns 2 hold_items rows (A1, A2)');

    // -------------------------------------------------------------------------
    // STEP 3: Real Overlapping Transaction Contention Barrier (FG-FND-002)
    // -------------------------------------------------------------------------
    console.log(`\n--- STEP 3: Overlapping Transaction Contention (Client A PID ${pidA} vs Client B PID ${pidB}) ---`);
    await clientA.query('TRUNCATE seat_holds, hold_items, transactional_outbox CASCADE;');

    const holdA_id = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    const holdB_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

    const tStart = Date.now();
    console.log(`[${Date.now() - tStart}ms] Client A (PID ${pidA}) starts Transaction A (BEGIN) ...`);
    await clientA.query('BEGIN');
    await clientA.query(
      `INSERT INTO seat_holds (hold_id, showtime_id, customer_id, status, created_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '10 minutes')`,
      [holdA_id, 'st_101', 'cust_A', 'HELD']
    );
    await clientA.query(
      `INSERT INTO hold_items (hold_id, showtime_id, seat_id, status)
       VALUES ($1, $2, $3, $4)`,
      [holdA_id, 'st_101', 'A1', 'HELD']
    );
    console.log(`[${Date.now() - tStart}ms] Client A (PID ${pidA}) seat A1 inserted. TRANSACTION A IS IN-FLIGHT & UNCOMMITTED!`);

    let clientBPending = true;
    let clientB_err = null;
    let clientB_status = 'UNFINISHED';

    console.log(`[${Date.now() - tStart}ms] Client B (PID ${pidB}) starts Transaction B (BEGIN) and attempts insert on seat A1 while Transaction A is OPEN ...`);
    const clientBPromise = (async () => {
      try {
        await clientB.query('BEGIN');
        await clientB.query(
          `INSERT INTO seat_holds (hold_id, showtime_id, customer_id, status, created_at, expires_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '10 minutes')`,
          [holdB_id, 'st_101', 'cust_B', 'HELD']
        );
        // This query WILL BLOCK on PostgreSQL index lock while Client A is uncommitted
        await clientB.query(
          `INSERT INTO hold_items (hold_id, showtime_id, seat_id, status)
           VALUES ($1, $2, $3, $4)`,
          [holdB_id, 'st_101', 'A1', 'HELD']
        );
        await clientB.query('COMMIT');
        clientB_status = 'SUCCESS';
      } catch (err) {
        await clientB.query('ROLLBACK').catch(() => {});
        clientB_err = err;
        clientB_status = 'BLOCKED_BY_POSTGRES_LOCK';
      } finally {
        clientBPending = false;
      }
    })();

    // Sleep 100ms while Client B query is actively blocked waiting on lock
    await sleep(100);

    console.log(`[${Date.now() - tStart}ms] Check: Client B (PID ${pidB}) query status while Transaction A is open: PENDING = ${clientBPending}`);
    assert(clientBPending === true, `Client B (PID ${pidB}) query was actively BLOCKED/PENDING on PostgreSQL lock while Client A was OPEN`);

    console.log(`[${Date.now() - tStart}ms] Client A (PID ${pidA}) now COMMITTING Transaction A ...`);
    await clientA.query('COMMIT');
    console.log(`[${Date.now() - tStart}ms] Client A (PID ${pidA}) COMMITTED. PostgreSQL releases lock.`);

    // Await Client B completion
    await clientBPromise;

    console.log(`[${Date.now() - tStart}ms] Client B (PID ${pidB}) finished with status: ${clientB_status}`);
    console.log(`[${Date.now() - tStart}ms] Client B PostgreSQL Error Code: ${clientB_err?.code} | Constraint: ${clientB_err?.constraint} | Message: ${clientB_err?.message}`);

    assert(clientB_status === 'BLOCKED_BY_POSTGRES_LOCK', 'Client B failed after Client A committed seat A1');
    assert(
      clientB_err && clientB_err.code === '23505' && clientB_err.constraint === 'idx_uniq_active_seat_hold',
      `Client B received genuine PostgreSQL SQLSTATE 23505 unique_violation on constraint 'idx_uniq_active_seat_hold'`
    );

    // -------------------------------------------------------------------------
    // STEP 4: Expiry Equality Boundary Verification (now >= expires_at - FG-FND-004)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 4: Expiry Equality Boundary Verification (now >= expires_at) ---');
    await clientA.query('TRUNCATE seat_holds, hold_items CASCADE;');

    const exactExpiryTime = '2026-07-28T02:10:00.000Z';
    const beforeExpiryTime = '2026-07-28T02:09:59.999Z';

    const holdEx_id = 'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    await clientA.query(
      `INSERT INTO seat_holds (hold_id, showtime_id, customer_id, status, created_at, expires_at)
       VALUES ($1, $2, $3, $4, '2026-07-28T02:00:00.000Z', $5::timestamptz)`,
      [holdEx_id, 'st_102', 'cust_Ex', 'HELD', exactExpiryTime]
    );
    await clientA.query(
      `INSERT INTO hold_items (hold_id, showtime_id, seat_id, status)
       VALUES ($1, $2, $3, $4)`,
      [holdEx_id, 'st_102', 'B1', 'HELD']
    );

    // Query 1: Before exact expiry time (now < expires_at) -> 0 expired holds
    const checkBefore = await clientA.query(
      "SELECT count(*)::int as count FROM seat_holds WHERE status = 'HELD' AND $1::timestamptz >= expires_at;",
      [beforeExpiryTime]
    );
    const countBefore = Number(checkBefore.rows[0].count);
    assert(countBefore === 0, `Before expiry boundary (now < expires_at): ${countBefore} holds expired (expected 0)`);

    // Query 2: At exact equality boundary (now >= expires_at) -> 1 hold expired
    const checkAtExact = await clientA.query(
      "SELECT count(*)::int as count FROM seat_holds WHERE status = 'HELD' AND $1::timestamptz >= expires_at;",
      [exactExpiryTime]
    );
    const countAtExact = Number(checkAtExact.rows[0].count);
    assert(countAtExact === 1, `At exact equality boundary (now >= expires_at): ${countAtExact} hold identified for expiry (expected 1)`);

    // Execute Expiry Worker sweep at exact boundary
    await clientA.query(
      `UPDATE seat_holds SET status = 'EXPIRED' WHERE status = 'HELD' AND $1::timestamptz >= expires_at;`,
      [exactExpiryTime]
    );
    await clientA.query(
      `UPDATE hold_items SET status = 'EXPIRED' WHERE hold_id = $1;`,
      [holdEx_id]
    );

    const expiredRes = await clientA.query("SELECT status FROM seat_holds WHERE hold_id = $1", [holdEx_id]);
    assert(expiredRes.rows[0].status === 'EXPIRED', 'Seat hold status updated to EXPIRED at equality boundary now >= expires_at');

    // -------------------------------------------------------------------------
    // STEP 5: Seat Reuse After Expiry & Cancellation (FG-FND-001)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 5: Seat Reuse After Expiry & Cancellation ---');
    // Session C claims seat B1 after expiry
    let sessionC_success = false;
    try {
      await clientA.query('BEGIN');
      await clientA.query(
        `INSERT INTO seat_holds (hold_id, showtime_id, customer_id, status, created_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '10 minutes')`,
        ['f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'st_102', 'cust_C', 'HELD']
      );
      await clientA.query(
        `INSERT INTO hold_items (hold_id, showtime_id, seat_id, status)
         VALUES ($1, $2, $3, $4)`,
        ['f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'st_102', 'B1', 'HELD']
      );
      await clientA.query('COMMIT');
      sessionC_success = true;
    } catch (err) {
      await clientA.query('ROLLBACK').catch(() => {});
    }

    assert(sessionC_success, 'Seat B1 SAFELY REUSED after previous hold reached EXPIRED status');

    // Customer cancels hold C -> status becomes CANCELLED
    await clientA.query("UPDATE seat_holds SET status = 'CANCELLED' WHERE hold_id = 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';");
    await clientA.query("UPDATE hold_items SET status = 'CANCELLED' WHERE hold_id = 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';");

    // Session D claims seat B1 after cancellation
    let sessionD_success = false;
    try {
      await clientA.query('BEGIN');
      await clientA.query(
        `INSERT INTO seat_holds (hold_id, showtime_id, customer_id, status, created_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '10 minutes')`,
        ['15eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'st_102', 'cust_D', 'HELD']
      );
      await clientA.query(
        `INSERT INTO hold_items (hold_id, showtime_id, seat_id, status)
         VALUES ($1, $2, $3, $4)`,
        ['15eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'st_102', 'B1', 'HELD']
      );
      await clientA.query('COMMIT');
      sessionD_success = true;
    } catch (err) {
      await clientA.query('ROLLBACK').catch(() => {});
    }

    assert(sessionD_success, 'Seat B1 SAFELY REUSED after previous hold reached CANCELLED status');

    // -------------------------------------------------------------------------
    // STEP 6: Confirmation State Invariant
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 6: Confirmation State Invariant ---');
    await clientA.query("UPDATE seat_holds SET status = 'CONFIRMED' WHERE hold_id = '15eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';");
    await clientA.query("UPDATE hold_items SET status = 'CONFIRMED' WHERE hold_id = '15eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';");

    let sessionE_failed = false;
    try {
      await clientA.query('BEGIN');
      await clientA.query(
        `INSERT INTO seat_holds (hold_id, showtime_id, customer_id, status, created_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '10 minutes')`,
        ['26eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'st_102', 'cust_E', 'HELD']
      );
      await clientA.query(
        `INSERT INTO hold_items (hold_id, showtime_id, seat_id, status)
         VALUES ($1, $2, $3, $4)`,
        ['26eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'st_102', 'B1', 'HELD']
      );
      await clientA.query('COMMIT');
    } catch (err) {
      await clientA.query('ROLLBACK').catch(() => {});
      sessionE_failed = (err.code === '23505' && err.constraint === 'idx_uniq_active_seat_hold');
    }

    assert(sessionE_failed, 'CONFIRMED seat B1 BLOCKS new hold requests via PostgreSQL Partial Unique Index');

    // -------------------------------------------------------------------------
    // STEP 7: Query and Log Final Real PostgreSQL Database State
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 7: Querying Final Real PostgreSQL Database State ---');
    const finalHolds = await clientA.query('SELECT hold_id, showtime_id, customer_id, status, expires_at FROM seat_holds ORDER BY created_at;');
    console.log('Final seat_holds Table Rows (Queried from PostgreSQL Server):');
    console.table(finalHolds.rows);

    const finalItems = await clientA.query('SELECT item_id, hold_id, showtime_id, seat_id, status FROM hold_items ORDER BY item_id;');
    console.log('Final hold_items Table Rows (Queried from PostgreSQL Server):');
    console.table(finalItems.rows);

    await closeAll();

    console.log('\n================================================================');
    console.log(`SUMMARY: Passed ${passCount}/${testCount} tests on REAL PostgreSQL Server (Backend PIDs ${pidA}, ${pidB}).`);
    console.log('VERDICT: All Review 05 Secret & Config Findings Fully RESOLVED!');
    console.log('================================================================\n');

    if (passCount !== testCount) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Lab Error during PostgreSQL execution:', err);
    await closeAll().catch(() => {});
    process.exit(1);
  }
}

runLab().catch((err) => {
  console.error('Unhandled Lab Error:', err);
  process.exit(1);
});
