# Ticket learning map — weeks 4–10

Each canonical daily ticket has exactly one gate. `Topics` reference the reusable
capability map and specialize it for the day's outcome. `Gate focus` supplies question
dimensions, not a static answer key.

Lesson depth follows `capability-lesson-specs.md`; decision teaching follows
`decision-learning-standard.md`; recall follows `knowledge-retention.yml`. The matrix
below assigns one target level and one reference profile to every gate. A profile resolves
to 1–3 documentation links in `reference-profiles.yml`.

## Week 4 — Contract, Identity and Security

| Gate | Ticket / capabilities | Topics | Gate focus and unlock evidence |
|---|---|---|---|
| LG-TKT-W04-D01 | TKT-W04-D01 / CAP-CON-01 | source of truth, contract vs evidence, actor/outcome, invariant, owner/trust boundary | explain authority order; classify a claim; map one owner and one boundary |
| LG-TKT-W04-D02 | TKT-W04-D02 / CAP-IDN-01 | identity/credential/session, password hashing, refresh-session lifecycle, unique constraints | explain why password/token hashes differ; owner/invariant; replay and duplicate-email case |
| LG-TKT-W04-D03 | TKT-W04-D03 / CAP-SEC-01 | authn vs authz, JWT signing/claims/expiry, access/refresh lifecycle, rotation/reuse, 401/403, trusted propagation | trace login/refresh; explain reuse response; split Gateway/Identity responsibility; redaction |
| LG-TKT-W04-D04 | TKT-W04-D04 / CAP-IDN-01, CAP-SEC-01 | OpenAPI as contract, RBAC deny-by-default, request/response/error boundary, idempotency | apply 401/403/404; prevent mass assignment/actor spoof; identify contract tests |
| LG-TKT-W04-D05 | TKT-W04-D05 / CAP-IDN-01, CAP-SEC-01 | vertical slice, Clean Architecture boundary, migration, negative tests, correlation | place controller/use-case/port/adapter; trace request; choose negative/replay evidence |

## Week 5 — Catalog

| Gate | Ticket / capabilities | Topics | Gate focus and unlock evidence |
|---|---|---|---|
| LG-TKT-W05-D01 | TKT-W05-D01 / CAP-CAT-01 | aggregate, movie/trailer lifecycle, state transition, public/admin DTO | explain invalid transition; owner and state invariant; separate public/admin data |
| LG-TKT-W05-D02 | TKT-W05-D02 / CAP-CAT-01 | schema constraint, migration, idempotent seed, index rationale | map business rule to DB constraint; clean/upgrade path; unsafe seed case |
| LG-TKT-W05-D03 | TKT-W05-D03 / CAP-CAT-01 | bounded pagination, allowlisted filter/sort, stable ordering, N+1, EXPLAIN | design deterministic query; identify injection/unbounded risk; explain index trade-off |
| LG-TKT-W05-D04 | TKT-W05-D04 / CAP-CAT-01 | API contract, auth context, error envelope, compatibility | choose safe status/error; prevent actor spoof; distinguish additive/breaking change |
| LG-TKT-W05-D05 | TKT-W05-D05 / CAP-CAT-01 | vertical slice integration, constraint/auth negative tests, query evidence | trace request to DB; select real-boundary tests; defend scope and limitations |

## Week 6 — Scheduling and Events

| Gate | Ticket / capabilities | Topics | Gate focus and unlock evidence |
|---|---|---|---|
| LG-TKT-W06-D01 | TKT-W06-D01 / CAP-SCH-01 | cinema/screen/seat/showtime ownership, state machine, temporal overlap | model one valid/invalid transition; explain overlap policy and owner |
| LG-TKT-W06-D02 | TKT-W06-D02 / CAP-SCH-01 | uniqueness/exclusion constraints, additive migration, upgrade/rollback, index | map duplicate/overlap rules to DB; reason about existing data and rollback |
| LG-TKT-W06-D03 | TKT-W06-D03 / CAP-EVT-01 | fact vs command, envelope/version, at-least-once, outbox/inbox, order/retry/DLQ | handle duplicate/late/out-of-order event; explain compatibility and dedup key |
| LG-TKT-W06-D04 | TKT-W06-D04 / CAP-SCH-01, CAP-EVT-01 | publish sequence, atomic state+outbox, API/event contract, consumer fixture | trace success and broker-down flow; locate atomic boundary; choose contract test |
| LG-TKT-W06-D05 | TKT-W06-D05 / CAP-SCH-01, CAP-EVT-01 | scheduling vertical slice, relay behavior, replay and trace evidence | explain state/outbox commit; demonstrate duplicate safety; identify real evidence |

## Week 7 — Booking and Concurrency

| Gate | Ticket / capabilities | Topics | Gate focus and unlock evidence |
|---|---|---|---|
| LG-TKT-W07-D01 | TKT-W07-D01 / CAP-BKG-01 | snapshot, seat/hold/booking state, expiry, ownership authorization | model hold lifecycle; explain expiry and cross-user denial |
| LG-TKT-W07-D02 | TKT-W07-D02 / CAP-CONC-01 | race condition, transaction/isolation, lock/constraint, deadlock/retry | predict two contenders; locate transaction boundary; explain exactly-one-winner evidence |
| LG-TKT-W07-D03 | TKT-W07-D03 / CAP-BKG-01 | idempotency key/payload, inbox atomicity, replay and unknown outcome | compare same/different payload; reason about crash window and duplicate effect |
| LG-TKT-W07-D04 | TKT-W07-D04 / CAP-BKG-01, CAP-CONC-01 | consume→hold→confirm sequence, expiry race, owner checks, real-DB tests | trace failure states; distinguish 401/403; design simultaneous-hold test |
| LG-TKT-W07-D05 | TKT-W07-D05 / CAP-BKG-01, CAP-CONC-01 | integrated hold/confirm/expiry, replay, deadlock and final-state evidence | defend invariant under race; choose DB/E2E evidence; state limitation |

## Week 8 — Payment, Ticket and Worker

| Gate | Ticket / capabilities | Topics | Gate focus and unlock evidence |
|---|---|---|---|
| LG-TKT-W08-D01 | TKT-W08-D01 / CAP-PAY-01 | booking/payment/ticket states, transition order, reconciliation, ticket-once | resolve out-of-order success/fail; explain mismatch and ticket invariant |
| LG-TKT-W08-D02 | TKT-W08-D02 / CAP-WRK-01 | relay/expiry worker, ACK/effect windows, backoff/jitter, retry/DLQ | reason about crash before/after effect; bound retry; explain operator replay |
| LG-TKT-W08-D03 | TKT-W08-D03 / CAP-PAY-01 | raw-body signature/timestamp, amount/currency/reference, webhook idempotency, redaction | reject invalid/replay/mismatch; explain duplicate no-effect; name forbidden logs |
| LG-TKT-W08-D04 | TKT-W08-D04 / CAP-PAY-01, CAP-WRK-01 | provider port/adapter, no network in DB transaction, timeout/unknown outcome | place network boundary; reconcile unknown result; reject SDK/domain coupling |
| LG-TKT-W08-D05 | TKT-W08-D05 / CAP-PAY-01, CAP-WRK-01 | payment-to-ticket E2E, worker recovery, duplicate/crash safety, DLQ evidence | trace happy/failure path; preserve ticket-once; choose replay/DLQ/log evidence |

## Week 9 — Observability and Operations

| Gate | Ticket / capabilities | Topics | Gate focus and unlock evidence |
|---|---|---|---|
| LG-TKT-W09-D01 | TKT-W09-D01 / CAP-OPS-01 | workload/query inventory, EXPLAIN baseline, index read/write/storage trade-off | reject tiny-data claim; compare plans; justify index from workload |
| LG-TKT-W09-D02 | TKT-W09-D02 / CAP-OBS-01 | structured signals, correlation/trace propagation, redaction, bounded metrics | trace request/event; identify PII/token leak; reject high-cardinality label |
| LG-TKT-W09-D03 | TKT-W09-D03 / CAP-OPS-01 | timeout/retry budget, readiness, pool and graceful drain | prevent retry storm; distinguish liveness/readiness; explain shutdown timeline |
| LG-TKT-W09-D04 | TKT-W09-D04 / CAP-OPS-01 | backup/restore, migration compatibility, rollback/forward fix, CI/runbook | define restore success; handle incompatible deploy; identify secret artifact risk |
| LG-TKT-W09-D05 | TKT-W09-D05 / CAP-OBS-01, CAP-OPS-01 | integrated telemetry/health/shutdown, failure drill, measured optimization | correlate a failure; prove graceful behavior; distinguish plan from evidence |

## Week 10 — Release

| Gate | Ticket / capabilities | Topics | Gate focus and unlock evidence |
|---|---|---|---|
| LG-TKT-W10-D01 | TKT-W10-D01 / CAP-REL-01 | ownership/contract drift audit, consumer impact, finding severity | map invariant owner; identify breaking drift; choose remediation scope |
| LG-TKT-W10-D02 | TKT-W10-D02 / CAP-REL-01 | workload model, warmup, p50/p95/error context, race/replay regression | reject misleading benchmark; preserve invariants under load; state limits |
| LG-TKT-W10-D03 | TKT-W10-D03 / CAP-REL-01 | threat/data/operations audit, scans vs manual evidence, migration/restore | distinguish scan claim from review; block critical/high; explain recovery evidence |
| LG-TKT-W10-D04 | TKT-W10-D04 / CAP-REL-01 | reproducible handover, diagrams/ADR, evidence index, release notes | guide newcomer without hidden state; link every release claim; disclose risks |
| LG-TKT-W10-D05 | TKT-W10-D05 / CAP-REL-01 | clean checkout, regression/demo, incident reasoning, trade-off defense | reproduce release; defend five decisions; issue evidence-based verdict |

## Global unlock rule

For every row:

- `design_unlock_condition`: learning gate `PASSED` and SE-1 complete.
- `skeleton_unlock_condition`: learning gate `PASSED`, SE-1 complete, SE-2 reviewed
  and DoR `READY`.
- A learning pass never bypasses prerequisite, contract approval, Foundation Gate, test
  or evidence requirements.

## Gate depth and reference matrix

| Gate | Target level | Reference profile | Required comparison/defense |
|---|---|---|---|
| LG-TKT-W04-D01 | C4_DEFEND | REF-CONTRACT | canonical state vs duplicated context; classify evidence |
| LG-TKT-W04-D02 | C3_INTEGRATE | REF-IDENTITY | plaintext vs adaptive/hash storage; fixed vs rotated session |
| LG-TKT-W04-D03 | C4_DEFEND | REF-SECURITY | Gateway verification vs owner authorization |
| LG-TKT-W04-D04 | C4_DEFEND | REF-SECURITY | deny-by-default vs allow-by-default; 401/403/404 |
| LG-TKT-W04-D05 | C4_DEFEND | REF-SECURITY | framework coupling vs clean boundary |
| LG-TKT-W05-D01 | C3_INTEGRATE | REF-DATA-API | public vs admin DTO; lifecycle vs arbitrary mutation |
| LG-TKT-W05-D02 | C4_DEFEND | REF-POSTGRES-DATA | application validation vs database constraint |
| LG-TKT-W05-D03 | C4_DEFEND | REF-DATA-API | bounded query/index alternatives and workload trade-off |
| LG-TKT-W05-D04 | C3_INTEGRATE | REF-DATA-API | additive vs breaking API change |
| LG-TKT-W05-D05 | C4_DEFEND | REF-DATA-API | mock vs real-boundary evidence |
| LG-TKT-W06-D01 | C4_DEFEND | REF-POSTGRES-DATA | transition policy and temporal-overlap strategies |
| LG-TKT-W06-D02 | C4_DEFEND | REF-POSTGRES-DATA | constraint type and migration alternatives |
| LG-TKT-W06-D03 | C4_DEFEND | REF-EVENTS | publish timing/2PC/outbox alternatives |
| LG-TKT-W06-D04 | C4_DEFEND | REF-EVENTS | atomic state+outbox vs unsafe crash windows |
| LG-TKT-W06-D05 | C4_DEFEND | REF-EVENTS | at-least-once replay and evidence boundary |
| LG-TKT-W07-D01 | C3_INTEGRATE | REF-BOOKING | live lookup vs owned snapshot; client vs server time |
| LG-TKT-W07-D02 | C4_DEFEND | REF-CONCURRENCY | mutex/distributed lock/row lock/serializable |
| LG-TKT-W07-D03 | C4_DEFEND | REF-BOOKING | durable idempotency vs in-memory dedup |
| LG-TKT-W07-D04 | C4_DEFEND | REF-CONCURRENCY | owner/expiry/race test alternatives |
| LG-TKT-W07-D05 | C4_DEFEND | REF-CONCURRENCY | sequential test vs simultaneous real-DB evidence |
| LG-TKT-W08-D01 | C4_DEFEND | REF-PAYMENT | redirect authority vs verified provider outcome |
| LG-TKT-W08-D02 | C4_DEFEND | REF-WORKER | retry forever vs bounded retry/DLQ |
| LG-TKT-W08-D03 | C4_DEFEND | REF-PAYMENT | raw signature/durable dedup vs trusted payload |
| LG-TKT-W08-D04 | C4_DEFEND | REF-PAYMENT | provider port vs SDK/domain coupling |
| LG-TKT-W08-D05 | C4_DEFEND | REF-PAYMENT | happy-only E2E vs duplicate/crash recovery evidence |
| LG-TKT-W09-D01 | C4_DEFEND | REF-DATA-API | measured index vs speculative index |
| LG-TKT-W09-D02 | C3_INTEGRATE | REF-OBSERVABILITY | metric label vs trace/log field; redaction |
| LG-TKT-W09-D03 | C4_DEFEND | REF-OPERATIONS | liveness/readiness and retry-budget alternatives |
| LG-TKT-W09-D04 | C4_DEFEND | REF-OPERATIONS | rollback vs forward-fix; backup vs restore evidence |
| LG-TKT-W09-D05 | C4_DEFEND | REF-OPERATIONS | plan vs measured operational evidence |
| LG-TKT-W10-D01 | C4_DEFEND | REF-RELEASE | contract drift severity and remediation scope |
| LG-TKT-W10-D02 | C4_DEFEND | REF-RELEASE | reproducible workload vs misleading benchmark |
| LG-TKT-W10-D03 | C4_DEFEND | REF-RELEASE | automated scan vs manual threat/recovery evidence |
| LG-TKT-W10-D04 | C4_DEFEND | REF-RELEASE | hidden local knowledge vs reproducible handoff |
| LG-TKT-W10-D05 | C4_DEFEND | REF-RELEASE | aggregate score vs hard-gate release verdict |
