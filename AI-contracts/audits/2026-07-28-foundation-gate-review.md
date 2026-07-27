# Foundation Gate FG-001 Review Record — 2026-07-28

## Review verdict

`CHANGES_REQUIRED`

The learner submission is substantial enough to review, but it does not yet support a
`VERIFIED` verdict. The PostgreSQL output is learner-reported, not reviewer-observed:
`verify_lab.sql` is not present in the repository and the reported command cannot be
reproduced from the submitted artifacts.

Control-plane validity, the effective contract baseline and endpoint traceability are
project-governance evidence. They do not replace the learner Foundation Gate rubric.

## Rubric

| Dimension | Score | Observation |
|---|---:|---|
| Problem framing | 3/3 | Actors, outcomes, states, invariants, side effects and failure cases are explicit. |
| Design | 1/3 | The proposed database guard contradicts the lifecycle invariant and the state vocabulary is inconsistent. |
| Verification | 1/3 | A plausible log is reported, but there is no runnable artifact and the negative case is sequential, not a concurrent race. |
| Explanation | 3/3 | The submission explains boundaries, alternatives, trade-offs, limitations and operational concepts. |
| **Total** | **8/12** | Below 9/12; Design and Verification are also below the required 2/3 minimum. |

## Findings

### FG-FND-001 — unique guard prevents seat reuse

Severity: `BLOCKER`

The statement calls `idx_uniq_active_seat_hold` a partial unique index, but the SQL is:

```sql
CREATE UNIQUE INDEX idx_uniq_active_seat_hold
ON hold_items (showtime_id, seat_id);
```

It has no predicate and `hold_items` has no lifecycle status. Once a seat appears in that
table, a later hold remains blocked even after the original hold is `EXPIRED` or
`CANCELLED`. This contradicts the submitted state machine and `INV-03`.

Resolve by selecting and defending a database model that both prevents simultaneous
active ownership and permits safe reuse after expiry/cancellation. Include the cleanup or
state-transition behavior and its transaction boundary.

### FG-FND-002 — race evidence is not a race

Severity: `HIGH`

The submitted negative case attempts a duplicate insert only after the first transaction
has committed. It verifies a uniqueness violation, not `INV-02` under concurrent
contenders. Resolve with two actual database sessions/transactions contending for the same
`(showtime_id, seat_id)`, recording both outcomes and the final database state.

### FG-FND-003 — evidence artifact is missing

Severity: `HIGH`

The submission reports this command:

```text
psql -h localhost -U postgres -d movie_ticket_lab -f verify_lab.sql
```

At review time, `verify_lab.sql` does not exist in the repository. Therefore the claimed
exit code and output remain `REPORTED`, not `OBSERVED`.

### FG-FND-004 — state vocabulary and boundary are inconsistent

Severity: `MEDIUM`

The domain uses `BOOKED`, the database enum uses `CONFIRMED`, and the prose alternates
between those meanings. The expiry rule also needs an explicit equality decision
(`now >= expires_at` versus `now > expires_at`) shared by domain and database behavior.

## Evidence classification

- Learner explanation and supplied text: `OBSERVED`
- PostgreSQL command, environment, exit code and output: `REPORTED`
- Repository artifact `verify_lab.sql`: `MISSING`
- Concurrent exactly-one-winner behavior: `MISSING`

## Single remediation

Create a reproducible PostgreSQL lab artifact that fixes the active-seat lifecycle model,
then run a two-session contention test plus expiry/cancellation reuse test.

Completion condition: the reviewer can run the exact documented commands and observe
exactly one winner, no duplicate active owner, successful reuse after expiry/cancellation,
consistent state names/boundary semantics, and the expected final database state.

## Remediation review 02

Verdict: `CHANGES_REQUIRED`

The submitted repository artifacts resolve the missing-file finding, but they do not
provide PostgreSQL evidence:

- `tools/labs/run_lab.mjs` implements a custom `SimulatedPostgresDB` in Node memory.
- The runner reads the SQL file as text but never executes its statements.
- It imports no PostgreSQL driver and opens no PostgreSQL connection.
- The two `Promise.all` callbacks contain no asynchronous wait or database operation, so
  they execute sequentially on one JavaScript thread rather than as two database sessions.
- The runner assigns the string `23505` itself; PostgreSQL did not produce that SQLSTATE.
- At review time `docker ps` showed no running containers and `psql` was unavailable.

The reviewer ran `node tools/labs/run_lab.mjs` and observed exit code `0` and the reported
13/13 output. That observation proves only that the simulator's assertions pass. It does
not prove PostgreSQL DDL validity, transaction behavior, blocking, uniqueness under a
race, or final database state.

### Updated finding status

| Finding | Status | Review observation |
|---|---|---|
| `FG-FND-001` | `DESIGN_REMEDIATED_NOT_DB_VERIFIED` | The SQL now contains a real predicate, but it has not been executed against PostgreSQL. |
| `FG-FND-002` | `OPEN` | No two-session PostgreSQL contention test exists. |
| `FG-FND-003` | `PARTIAL` | Artifacts exist, but the evidence is a simulator rather than the claimed database boundary. |
| `FG-FND-004` | `PARTIAL` | Vocabulary is aligned in the lab files; equality expiry behavior is asserted in simulation, not exercised by PostgreSQL. |

### Remediation 02

Replace the simulator evidence with a real PostgreSQL harness. It must start or connect to
a PostgreSQL instance, execute `verify_lab.sql`, open two independent connections, hold
the first transaction long enough to create overlap, record both transaction results and
SQLSTATEs, verify reuse after committed expiry/cancellation transitions, query final rows,
and clean up deterministically.

Completion condition: the exact repository-backed command exits `0` only after a real
PostgreSQL server produced the observed schema, overlapping transaction outcomes and final
state; connection/setup failure must exit non-zero.

## Remediation review 03

Verdict: `CHANGES_REQUIRED`

The reviewer ran `node tools/labs/run_lab.mjs` and observed exit code `0` with 10/10
assertions. This is valid evidence that a PostgreSQL-compatible PGlite engine executes the
DDL, enforces the partial unique index, returns `23505` for a duplicate committed key, and
allows reuse after explicit `EXPIRED`/`CANCELLED` state updates.

It still does not satisfy the concurrent-session or expiry-boundary completion condition:

- `getPostgresEngine()` creates one PGlite instance or one `pg.Client`.
- Both alleged sessions call `db.exec()` on that same instance/client.
- No connection pool or two separately connected clients exist.
- There is no synchronization barrier proving transaction A remains open while transaction
  B attempts the conflicting insert.
- The test changes rows to `EXPIRED` explicitly; it never evaluates or applies
  `now >= expires_at`.
- The default fallback succeeds when no TCP PostgreSQL server is available, so it does not
  demonstrate the requested server connection/setup failure behavior.
- `@electric-sql/pglite` and `pg` were installed with `--no-save`; there is no root
  `package.json` declaring a reproducible lab dependency set.

### Updated finding status

| Finding | Status | Review observation |
|---|---|---|
| `FG-FND-001` | `VERIFIED_FOR_COMMITTED_STATE_TRANSITIONS` | PostgreSQL-compatible engine executed the predicate and reuse checks. |
| `FG-FND-002` | `OPEN` | The runner still uses one connection and provides no overlapping transaction timeline. |
| `FG-FND-003` | `CHANGES_REQUIRED` | Engine evidence is real, but dependency/setup and the claimed two-session boundary are not reproducible as documented. |
| `FG-FND-004` | `PARTIAL` | Vocabulary is verified; the equality expiry rule is not exercised. |

### Remediation 03

Use a real PostgreSQL server and two independent `pg.Client` connections. Coordinate them
with an explicit barrier: transaction A inserts and remains uncommitted; transaction B
attempts the same active seat while A is open; then release A and record both outcomes,
timings, SQLSTATE and final rows. Add an expiry transition/query that proves the chosen
`now >= expires_at` boundary, and make dependencies/setup reproducible from checked-in
tooling metadata.

Completion condition: a clean environment can run the documented repository command
against a real PostgreSQL server and observe two distinct backend sessions with overlapping
transactions, exactly one active owner, PostgreSQL-produced `23505`, equality-boundary
expiry behavior, safe reuse and queried final state.

## Remediation review 04

Verdict: `CHANGES_REQUIRED`

The reviewer ran `npm run lab:postgres` and observed 11/11 assertions. Remediation v3
successfully adds root dependency metadata and verifies the equality expiry query and
sweep. It still does not implement or prove overlapping transactions:

- The output explicitly says Client A committed at the claimed 10 ms point and Client B
  did not attempt its insert until the claimed 20 ms point.
- The strings `00ms`, `10ms`, `20ms` and `40ms` are hard-coded log labels; no elapsed time
  is measured.
- The Client A SQL batch includes `BEGIN`, both inserts and `COMMIT`, and the code awaits
  that entire batch before invoking Client B.
- On the PGlite path, every Client B `query()` or `exec()` calls `dbA.clone()` again.
  Therefore Client B is not one persistent connection and cannot retain a transaction
  across calls.
- No PostgreSQL backend identifiers such as `pg_backend_pid()` are recorded.
- The observed `23505` is a valid committed-key uniqueness check, not evidence that Client
  B waited on an uncommitted competing transaction.

### Updated finding status

| Finding | Status | Review observation |
|---|---|---|
| `FG-FND-001` | `VERIFIED` | Partial index, expiry/cancellation reuse and confirmed-seat blocking are engine-observed. |
| `FG-FND-002` | `OPEN` | Transaction A commits before transaction B starts; no overlap exists. |
| `FG-FND-003` | `PARTIAL` | Root dependencies are declared, but the default evidence path is not a persistent dual-session server test. |
| `FG-FND-004` | `VERIFIED` | The before/equality queries and equality sweep are engine-observed. |

### Remediation 04

Do not use PGlite for the concurrency claim. Require `PG_URI` and open two persistent
`pg.Client` connections. Record distinct `pg_backend_pid()` values. On Client A, run
`BEGIN` and inserts without committing. Start Client B's conflicting insert and confirm it
remains pending while A is open. Then commit A, await B's PostgreSQL `23505`, roll back B,
and query the final state. Use measured timestamps or an explicit deferred/barrier rather
than hard-coded timing labels.

Completion condition: repository evidence shows two distinct PostgreSQL backend PIDs,
Client B pending while Client A is uncommitted, Client A commit preceding PostgreSQL's
`23505` response to B, exactly one final active owner, and a non-zero exit when `PG_URI`
is missing or unreachable.

## Remediation review 05

Verdict: `CHANGES_REQUIRED`

The reviewer ran `npm run lab:postgres` against the running PostgreSQL 16 container and
observed exit code `0`, backend PIDs `74` and `75`, Client B pending while Client A was
uncommitted, Client A committing before B completed, PostgreSQL returning `23505` on
`idx_uniq_active_seat_hold`, and all 12 assertions passing. The concurrency, lifecycle and
expiry-boundary findings are technically resolved.

One evidence/security finding remains:

- `run_lab.mjs` contains a hard-coded connection URI with a password.
- The runner prints the complete URI, including the password, to console evidence.
- When `PG_URI`/`DATABASE_URL` is absent, the command succeeds through that fallback
  instead of exiting non-zero as required by remediation review 04.

This contradicts the learner's submitted zero-hardcoded-secret policy and the evidence
policy requiring secret-bearing evidence to be redacted.

### Updated finding status

| Finding | Status | Review observation |
|---|---|---|
| `FG-FND-001` | `VERIFIED` | Real PostgreSQL server verifies active-seat lifecycle and reuse. |
| `FG-FND-002` | `VERIFIED` | Distinct backend sessions and overlapping transaction lock behavior observed. |
| `FG-FND-003` | `CHANGES_REQUIRED` | Reproducible dependencies exist, but the runner hard-codes and logs a credential and does not fail when configuration is missing. |
| `FG-FND-004` | `VERIFIED` | Equality-boundary expiry behavior observed on PostgreSQL. |

### Remediation 05

Remove the credential fallback. Require `PG_URI` or `DATABASE_URL`; if neither exists,
exit non-zero before connecting. Redact credentials when logging the destination (for
example, log only host, port and database), and ensure reports/evidence do not preserve
the password-bearing URI. Re-run the successful server lab with a redacted log and a
negative missing-configuration check.

Completion condition: the configured PostgreSQL run still passes all 12 assertions
without exposing credentials, and a run with both connection variables absent exits
non-zero before any database action.

## Remediation review 06

Verdict: `CHANGES_REQUIRED`

The missing-configuration behavior is now correct. The reviewer removed both environment
variables, ran `node tools/labs/run_lab.mjs`, and observed exit code `1` before any
database connection.

Credential redaction remains incomplete:

- The missing-config branch prints a usage example containing the active lab username and
  password in plaintext.
- The same password-bearing URI remains in the remediation report.
- The running Docker container publishes PostgreSQL on `0.0.0.0:5432`, so the string is
  not merely a fictional placeholder at review time.

The positive connection log redacts credentials correctly, and the real PostgreSQL 12/12
behavior does not need to be re-proven after this documentation-only correction.

### Remediation 06

Change the usage example to a placeholder such as
`PG_URI="<postgresql-connection-uri>" npm run lab:postgres`, remove the plaintext
credential URI from the remediation report, and verify a repository scan contains no
password-bearing PostgreSQL URI.

Completion condition: the negative run still exits `1`, its output contains no username
or password, and a repository scan of the lab source and active audit/context artifacts
finds no plaintext password-bearing PostgreSQL URI.

## Final review 07

Verdict: `VERIFIED`

The reviewer independently observed the final remediation:

- With `PG_URI` and `DATABASE_URL` absent, `node tools/labs/run_lab.mjs` exited `1` before
  database access.
- Negative output used only `PG_URI="<postgresql-connection-uri>"` and exposed no
  credential.
- The credential scan over `tools/labs`,
  `AI-contracts/audits/2026-07-28-foundation-gate-remediation.md` and
  `CODEX-CONTEXT.md` returned zero matches.
- Review 05 independently observed the configured PostgreSQL 16 run passing 12/12 with
  distinct backend PIDs, an overlapping transaction, PostgreSQL `23505`, equality expiry,
  safe reuse and final queried state.

### Final rubric

| Dimension | Score | Evidence |
|---|---:|---|
| Problem framing | 3/3 | Actors, outcomes, states, invariants, side effects and failures are explicit. |
| Design | 3/3 | Lifecycle guard, transaction boundary, alternatives, trade-offs and change conditions are coherent. |
| Verification | 3/3 | Reproducible real-PostgreSQL positive/negative, concurrency, expiry and final-state evidence observed. |
| Explanation | 3/3 | Ownership, security, reliability concepts, rejected alternative and limitation are defended. |
| **Total** | **12/12** | Every dimension exceeds the 2/3 minimum and total exceeds 9/12. |

All findings `FG-FND-001` through `FG-FND-004` are `VERIFIED`. Foundation Gate `FG-001`
is verified. This authorizes `TKT-W04-D01` to enter `STARTUP`; it does not bypass startup,
learning, analysis, design or readiness.
