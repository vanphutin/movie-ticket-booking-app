# Capability lesson specifications
These specifications deepen the reusable capability map. Ticket gates select the
ticket-relevant subset; they do not teach an entire capability indiscriminately.

## CAP-CON-01 — Authority, contract and evidence

- Target level: `C4_DEFEND`.
- Problem/invariant: delivery claims must follow explicit authority and reproducible
  evidence; plans and reported outcomes cannot silently become facts.
- Mental model: separate normative contract, authorized ticket, repository observation,
  executable evidence and reviewer verdict.
- Compare: one giant context document vs canonical structured state plus compact
  projection. Select canonical state + validated projections; reject duplicated state
  because it drifts. Reconsider only if portability requirements cannot resolve canonical
  files.
- Counterexample: a checked box or existing test file proves the acceptance criterion.
- Failure focus: stale state authorizes the wrong ticket; fabricated output produces a
  false `VERIFIED`.
- Learner must defend: authority order, one observed/reported claim classification and
  the drift response.
- Reference profile: `REF-CONTRACT`.

## CAP-IDN-01 — Identity, credentials and sessions

- Target level: `C3_INTEGRATE`.
- Problem/invariant: identify a user without exposing reusable credentials and keep
  session lifecycle revocable.
- Mental model: identity is the subject; credential proves control; session carries
  authenticated continuity.
- Compare: plaintext vs adaptive password hash; plaintext refresh token vs stored token
  hash; fixed token vs rotation/family tracking. Select adaptive password hashing and
  hashed, rotatable session tokens; reject reusable plaintext because database disclosure
  becomes account takeover.
- Change conditions: identity-provider federation or hardware-backed credentials require
  a new reviewed flow, not silent reuse of password assumptions.
- Counterexample: hashing a password once with a fast general-purpose hash is sufficient.
- Failure focus: enumeration, duplicate email, token replay and unsafe recovery.
- Reference profile: `REF-IDENTITY`.

## CAP-SEC-01 — Authentication and authorization

- Target level: `C4_DEFEND`.
- Problem/invariant: only a verified actor may exercise an allowed action on an owned
  resource; client-supplied identity is untrusted.
- Mental model: authentication establishes actor context; authorization evaluates action,
  role, ownership and resource state at the owner boundary.
- Compare: Gateway-only authorization vs owner-service authorization; allow-by-default vs
  deny-by-default; access token vs refresh token. Select edge verification plus
  owner-service authorization and deny-by-default; reject Gateway-only ownership checks
  because Gateway does not own domain state.
- Change conditions: a policy service may centralize policy evaluation only with explicit
  contracts; resource ownership remains enforceable at the owner service.
- Counterexample: a valid JWT means every requested resource action is allowed.
- Failure focus: actor spoofing, 401/403 confusion, replay, over-broad role and leakage.
- Reference profile: `REF-SECURITY`.

## CAP-CAT-01 — Catalog lifecycle and bounded queries

- Target level: `C3_INTEGRATE`.
- Problem/invariant: Guests see only valid published catalog data and queries remain
  deterministic and bounded.
- Mental model: aggregate lifecycle controls visibility; DTOs separate public/admin
  surfaces; workload shapes pagination and indexes.
- Compare: offset pagination vs cursor pagination where applicable; arbitrary filter/sort
  vs allowlist; application-only validation vs database constraint. Select the
  contract-approved bounded query and defense-in-depth constraints; reject arbitrary
  fields because they expose unstable behavior and injection/resource risks.
- Change conditions: measured workload or consumer compatibility may justify a reviewed
  pagination/index change.
- Counterexample: returning all rows is safe while the development dataset is small.
- Failure focus: invalid publish, mass assignment, unstable order, N+1 and unbounded query.
- Reference profile: `REF-DATA-API`.

## CAP-SCH-01 — Scheduling state and temporal invariants

- Target level: `C4_DEFEND`.
- Problem/invariant: seat labels are unique per screen and showtimes cannot overlap under
  the approved policy.
- Mental model: state machine governs lifecycle; constraints protect durable invariants;
  transition policy explains when a state may change.
- Compare: application pre-check vs unique/exclusion constraint; delete/recreate vs
  explicit lifecycle transition. Select explicit state transitions plus database
  constraints where expressible; reject check-then-write alone because concurrent writes
  can both pass.
- Change conditions: a revised scheduling policy or time-zone model requires contract and
  migration review.
- Counterexample: a `CHECK` constraint that queries other rows safely enforces overlap.
- Failure focus: duplicate seat, temporal overlap, invalid publish and incompatible
  migration.
- Reference profile: `REF-POSTGRES-DATA`.

## CAP-EVT-01 — Reliable event facts

- Target level: `C4_DEFEND`.
- Problem/invariant: a committed cross-service fact must not be silently lost and
  duplicate delivery must not duplicate business effect.
- Mental model: event is an immutable fact; state+outbox share a transaction; relay and
  at-least-once delivery imply idempotent consumers.
- Compare: publish-before-commit, publish-after-commit, distributed transaction and
  transactional outbox. Select outbox/inbox under current contracts; reject publish
  before/after commit because each leaves a crash window.
- Change conditions: broker/CDC capabilities may change relay implementation, not the
  atomicity and deduplication obligations.
- Counterexample: broker acknowledgement proves consumer business effect occurred once.
- Failure focus: duplicate, late, out-of-order, poison event and incompatible schema.
- Reference profile: `REF-EVENTS`.

## CAP-BKG-01 — Seat hold and booking lifecycle

- Target level: `C4_DEFEND`.
- Problem/invariant: one seat occurrence has at most one active hold or confirmed booking,
  and only the owner may act on it before expiry.
- Mental model: Booking owns a showtime/price snapshot and a hold→booking state machine;
  expiry and ownership are evaluated at the authoritative boundary.
- Compare: live Catalog lookup during confirm vs owned immutable snapshot; client timer vs
  server timestamp; retryable command without vs with durable idempotency. Select owned
  snapshots, server time and durable idempotency; reject live cross-service dependency in
  the transaction.
- Change conditions: pricing/cancellation contract changes require snapshot compatibility
  review.
- Counterexample: a countdown displayed by the browser determines whether a hold expired.
- Failure focus: stale snapshot, cross-user access, expiry race and unknown retry outcome.
- Reference profile: `REF-BOOKING`.

## CAP-CONC-01 — Exactly one winner under race

- Target level: `C4_DEFEND`.
- Problem/invariant: simultaneous contenders for one seat produce exactly one valid
  winner on the real database.
- Mental model: transaction defines atomic work; locks coordinate contenders; constraints
  protect final state; retry handles selected transient failures.
- Compare: in-memory mutex, distributed lock, row lock + constraint and serializable
  isolation. Select the reviewed shortest DB transaction with appropriate lock/constraint;
  reject in-memory mutex for multi-replica safety and reject external lock as the sole
  database invariant guard.
- Change conditions: changed contention/workload or physical data model requires new
  lock/isolation evidence.
- Counterexample: sequentially calling the handler twice is a concurrency test.
- Failure focus: lost update, oversell, deadlock, lock timeout and retry amplification.
- Reference profile: `REF-CONCURRENCY`.

## CAP-PAY-01 — Verified payment and ticket-once

- Target level: `C4_DEFEND`.
- Problem/invariant: only a verified provider outcome for the correct reference, amount
  and currency may cause one ticket effect.
- Mental model: provider notification is untrusted input; raw-body signature precedes
  effect; durable state and idempotency handle duplicates/out-of-order outcomes.
- Compare: redirect result vs signed webhook; mark-paid immediately vs verify/reconcile;
  dedup in memory vs durable inbox/state transition. Select signed verification and
  durable idempotent transition; reject browser redirect as payment authority.
- Change conditions: provider semantics or settlement model changes require adapter and
  reconciliation contract review.
- Counterexample: an HTTP 200 from a customer browser proves payment success.
- Failure focus: spoofed/replayed webhook, mismatch, duplicate, out-of-order and unknown.
- Reference profile: `REF-PAYMENT`.

## CAP-WRK-01 — Bounded background recovery

- Target level: `C4_DEFEND`.
- Problem/invariant: background effects recover from crashes without infinite retry or
  duplicate business effects.
- Mental model: claim→effect→ack contains crash windows; idempotency absorbs replay;
  bounded backoff/jitter limits load; poison work moves to DLQ with operator controls.
- Compare: infinite immediate retry, bounded retry + DLQ and manual database mutation.
  Select bounded retry/DLQ and contract-based replay; reject retry forever and arbitrary
  database repair.
- Change conditions: workload/SLO and broker delivery semantics may revise budgets after
  evidence.
- Counterexample: acknowledging before the effect is safer because it avoids duplicates.
- Failure focus: crash before/after effect, poison job, retry storm and unsafe replay.
- Reference profile: `REF-WORKER`.

## CAP-OBS-01 — Useful and safe telemetry

- Target level: `C3_INTEGRATE`.
- Problem/invariant: operators can correlate failures without exposing secrets/PII or
  creating unbounded telemetry cost.
- Mental model: traces connect causal work, metrics aggregate bounded dimensions and logs
  explain discrete events; context must propagate across HTTP/events.
- Compare: request IDs as metric labels vs trace/log fields; log everything vs explicit
  redaction. Select bounded metric labels plus correlated traces/logs; reject identifiers
  as metric labels.
- Change conditions: telemetry backend limits and SLO questions drive a reviewed signal
  budget.
- Counterexample: more logs always improve observability.
- Failure focus: lost context, token/PII leak, high cardinality and misleading readiness.
- Reference profile: `REF-OBSERVABILITY`.

## CAP-OPS-01 — Recoverable operation

- Target level: `C4_DEFEND`.
- Problem/invariant: deploys degrade in bounded ways, stop accepting unsafe work and can
  be restored.
- Mental model: liveness says restart may help; readiness controls traffic; timeout/retry
  budgets bound dependency cost; graceful shutdown drains owned work.
- Compare: one health endpoint vs separate liveness/readiness; unbounded retry vs budgeted
  retry; rollback vs forward-fix migration. Select separate semantics and evidence-backed
  recovery plan; reject always-ready health.
- Change conditions: SLO, dependency behavior and deployment platform may revise budgets,
  not eliminate boundedness.
- Counterexample: a process returning HTTP 200 is ready to serve all dependencies safely.
- Failure focus: false-ready, hanging call, retry storm, interrupted migration and failed
  restore.
- Reference profile: `REF-OPERATIONS`.

## CAP-REL-01 — Reproducible release and defense

- Target level: `C4_DEFEND`.
- Problem/invariant: a release claim must reproduce from a clean environment and preserve
  security, concurrency and recovery gates.
- Mental model: clean checkout removes hidden state; evidence maps claim→command→artifact;
  hard gates cannot be averaged away by a high score.
- Compare: screenshot/manual demo vs scripted clean run; aggregate score vs hard-gate
  policy. Select reproducible commands plus hard gates; reject local-only success.
- Change conditions: release environment changes require a new reproducibility baseline.
- Counterexample: CI green proves backup restore and concurrency behavior.
- Failure focus: hidden dependency, misleading benchmark, stale documentation and missing
  rollback evidence.
- Reference profile: `REF-RELEASE`.
