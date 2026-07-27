# Canonical daily tickets — weeks 4–10

> CCR-005 route overlay: Week 5 covers `API-CAT-001..003`, `API-CAT-010..011`
> and optional `API-CAT-016..018`; Week 6 covers `API-CAT-004..009`,
> `API-CAT-012..015`, `API-CAT-019..021`; Week 7 covers `API-BKG-001..008`
> and `API-TKT-002..003`; Week 8 covers `API-PAY-001..005` plus `API-TKT-001`
> through the provider-neutral port and payOS adapter; Week 9 covers
> `API-OPS-001..002`. This overlay supersedes narrower endpoint ranges in legacy rows.
> Staff and AI routes are not authorized by this MVP roadmap.

## Ticket profile (áp dụng cho mọi row)

Mỗi row là một daily contract ticket hoàn chỉnh khi kết hợp với profile này:

```yaml
definition_of_ready: [DOR-001, DOR-002, DOR-003, DOR-004, DOR-005, DOR-006, DOR-007, DOR-008, DOR-009]
learning_gate_id: "LG-<ticket-id>; specialization in learning/ticket-learning-map-weeks-4-10.md"
out_of_scope: "domain/capability ngày sau; refactor không phục vụ outcome; production claim không có evidence"
assumptions: "chỉ assumptions trong referenced contracts/design note; mâu thuẫn => BLOCKED"
design_requirements: "SE-1 + SE-2, một rejected alternative, trade-off, test matrix, compatibility/rollback"
implementation_constraints: "SE-3; service-local ownership; diff nhỏ; no synchronize/shared DB/secret"
verification_plan: "prediction → command → exit code/observation; positive + negative/failure; map AC/test/evidence"
definition_of_done: [DOD-001, DOD-002, DOD-003, DOD-004, DOD-005, DOD-006, DOD-007, DOD-008, DOD-009, DOD-010, DOD-011]
reviewer_focus: "scope, contract, invariant, security, ownership, compatibility, test boundary, evidence, explanation"
core_or_stretch: CORE
estimated_time: "80% planned + 20% debug/remediation capacity"
status: NOT_STARTED
```

`Scope/AC/failure/security/evidence` dưới đây là phần specialization bắt buộc; expected files là pattern dự kiến, không cho phép AI bịa file đã tồn tại.

Mỗi row có đúng một learning gate `LG-<ticket-id>`. Learning gate `PASSED` chỉ mở
SE-1/design theo unlock rule; không tự cấp quyền implementation hoặc thay prerequisite.

Các vertical-slice/module MVP `D05` có post-MVP optimization gate:

| Source MVP | Optimization gate | Dependency unlock |
|---|---|---|
| TKT-W04-D05 | OPT-W04-IDN | trước W5 |
| TKT-W05-D05 | OPT-W05-CAT | trước W6 |
| TKT-W06-D05 | OPT-W06-SCH-EVT | trước W7 |
| TKT-W07-D05 | OPT-W07-BKG | trước W8 |
| TKT-W08-D05 | OPT-W08-PAY-WRK | trước W9 |
| TKT-W09-D05 | OPT-W09-OPS | trước W10 |
| TKT-W10-D05 | OPT-W10-REL | release verdict |

Gate chỉ eligible sau source MVP `VERIFIED`. Dependency mở khi disposition là
`NOT_REQUIRED`, `OPTIMIZED_VERIFIED` hoặc valid `DEFERRED_WITH_BUDGET`, và optimization
BLOCKER/HIGH bằng 0. Tuần 9–10 vẫn chạy system-wide hardening dù gate module trước đó
`NOT_REQUIRED`.

## Week 4 — P0/P1, M0/M1

| Ticket | Capability / contracts | Actor + business/learning outcome | Prerequisite | Scope / invariant | Acceptance criteria | Failure + security | Expected files / evidence | Next |
|---|---|---|---|---|---|---|---|---|
| TKT-W04-D01 | CAP-CON-01; PRD-001,SCOPE-001,ARCH-001,ARCH-009,DOR-001 | Learner: baseline project contract và chứng minh đủ foundation để kickoff | FG-001 evidence submitted | audit conflicts, freeze MVP/out-scope, map owners/trust boundaries; chưa scaffold | AC-W04-D01-1 source map reviewed; AC-2 Foundation Gate reviewer verdict; AC-3 unanswered conflict=0 hoặc BLOCKED | vague requirement, fake evidence; không đưa secret vào audit | `AI-contracts/`, gate/design note, review record, manifest | TKT-W04-D02 |
| TKT-W04-D02 | CAP-IDN-01; DATA-IDN-001,DATA-001,SEC-001,SEC-002 | Customer: identity/session data design bảo vệ credential | D01 VERIFIED | ERD/migration/seed plan cho user/role/session; token hash/unique/lifecycle | AC-1 owner/invariants mapped; AC-2 clean+upgrade plan; AC-3 negative constraint matrix | duplicate email, replay session; plaintext token/password | design/ERD/migration plan; review evidence | D03 |
| TKT-W04-D03 | CAP-SEC-01; SEC-001..007,API-AUTH-002..004,ARCH-008 | Customer: token lifecycle/Gateway pipeline design an toàn | D02 VERIFIED | login-refresh-reuse-logout state/sequence, correlation and error policy | AC-1 reuse revokes family; AC-2 401/403 matrix; AC-3 logs redact | stolen/replayed/expired token, dependency timeout | state/sequence, threat/test matrix, reviewed design | D04 |
| TKT-W04-D04 | CAP-IDN-01; API-AUTH-001..005,API-COM-001..006,SEC-003 | Actors: reviewed OpenAPI/RBAC contract trước code | D03 VERIFIED | request/response/error/idempotency/RBAC deny cases; contract review only | AC-1 OpenAPI schemas complete; AC-2 deny matrix; AC-3 contract tests planned | enumeration, mass assignment, untrusted actor header | OpenAPI/design/test matrix/contract review | D05 |
| TKT-W04-D05 | CAP-IDN-01,CAP-SEC-01; ARCH-001..016,DATA-IDN-001,TEST-001,DOD-001 | Customer: register/login/refresh/logout/me qua Gateway | D04 VERIFIED | one vertical slice, migration/seed/tests/correlation | AC-1 clean migrate+seed; AC-2 auth APIs match OpenAPI; AC-3 deny/replay tests; AC-4 trace Gateway→Identity | bad/replayed token, unauthorized/forbidden, timeout; secret redaction | scoped source/migration/tests/OpenAPI; command+trace manifest | W4 gate then W5D1 |

## Week 5 — P2, M2

| Ticket | Capability / contracts | Actor + outcome | Prerequisite | Scope / invariant | Acceptance criteria | Failure + security | Expected files / evidence | Next |
|---|---|---|---|---|---|---|---|---|
| TKT-W05-D01 | CAP-CAT-01; BUS-001,DATA-SM-001,ARCH-003 | Guest/Admin: movie/trailer lifecycle and owner decisions | W4 gate VERIFIED | lifecycle/use-case/non-goal; no implementation | AC-1 state transitions; AC-2 public/admin DTO split; AC-3 owner map | invalid publish/archive; unauthorized admin | design/state/decision evidence | D02 |
| TKT-W05-D02 | CAP-CAT-01; DATA-CAT-001,DATA-001..005 | Admin: catalog schema/migration protects uniqueness | D01 VERIFIED | movie/trailer ERD, constraints, migration/seed | AC-1 clean+upgrade plan; AC-2 idempotent seed; AC-3 constraint tests | duplicate/invalid metadata; unsafe seed | ERD/migration/test plan evidence | D03 |
| TKT-W05-D03 | CAP-CAT-01; API-CAT-001,API-COM-005,DATA-005 | Guest: bounded deterministic movie queries | D02 VERIFIED | filter/sort/page/index design and query baseline | AC-1 allowlist/bounds; AC-2 stable order; AC-3 EXPLAIN baseline/decision | injection/unbounded query, N+1 | query/test/index note, plan artifact | D04 |
| TKT-W05-D04 | CAP-CAT-01; API-CAT-001..003,SEC-003,API-COM-003 | Guest/Admin: reviewed API/auth/error contract | D03 VERIFIED | OpenAPI, trusted context, ownership deny/test matrix | AC-1 schemas/status/errors; AC-2 401/403/404 policy; AC-3 compatibility reviewed | actor spoof, information leak | OpenAPI/contract tests/design review | D05 |
| TKT-W05-D05 | CAP-CAT-01; all W5 refs,TEST-001 | Guest/Admin: movie/trailer slice chạy theo contract | D04 VERIFIED | migration/entities/API/query/tests only | AC-1 public/admin flows; AC-2 constraint/auth negatives; AC-3 clean migration; AC-4 query plan | invalid transition, duplicate, forbidden | source/migration/tests/OpenAPI; outputs/EXPLAIN/PR manifest | W5 gate then W6D1 |

## Week 6 — P2/P3, M3

| Ticket | Capability / contracts | Actor + outcome | Prerequisite | Scope / invariant | Acceptance criteria | Failure + security | Expected files / evidence | Next |
|---|---|---|---|---|---|---|---|---|
| TKT-W06-D01 | CAP-SCH-01; BUS-001,BUS-002,DATA-SM-002,ARCH-003 | Admin/Guest: valid scheduling model | W5 gate VERIFIED | cinema/screen/seat/showtime ownership/state/overlap decision | AC-1 invariants/owner; AC-2 state machine; AC-3 rejected overlap strategy | duplicate seat, overlap, publish invalid | ERD/state/ADR evidence | D02 |
| TKT-W06-D02 | CAP-SCH-01; DATA-CAT-001,DATA-001..005 | Admin: additive schema enforces schedule | D01 VERIFIED | migration constraints/index/upgrade/rollback | AC-1 clean+W5 upgrade; AC-2 seat/overlap negatives; AC-3 index rationale | destructive migration/data loss | migrations/test plan/query evidence | D03 |
| TKT-W06-D03 | CAP-EVT-01; EVT-COM-001..005,EVT-CAT-001,EVT-CAT-002 | Booking consumer: reliable versioned showtime facts | D02 VERIFIED | envelope/outbox/inbox/order/retry/DLQ contract; no publisher code | AC-1 schemas/fixtures; AC-2 failure matrix; AC-3 compatibility decision | duplicate/lost/late/out-of-order; sensitive payload | AsyncAPI/schema/fixtures/failure design review | D04 |
| TKT-W06-D04 | CAP-SCH-01,CAP-EVT-01; API-CAT-004..009,EVT-CAT-001..002 | Admin/Guest/consumer: approved API/event sequences | D03 VERIFIED | OpenAPI + event sequence, atomicity/test matrix | AC-1 API contracts; AC-2 state+outbox atomic plan; AC-3 consumer fixture test | publish rollback, broker down, unauthorized admin | design/OpenAPI/schema/test matrix review | D05 |
| TKT-W06-D05 | CAP-SCH-01,CAP-EVT-01; DATA-CAT-001,EVT-COM-002,TEST-002,TEST-003 | Admin publishes schedule; Booking-ready event emitted reliably | D04 VERIFIED | scheduling API + additive migration + outbox publisher slice | AC-1 constraints/API; AC-2 atomic state/outbox; AC-3 versioned fixture; AC-4 negatives/replay | overlap, duplicate publish, broker failure | source/migrations/tests/contracts; DB/event/trace manifest | W6 gate then W7D1 |

## Week 7 — P4, M4

| Ticket | Capability / contracts | Actor + outcome | Prerequisite | Scope / invariant | Acceptance criteria | Failure + security | Expected files / evidence | Next |
|---|---|---|---|---|---|---|---|---|
| TKT-W07-D01 | CAP-BKG-01; BUS-003,BUS-004,DATA-SM-003,DATA-SM-004 | Customer: owned snapshot/hold/booking state design | W6 gate VERIFIED | owner/state/expiry/authorization; no code | AC-1 state/invariant map; AC-2 ownership policy; AC-3 expiry semantics | stale snapshot, expired hold, cross-user access | ERD/state/sequence evidence | D02 |
| TKT-W07-D02 | CAP-CONC-01; DATA-BKG-001,TEST-002,TEST-004 | Customers: one winner under race | D01 VERIFIED | transaction/isolation/lock/constraint/deadlock design | AC-1 transaction boundary; AC-2 exactly-one-winner test design; AC-3 retry policy | lost update, deadlock, oversell | ADR/timeline/concurrency test plan | D03 |
| TKT-W07-D03 | CAP-BKG-01; EVT-COM-002..004,API-IDN-001,DATA-BKG-001 | Consumer/client: duplicate/replay safe | D02 VERIFIED | inbox/dedup/idempotency/unknown outcome design | AC-1 same/different payload behavior; AC-2 inbox atomic; AC-3 replay fixture | duplicate event/command, crash window | design/schema/fixture evidence | D04 |
| TKT-W07-D04 | CAP-BKG-01,CAP-CONC-01; API-BKG-001..005,TEST-004,SEC-003 | Customer: approved consume→hold→confirm contracts/tests | D03 VERIFIED | API/event sequence, race/failure/security matrix | AC-1 schemas/errors; AC-2 every failure expected state; AC-3 real-DB boundary | 401/403, expiry during confirm, simultaneous holds | OpenAPI/design/test review | D05 |
| TKT-W07-D05 | CAP-BKG-01,CAP-CONC-01; all W7 refs,DOD-001 | Customer: hold/book without oversell | D04 VERIFIED | snapshot consumer + hold/confirm/expiry + DB tests/E2E | AC-1 exactly one race winner; AC-2 duplicate safe; AC-3 owner E2E; AC-4 final DB state | replay, race, deadlock, expired/cross-user | source/migrations/tests; contender/output/DB/PR manifest | W7 gate then W8D1 |

## Week 8 — P5, M5

| Ticket | Capability / contracts | Actor + outcome | Prerequisite | Scope / invariant | Acceptance criteria | Failure + security | Expected files / evidence | Next |
|---|---|---|---|---|---|---|---|---|
| TKT-W08-D01 | CAP-PAY-01; BUS-005,BUS-006,DATA-SM-004..006 | Customer: coherent payment/booking/ticket states | W7 gate VERIFIED | state/reconciliation/order table | AC-1 allowed transitions; AC-2 mismatch policy; AC-3 ticket once invariant | redirect spoof, out-of-order success/fail | state/decision evidence | D02 |
| TKT-W08-D02 | CAP-WRK-01; EVT-COM-002..004,ARCH-005,OPS-001 | Operator: durable bounded worker recovery | D01 VERIFIED | relay/expiry/retry/backoff/DLQ/crash matrix | AC-1 ACK/effect windows; AC-2 bounded retry; AC-3 operator replay | poison job, crash before/after effect, retry storm | sequence/runbook/harness plan evidence | D03 |
| TKT-W08-D03 | CAP-PAY-01; API-PAY-002,SEC-007,SEC-008,DATA-PAY-001 | Provider/Customer: verified idempotent webhook | D02 VERIFIED | raw signature, reference/amount/currency, redaction fixtures | AC-1 invalid signature denied; AC-2 duplicate no effect; AC-3 mismatch quarantined | replay/out-of-order/PII log | fixtures/threat/test/redaction evidence | D04 |
| TKT-W08-D04 | CAP-PAY-01,CAP-WRK-01; API-PAY-001..002,API-TKT-001,ARCH-014 | Customer: provider adapter/transaction contract approved | D03 VERIFIED | port/adapter, no network in DB txn, unknown reconciliation | AC-1 API schemas; AC-2 failure matrix; AC-3 rollback/compatibility | timeout/unknown, SDK leak, duplicate create | OpenAPI/design/test review | D05 |
| TKT-W08-D05 | CAP-PAY-01,CAP-WRK-01; DATA-PAY-001,EVT-BKG-001..002,EVT-PAY-001 | Customer receives exactly one ticket; Operator sees recovery | D04 VERIFIED | mock payment/webhook/ticket/expiry worker vertical slice | AC-1 Booking→Payment→Ticket E2E; AC-2 duplicate/crash safe; AC-3 retry/DLQ; AC-4 redaction | invalid signature, mismatch, crash/replay | source/migrations/tests; E2E/replay/DLQ/log manifest | W8 gate then W9D1 |

## Week 9 — P6, M6

| Ticket | Capability / contracts | Actor + outcome | Prerequisite | Scope / invariant | Acceptance criteria | Failure + security | Expected files / evidence | Next |
|---|---|---|---|---|---|---|---|---|
| TKT-W09-D01 | CAP-OPS-01; DATA-005,NFR-001,TEST-002 | Operator: evidence-based query optimization | W8 gate VERIFIED | inventory/dataset/EXPLAIN baseline/index trade-off | AC-1 three core queries; AC-2 before/after plan; AC-3 write/storage cost | tiny dataset/misleading benchmark | query/plan/index decision evidence | D02 |
| TKT-W09-D02 | CAP-OBS-01; OBS-001,OBS-002,SEC-007 | Operator: correlate request/event without leaks | D01 VERIFIED | signal matrix, propagation, bounded metrics, redaction | AC-1 cross-service trace; AC-2 redaction test; AC-3 bounded labels | lost context, token/PII log, cardinality | telemetry config/tests/trace manifest | D03 |
| TKT-W09-D03 | CAP-OPS-01; NFR-002,OPS-001,EVT-COM-004 | User/Operator: bounded degradation/shutdown | D02 VERIFIED | timeout/retry budget, readiness, pool, drain | AC-1 bounded timeout; AC-2 readiness changes; AC-3 no new work after drain | retry storm, hanging call, false-ready | config/failure tests/timeline evidence | D04 |
| TKT-W09-D04 | CAP-OPS-01; MIG-001,CI-001,OPS-001 | Operator: recoverable deploy/data/runbook design | D03 VERIFIED | backup/restore, migration/rollback, CI/Compose/runbook | AC-1 restore success criteria; AC-2 clean CI gates; AC-3 deploy/rollback sequence | corrupt backup, incompatible deploy, secret artifact | runbook/CI/restore plan review | D05 |
| TKT-W09-D05 | CAP-OBS-01,CAP-OPS-01; all W9 refs | Operator: measured, observable, recoverable system | D04 VERIFIED | implement index/telemetry/health/shutdown; drills only | AC-1 before/after plans; AC-2 trace/failure smoke; AC-3 backup restore; AC-4 clean CI/build | dependency down/slow, SIGTERM, restore failure | config/tests/runbook; plan/trace/smoke/restore manifest | W9 gate then W10D1 |

## Week 10 — P7, M7 (feature freeze)

| Ticket | Capability / contracts | Actor + outcome | Prerequisite | Scope / invariant | Acceptance criteria | Failure + security | Expected files / evidence | Next |
|---|---|---|---|---|---|---|---|---|
| TKT-W10-D01 | CAP-REL-01; ARCH-001..016,API-COM-006,EVT-COM-005 | Reviewer: ownership/contract drift inventory | W9 gate VERIFIED | audit only; no new domain | AC-1 every invariant owner; AC-2 consumer impact; AC-3 drift becomes finding/REM | hidden shared DB, undocumented breaking change | audit/traceability/findings evidence | D02 |
| TKT-W10-D02 | CAP-REL-01; TEST-004,TEST-006,NFR-001 | Reviewer: correctness under load/race/replay/failure | D01 VERIFIED | workload model + regression; fix only blockers | AC-1 p50/p95/error context; AC-2 invariants intact; AC-3 limitations | no warmup, false success, data corruption | load config/output/analysis manifest | D03 |
| TKT-W10-D03 | CAP-REL-01; SEC-001..012,MIG-001,OPS-001 | Reviewer: security/data/operations release audit | D02 VERIFIED | scans + manual threat audit + clean/upgrade/restore | AC-1 unresolved critical/high=0; AC-2 migration/restore; AC-3 redacted evidence | exposed secret, failed rollback/restore | audit/scan/migration/restore evidence | D04 |
| TKT-W10-D04 | CAP-REL-01; EVD-001,PR-001,REL-001 | New operator/reviewer: reproducible handover | D03 VERIFIED | README/diagrams/ADR/release/demo/evidence index; no feature | AC-1 newcomer instructions; AC-2 every release claim linked; AC-3 risks honest | stale diagram, unverifiable claim | docs/diagrams/index/release notes review | D05 |
| TKT-W10-D05 | CAP-REL-01; REL-001,DOD-001,GATE-001 | Reviewer: clean release and learner defense | D04 VERIFIED | clean checkout install→migrate→seed→run→test→demo + interview/incident | AC-1 clean regression; AC-2 core E2E/race/replay/failure; AC-3 five trade-offs defended; AC-4 release verdict | hidden local state, failed drill, missing evidence | clean-run outputs/demo/review/gate manifest | release decision |

## Weekly gates

Mỗi cuối tuần dùng `templates/weekly-gate.md`: core tickets `VERIFIED`, BLOCKER/HIGH = 0, evidence observed, capability exit outcome đạt. `CONDITIONAL_PASS` chỉ ghi nhận phần đạt và tạo remediation; không mở dependency.
