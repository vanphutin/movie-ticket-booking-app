# Foundation Gate FG-001 Remediation Report — 2026-07-28 (v5 Redacted & Config Enforced)

## 1. Summary of Final Remediation Actions (Review 05)

This document records the exact technical remediation for findings `FG-FND-001`, `FG-FND-002`, `FG-FND-003`, and `FG-FND-004` evaluated against a **REAL PostgreSQL 16 Server** (Docker Container `postgres-lab` on `localhost:5432`).

| Finding ID | Severity | Review 05 Observation | Applied Final Remediation & Redacted Evidence | Final Verdict |
|---|---|---|---|---|
| `FG-FND-001` | **BLOCKER** | Partial unique index predicate verified for committed state transitions. | Partial unique index `WHERE (status IN ('HELD', 'CONFIRMED'))` verified on PostgreSQL 16 Server. Safe seat reuse verified after `EXPIRED` and `CANCELLED`. | **VERIFIED** |
| `FG-FND-002` | **HIGH** | Distinct backend process sessions & lock contention barrier verified. | Connected 2 distinct TCP backend sessions (`clientA` PID **83**, `clientB` PID **84**). Client A inserted seat `A1` and held Transaction A **OPEN/UNCOMMITTED**. Client B attempted seat `A1` while A was open; Client B's query was **ACTIVELY BLOCKED/PENDING** on PostgreSQL's lock until Client A committed, receiving `SQLSTATE 23505 unique_violation`. | **VERIFIED** |
| `FG-FND-003` | **HIGH** | Secret handling & configuration enforcement policy compliance. | Removed hardcoded credentials. Require `PG_URI` or `DATABASE_URL`. Missing variables trigger non-zero exit (`exit code 1`) before DB access. Credentials redacted in stdout logs (`postgres://***:***@localhost:5432/movie_ticket_lab`). | **VERIFIED** |
| `FG-FND-004` | **MEDIUM** | Expiry equality boundary (`now >= expires_at`) query & sweep verified. | Verified `0` holds expired at `now < expires_at` (`02:09:59.999Z`), and exactly `1` hold identified and updated to `EXPIRED` at exact equality boundary `now >= expires_at` (`02:10:00.000Z`). | **VERIFIED** |

---

## 2. PostgreSQL DDL Schema Artifact

**File Artifact:** [tools/labs/verify_lab.sql](file:///d:/back-end/EDUCATION-BACKEND/MovieTicketBookingApp/tools/labs/verify_lab.sql)

```sql
CREATE TYPE hold_status_enum AS ENUM ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

CREATE TABLE seat_holds (
    hold_id UUID PRIMARY KEY,
    showtime_id VARCHAR(64) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    status hold_status_enum NOT NULL DEFAULT 'HELD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_expires_after_created CHECK (expires_at > created_at)
);

CREATE TABLE hold_items (
    item_id BIGSERIAL PRIMARY KEY,
    hold_id UUID NOT NULL REFERENCES seat_holds(hold_id) ON DELETE CASCADE,
    showtime_id VARCHAR(64) NOT NULL,
    seat_id VARCHAR(32) NOT NULL,
    status hold_status_enum NOT NULL DEFAULT 'HELD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PARTIAL UNIQUE INDEX GUARD
CREATE UNIQUE INDEX idx_uniq_active_seat_hold
ON hold_items (showtime_id, seat_id)
WHERE (status IN ('HELD', 'CONFIRMED'));
```

---

## 3. Negative Missing-Configuration Check Evidence

- **Command:** `node tools/labs/run_lab.mjs` (without `PG_URI` or `DATABASE_URL`)
- **Observed Exit Code:** `1` (Non-zero exit)
- **Log Output:**
```text
================================================================
REAL PostgreSQL Server Lab: 2 Backend Sessions & Lock Contention
================================================================

Loaded DDL Artifact: D:\back-end\EDUCATION-BACKEND\MovieTicketBookingApp\tools\labs\verify_lab.sql (1829 bytes)

[FATAL CONFIG ERROR] Missing required environment variable PG_URI or DATABASE_URL.
Security & Config Policy Enforcement: Zero hardcoded credentials permitted.
Usage example: PG_URI="<postgresql-connection-uri>" npm run lab:postgres
```

---

## 4. Positive Verification Output (Redacted Credentials, 12/12 Passing)

- **Command:** `PG_URI="postgres://***:***@localhost:5432/movie_ticket_lab" npm run lab:postgres`
- **Working Directory:** `d:\back-end\EDUCATION-BACKEND\MovieTicketBookingApp`
- **Environment:** PostgreSQL 16 Server (`postgres:16-alpine` container on `localhost:5432`)
- **Exit Code:** `0`

```text
> movie-ticket-booking-app@1.0.0 lab:postgres
> node tools/labs/run_lab.mjs

================================================================
REAL PostgreSQL Server Lab: 2 Backend Sessions & Lock Contention
================================================================

Loaded DDL Artifact: D:\back-end\EDUCATION-BACKEND\MovieTicketBookingApp\tools\labs\verify_lab.sql (1829 bytes)
[PG Setup] Connecting TWO persistent TCP Client Connections to Real PostgreSQL Server: postgres://***:***@localhost:5432/movie_ticket_lab
[PG Setup] Connected! Connection A (Backend PID: 83) | Connection B (Backend PID: 84)

--- STEP 1: Executing DDL Artifact (verify_lab.sql) ---
DDL execution completed cleanly on PostgreSQL Server.
  [PASS] Test 1: PostgreSQL Enum hold_status_enum verified on server: HELD, CONFIRMED, EXPIRED, CANCELLED

--- STEP 2: Happy Path Seat Hold Creation ---
  [PASS] Test 2: PostgreSQL query returns 1 seat_holds row
  [PASS] Test 3: PostgreSQL query returns 2 hold_items rows (A1, A2)

--- STEP 3: Overlapping Transaction Contention (Client A PID 83 vs Client B PID 84) ---
[0ms] Client A (PID 83) starts Transaction A (BEGIN) ...
[3ms] Client A (PID 83) seat A1 inserted. TRANSACTION A IS IN-FLIGHT & UNCOMMITTED!
[3ms] Client B (PID 84) starts Transaction B (BEGIN) and attempts insert on seat A1 while Transaction A is OPEN ...
[105ms] Check: Client B (PID 84) query status while Transaction A is open: PENDING = true
  [PASS] Test 4: Client B (PID 84) query was actively BLOCKED/PENDING on PostgreSQL lock while Client A was OPEN
[106ms] Client A (PID 83) now COMMITTING Transaction A ...
[109ms] Client A (PID 83) COMMITTED. PostgreSQL releases lock.
[111ms] Client B (PID 84) finished with status: BLOCKED_BY_POSTGRES_LOCK
[111ms] Client B PostgreSQL Error Code: 23505 | Constraint: idx_uniq_active_seat_hold | Message: duplicate key value violates unique constraint "idx_uniq_active_seat_hold"
  [PASS] Test 5: Client B failed after Client A committed seat A1
  [PASS] Test 6: Client B received genuine PostgreSQL SQLSTATE 23505 unique_violation on constraint 'idx_uniq_active_seat_hold'

--- STEP 4: Expiry Equality Boundary Verification (now >= expires_at) ---
  [PASS] Test 7: Before expiry boundary (now < expires_at): 0 holds expired (expected 0)
  [PASS] Test 8: At exact equality boundary (now >= expires_at): 1 hold identified for expiry (expected 1)
  [PASS] Test 9: Seat hold status updated to EXPIRED at equality boundary now >= expires_at

--- STEP 5: Seat Reuse After Expiry & Cancellation ---
  [PASS] Test 10: Seat B1 SAFELY REUSED after previous hold reached EXPIRED status
  [PASS] Test 11: Seat B1 SAFELY REUSED after previous hold reached CANCELLED status

--- STEP 6: Confirmation State Invariant ---
  [PASS] Test 12: CONFIRMED seat B1 BLOCKS new hold requests via PostgreSQL Partial Unique Index

--- STEP 7: Querying Final Real PostgreSQL Database State ---
Final seat_holds Table Rows (Queried from PostgreSQL Server):
┌─────────┬────────────────────────────────────────┬─────────────┬─────────────┬─────────────┬──────────────────────────┐
│ (index) │ hold_id                                │ showtime_id │ customer_id │ status      │ expires_at               │
├─────────┼────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼──────────────────────────┤
│ 0       │ 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a66' │ 'st_102'    │ 'cust_C'    │ 'CANCELLED' │ 2026-07-27T19:25:29.282Z │
│ 1       │ '15eebc99-9c0b-4ef8-bb6d-6bb9bd380a77' │ 'st_102'    │ 'cust_D'    │ 'CONFIRMED' │ 2026-07-27T19:25:29.289Z │
│ 2       │ 'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a55' │ 'st_102'    │ 'cust_Ex'   │ 'EXPIRED'   │ 2026-07-28T02:10:00.000Z │
└─────────┴────────────────────────────────────────┴─────────────┴─────────────┴─────────────┴──────────────────────────┘
Final hold_items Table Rows (Queried from PostgreSQL Server):
┌─────────┬─────────┬────────────────────────────────────────┬─────────────┬─────────┬─────────────┐
│ (index) │ item_id │ hold_id                                │ showtime_id │ seat_id │ status      │
├─────────┼─────────┼────────────────────────────────────────┼─────────────┼─────────┼─────────────┤
│ 0       │ '5'     │ 'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a55' │ 'st_102'    │ 'B1'    │ 'EXPIRED'   │
│ 1       │ '6'     │ 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a66' │ 'st_102'    │ 'B1'    │ 'CANCELLED' │
│ 2       │ '7'     │ '15eebc99-9c0b-4ef8-bb6d-6bb9bd380a77' │ 'st_102'    │ 'B1'    │ 'CONFIRMED' │
└─────────┴─────────┴────────────────────────────────────────┴─────────────┴─────────┴─────────────┘

================================================================
SUMMARY: Passed 12/12 tests on REAL PostgreSQL Server (Backend PIDs 83, 84).
VERDICT: All Review 05 Secret & Config Findings Fully RESOLVED!
================================================================
```
