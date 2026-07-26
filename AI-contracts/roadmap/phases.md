# Phases

Các phase kế thừa `roadmap/operating-model.md`. Week là cadence dự kiến; exit gate,
không phải thời gian trôi qua, quyết định phase tiếp theo có được mở.

| Phase | Weeks | Goal / actor outcome | Prerequisite / contracts | Core / stretch | Entry → exit | Failure/evidence/remediation |
|---|---:|---|---|---|---|---|
| P0 Contract & Foundation Gate | 4/D1 | Freeze baseline and prove foundations; learner knows bounded scope | `FG-001`, all contract families | contract baseline / optional extra ADR | Foundation evidence → contract review approved | ambiguity drill; contract map; unresolved item blocks implementation |
| P1 Identity, Gateway, AuthN/Z | 4 | Customer authenticates safely; admin/customer boundaries enforced | P0; AUTH/SEC/ARCH | auth slice / MFA design only | P0 verified → W4 gate | replay/deny/timeout; OpenAPI, tests, trace; focused REM |
| P2 Catalog & Scheduling | 5–6 | Guest finds published content; Admin manages valid schedule | P1 actor context | movie/cinema/screen/seat/showtime / search enhancement | W4 → W6 gate | overlap/invalid publish; migration/query/event evidence |
| P3 Reliable Event Contract | 6 | Booking receives reliable showtime facts | Catalog publish state | outbox/inbox contract / broker tuning | contract approved → replay fixture verified | duplicate/lost/out-of-order drills; lag/DLQ evidence |
| P4 Booking & Concurrency | 7 | Customer holds one seat without oversell | P3 event snapshot | hold/booking / waitlist design | W6 → race/replay verified | synchronized race, expiry, deadlock; DB evidence |
| P5 Payment, Ticket & Worker | 8 | Customer pays and receives exactly one ticket | confirmed booking | mock/provider webhook/worker / refund design | W7 → W8 gate | duplicate/out-of-order/crash/DLQ; reconciliation evidence |
| P6 Observability & Operations | 9 | Operator diagnoses, degrades and restores system | core E2E | telemetry/resilience/restore / dashboard polish | W8 → operational gate | latency, dependency death, backup restore; measured evidence |
| P7 Release & Handover | 10 | Reviewer reproduces and learner defends system | W9 gate, feature freeze | audit/release/interview / no new domain | freeze → `REL-001` | clean checkout, load/race/replay/security/incident; remediate blockers only |

Mỗi phase dùng rollback theo contract: schema ưu tiên forward-fix/expand-contract, deploy có compatible predecessor, event/API giữ consumer window. Failure drill fail tạo remediation cùng phase; không mở phase sau.
