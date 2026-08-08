# Traceability Matrix

> Đây là projection legacy từ dữ liệu progress. Traceability normative tuần 4–10 nằm ở [`AI-contracts/16-traceability-policy.md`](../AI-contracts/16-traceability-policy.md), ticket catalog và evidence manifest; trạng thái `DONE` ở đây không đồng nghĩa `VERIFIED`. Các liên kết `study/` bên dưới là tham chiếu lịch sử tới workspace đào tạo cũ và không phải current repository targets.

Ma trận được sinh từ `tien-do-hoc-tap/progress.json`. Tuần 4–10 phải tuân theo [kế hoạch delivery tăng trưởng](progressive-delivery-plan-weeks-4-10.md).

| Tuần | Ngày | Curriculum topic | Issue | Status | Study ticket |
|---:|---|---|---|---|---|
| 1 | Monday | Theory Deep Dive: Backend mindset: framework là công cụ, backend là protocol + data + failure handling | [#1](https://github.com/vanphutin/education-backend/issues/1) | TODO | [ticket](../study/tuan-1/thu-2.md) |
| 1 | Tuesday | Theory Deep Dive: Internet fundamentals: DNS, TCP/IP, TLS, latency, timeout, request lifecycle | [#2](https://github.com/vanphutin/education-backend/issues/2) | TODO | [ticket](../study/tuan-1/thu-3.md) |
| 1 | Wednesday | Theory Deep Dive: HTTP/API fundamentals: method, status code, headers, body, cookie, cache, CORS, REST constraints | [#3](https://github.com/vanphutin/education-backend/issues/3) | TODO | [ticket](../study/tuan-1/thu-4.md) |
| 1 | Thursday | Mini Lab: HTTP lab: dùng curl/Postman mô phỏng request lifecycle, headers, status code, timeout và CORS | [#4](https://github.com/vanphutin/education-backend/issues/4) | TODO | [ticket](../study/tuan-1/thu-5.md) |
| 1 | Friday-Saturday | Mini Lab: API design lab: thiết kế API contract nhỏ, idempotency, pagination, filtering và error response | [#5](https://github.com/vanphutin/education-backend/issues/5) | TODO | [ticket](../study/tuan-1/thu-6-7.md) |
| 2 | Monday | Theory Deep Dive: TypeScript foundation: type, interface, class, generic, error typing, runtime vs compile time | [#6](https://github.com/vanphutin/education-backend/issues/6) | TODO | [ticket](../study/tuan-2/thu-2.md) |
| 2 | Tuesday | Theory Deep Dive: OOP for backend: encapsulation, composition over inheritance, polymorphism, value object mindset | [#7](https://github.com/vanphutin/education-backend/issues/7) | TODO | [ticket](../study/tuan-2/thu-3.md) |
| 2 | Wednesday | Theory Deep Dive: Dependency Injection and modular design: why DI exists, dependency direction, testability | [#8](https://github.com/vanphutin/education-backend/issues/8) | TODO | [ticket](../study/tuan-2/thu-4.md) |
| 2 | Thursday | Mini Lab: TypeScript/OOP lab: viết domain mini models, validation rules và error handling không dùng framework | [#9](https://github.com/vanphutin/education-backend/issues/9) | TODO | [ticket](../study/tuan-2/thu-5.md) |
| 2 | Friday-Saturday | Mini Lab: NestJS mental model lab: module/controller/service/provider mini app, chỉ để hiểu framework như công cụ | [#10](https://github.com/vanphutin/education-backend/issues/10) | TODO | [ticket](../study/tuan-2/thu-6-7.md) |
| 3 | Monday | Theory Deep Dive: SQL and data modeling: table, relation, normalization, constraints, migration mindset | [#11](https://github.com/vanphutin/education-backend/issues/11) | TODO | [ticket](../study/tuan-3/thu-2.md) |
| 3 | Tuesday | Theory Deep Dive: Database performance and consistency: index, query plan, transaction, isolation, locking, N+1 | [#12](https://github.com/vanphutin/education-backend/issues/12) | TODO | [ticket](../study/tuan-3/thu-3.md) |
| 3 | Wednesday | Theory Deep Dive: Security and production primitives: auth/authz, password hashing, token, cache, queue, logging, monitoring, deployment | [#13](https://github.com/vanphutin/education-backend/issues/13) | TODO | [ticket](../study/tuan-3/thu-4.md) |
| 3 | Thursday | Mini Lab: Database lab: schema nhỏ, constraints, indexes, EXPLAIN, transaction rollback và lock behavior | [#14](https://github.com/vanphutin/education-backend/issues/14) | TODO | [ticket](../study/tuan-3/thu-5.md) |
| 3 | Friday-Saturday | Mini Lab: Security/production lab: password hashing, JWT mock, rate limit idea, queue/cache/logging simulation | [#15](https://github.com/vanphutin/education-backend/issues/15) | TODO | [ticket](../study/tuan-3/thu-6-7.md) |
| 4 | Monday | Project Delivery: Identity/Gateway ownership, authentication vs authorization và auth threat model | [#16](https://github.com/vanphutin/education-backend/issues/16) | TODO | [ticket](../study/tuan-4/thu-2.md) |
| 4 | Tuesday | Project Delivery: Thiết kế identity_db: users, roles, user_roles, refresh_sessions; migration và seed | [#17](https://github.com/vanphutin/education-backend/issues/17) | TODO | [ticket](../study/tuan-4/thu-3.md) |
| 4 | Wednesday | Project Delivery: Password hashing, access/refresh lifecycle, rotation/revocation và Gateway request pipeline | [#18](https://github.com/vanphutin/education-backend/issues/18) | TODO | [ticket](../study/tuan-4/thu-4.md) |
| 4 | Thursday | Project Delivery: Thiết kế auth/profile API, actor-context contract, RBAC deny matrix và test plan | [#19](https://github.com/vanphutin/education-backend/issues/19) | TODO | [ticket](../study/tuan-4/thu-5.md) |
| 4 | Friday-Saturday | Project Delivery: Implement Gateway + Identity vertical slice, Compose, OpenAPI, tests và evidence | [#20](https://github.com/vanphutin/education-backend/issues/20) | TODO | [ticket](../study/tuan-4/thu-6-7.md) |
| 5 | Monday | Project Delivery: Movie/Trailer ownership, lifecycle và public/admin use cases | [#21](https://github.com/vanphutin/education-backend/issues/21) | TODO | [ticket](../study/tuan-5/thu-2.md) |
| 5 | Tuesday | Project Delivery: Thiết kế catalog_db: movies, movie_trailers; constraints, migration và seed | [#22](https://github.com/vanphutin/education-backend/issues/22) | TODO | [ticket](../study/tuan-5/thu-3.md) |
| 5 | Wednesday | Project Delivery: Pagination/filter/sort, indexes, N+1 và EXPLAIN query plan | [#23](https://github.com/vanphutin/education-backend/issues/23) | TODO | [ticket](../study/tuan-5/thu-4.md) |
| 5 | Thursday | Project Delivery: Map trusted actor context vào Catalog authorization; API/error/test design | [#24](https://github.com/vanphutin/education-backend/issues/24) | TODO | [ticket](../study/tuan-5/thu-5.md) |
| 5 | Friday-Saturday | Project Delivery: Implement Movie + Trailer flow, migrations, tests và query-plan evidence | [#25](https://github.com/vanphutin/education-backend/issues/25) | TODO | [ticket](../study/tuan-5/thu-6-7.md) |
| 6 | Monday | Project Delivery: Cinema/Screen/Seat/Showtime ownership, invariants và lifecycle | [#26](https://github.com/vanphutin/education-backend/issues/26) | TODO | [ticket](../study/tuan-6/thu-2.md) |
| 6 | Tuesday | Project Delivery: Additive Catalog migration, seat/schedule constraints và query indexes | [#27](https://github.com/vanphutin/education-backend/issues/27) | TODO | [ticket](../study/tuan-6/thu-3.md) |
| 6 | Wednesday | Project Delivery: Transactional outbox, event envelope/versioning và at-least-once failure model | [#28](https://github.com/vanphutin/education-backend/issues/28) | TODO | [ticket](../study/tuan-6/thu-4.md) |
| 6 | Thursday | Project Delivery: Thiết kế API/event schema, overlap decision, sequence/failure matrix và consumer fixture | [#29](https://github.com/vanphutin/education-backend/issues/29) | TODO | [ticket](../study/tuan-6/thu-5.md) |
| 6 | Friday-Saturday | Project Delivery: Implement scheduling + publish/cancel outbox flow, tests và evidence | [#30](https://github.com/vanphutin/education-backend/issues/30) | TODO | [ticket](../study/tuan-6/thu-6-7.md) |
| 7 | Monday | Project Delivery: Booking-owned showtime snapshot và hold/booking/seat state machines | [#31](https://github.com/vanphutin/education-backend/issues/31) | TODO | [ticket](../study/tuan-7/thu-2.md) |
| 7 | Tuesday | Project Delivery: PostgreSQL isolation, row locking, constraints, deadlock và transaction boundary | [#32](https://github.com/vanphutin/education-backend/issues/32) | TODO | [ticket](../study/tuan-7/thu-3.md) |
| 7 | Wednesday | Project Delivery: Inbox/dedup, idempotency key, replay và unknown outcome | [#33](https://github.com/vanphutin/education-backend/issues/33) | TODO | [ticket](../study/tuan-7/thu-4.md) |
| 7 | Thursday | Project Delivery: Thiết kế consume-event, hold, booking sequences và race/failure test plan | [#34](https://github.com/vanphutin/education-backend/issues/34) | TODO | [ticket](../study/tuan-7/thu-5.md) |
| 7 | Friday-Saturday | Project Delivery: Implement Booking consumer + hold/booking flow, concurrent/replay tests và evidence | [#35](https://github.com/vanphutin/education-backend/issues/35) | TODO | [ticket](../study/tuan-7/thu-6-7.md) |
| 8 | Monday | Project Delivery: Payment/booking/ticket state machines và reconciliation rules | [#36](https://github.com/vanphutin/education-backend/issues/36) | TODO | [ticket](../study/tuan-8/thu-2.md) |
| 8 | Tuesday | Project Delivery: Worker, outbox relay, expiry, retry/backoff/DLQ và crash/replay semantics | [#37](https://github.com/vanphutin/education-backend/issues/37) | TODO | [ticket](../study/tuan-8/thu-3.md) |
| 8 | Wednesday | Project Delivery: Webhook signature, idempotency, amount/reference verification và log redaction | [#38](https://github.com/vanphutin/education-backend/issues/38) | TODO | [ticket](../study/tuan-8/thu-4.md) |
| 8 | Thursday | Project Delivery: Thiết kế provider adapter, transaction boundaries và integration failure matrix | [#39](https://github.com/vanphutin/education-backend/issues/39) | TODO | [ticket](../study/tuan-8/thu-5.md) |
| 8 | Friday-Saturday | Project Delivery: Implement payment mock/webhook, ticket issuance, worker và replay evidence | [#40](https://github.com/vanphutin/education-backend/issues/40) | TODO | [ticket](../study/tuan-8/thu-6-7.md) |
| 9 | Monday | Project Delivery: Query inventory, slow query, EXPLAIN, statistics và index trade-offs | [#41](https://github.com/vanphutin/education-backend/issues/41) | TODO | [ticket](../study/tuan-9/thu-2.md) |
| 9 | Tuesday | Project Delivery: Structured logs, metrics, trace/request/event correlation và redaction | [#42](https://github.com/vanphutin/education-backend/issues/42) | TODO | [ticket](../study/tuan-9/thu-3.md) |
| 9 | Wednesday | Project Delivery: Timeout/retry budget, readiness, graceful shutdown và connection pools | [#43](https://github.com/vanphutin/education-backend/issues/43) | TODO | [ticket](../study/tuan-9/thu-4.md) |
| 9 | Thursday | Project Delivery: Backup/restore, migration/rollback, CI/Compose release topology và runbook | [#44](https://github.com/vanphutin/education-backend/issues/44) | TODO | [ticket](../study/tuan-9/thu-5.md) |
| 9 | Friday-Saturday | Project Delivery: Implement/measure indexes, telemetry, failure smoke và restore drill | [#45](https://github.com/vanphutin/education-backend/issues/45) | TODO | [ticket](../study/tuan-9/thu-6-7.md) |
| 10 | Monday | Project Delivery: Audit service/data/invariant ownership và API/event compatibility | [#46](https://github.com/vanphutin/education-backend/issues/46) | TODO | [ticket](../study/tuan-10/thu-2.md) |
| 10 | Tuesday | Project Delivery: Load/race/replay/failure tests và bottleneck analysis | [#47](https://github.com/vanphutin/education-backend/issues/47) | TODO | [ticket](../study/tuan-10/thu-3.md) |
| 10 | Wednesday | Project Delivery: Security, migration, backup/restore, logs và operational audit | [#48](https://github.com/vanphutin/education-backend/issues/48) | TODO | [ticket](../study/tuan-10/thu-4.md) |
| 10 | Thursday | Project Delivery: Hoàn thiện README, diagrams, ADR, release notes, demo script và evidence index | [#49](https://github.com/vanphutin/education-backend/issues/49) | TODO | [ticket](../study/tuan-10/thu-5.md) |
| 10 | Friday-Saturday | Project Delivery: Clean-checkout regression, end-to-end demo và mock interview | [#50](https://github.com/vanphutin/education-backend/issues/50) | TODO | [ticket](../study/tuan-10/thu-6-7.md) |

## Progressive database gates

| Tuần | Database gate |
|---:|---|
| 4 | `identity_db` khởi tạo; auth/profile chạy |
| 5 | `catalog_db` khởi tạo cho movie/trailer |
| 6 | Catalog additive migration cho cinema/showtime/outbox |
| 7 | `booking_db` khởi tạo cho snapshot/hold/booking/inbox/outbox |
| 8 | Booking additive migration cho payment/ticket/webhook |
| 9 | Index/operability migration có EXPLAIN và restore evidence |
| 10 | Clean migration/seed/regression; không mở domain mới |
