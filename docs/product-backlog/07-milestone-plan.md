# 7. Milestone Plan - Roadmap 10 tuần cường độ cao

Đừng học backend bằng cách học framework trước. Framework chỉ là công cụ. Backend thật sự nằm ở HTTP, API design, database, authentication, authorization, transaction, cache, queue, logging, monitoring, security, scalability và deployment. Framework có thể đổi; tư duy backend thì đi theo bạn cả sự nghiệp.

Nhịp chính: tuần 1-3 chưa bắt đầu dự án thật; Thứ 2-4 học chuyên sâu, Thứ 5-7 làm mini labs tương ứng. Tuần 4-10 là 7 tuần vừa học topic mới vừa làm project.

## Tuần 1: Backend mindset, Internet, HTTP và API fundamentals

**Phase:** Core Theory + Mini Labs

**Mode:** Thứ 2-4 học chuyên sâu. Thứ 5-7 làm mini labs từ kiến thức Thứ 2-4. Chưa bắt đầu dự án thật.

**Focus:** Backend mindset, client-server, DNS/TCP/TLS, HTTP, REST, status code, headers, cookies, CORS, API contract.

**Outputs**
- [ ] Protocol notes
- [ ] HTTP/status-code decision table
- [ ] curl/Postman HTTP lab evidence
- [ ] API contract mini lab
- [ ] Interview answers

---

## Tuần 2: TypeScript/OOP, NestJS mental model và backend code organization

**Phase:** Core Theory + Mini Labs

**Mode:** Thứ 2-4 học chuyên sâu. Thứ 5-7 làm mini labs từ kiến thức Thứ 2-4. Chưa bắt đầu dự án thật.

**Focus:** TypeScript type system, OOP, composition, dependency injection, module boundary, controller/service/repository responsibility.

**Outputs**
- [ ] TypeScript notes
- [ ] OOP mini lab
- [ ] DI notes
- [ ] NestJS lifecycle diagram
- [ ] NestJS lifecycle mini lab
- [ ] Interview answers

---

## Tuần 3: Database, security, transaction và production thinking foundation

**Phase:** Deep Foundation + Mini Labs

**Mode:** Thứ 2-4 học chuyên sâu. Thứ 5-7 làm mini labs từ kiến thức Thứ 2-4. Chưa bắt đầu dự án thật.

**Focus:** SQL modeling, constraints, transaction, auth/authz, queue/outbox, observability và microservice boundary/data ownership foundation.

**Outputs**
- [ ] SQL/DB notes
- [ ] Schema and constraint mini lab
- [ ] Transaction/lock lab
- [ ] Security mini lab
- [ ] Production primitives lab notes
- [ ] Service ownership/context map trước tuần 4

---

## Tuần 4: Identity/Auth, Gateway và identity database

**Phase:** Project Delivery

**Mode:** Học mới buổi đầu tuần, áp dụng ngay vào project cuối tuần.

**Focus:** Gateway + Identity Service, `identity_db`, register/login/refresh/logout/profile, RBAC, validation, error/timeout contract, request/trace ID và Swagger.

**Outputs**
- [ ] Running Gateway + Identity Service
- [ ] Auth/profile API through Gateway
- [ ] Service ownership/Compose diagram
- [ ] Swagger
- [ ] Error contract
- [ ] curl/log evidence

---

## Tuần 5: Movie, Trailer và catalog database

**Phase:** Project Delivery

**Mode:** DB theory nâng cao + implement schema thật.

**Focus:** Khởi tạo `catalog_db` cho `movies` + `movie_trailers`, public/admin API, lifecycle, constraints/index/EXPLAIN.

**Outputs**
- [ ] ERD
- [ ] Migrations
- [ ] Seed data
- [ ] Index notes
- [ ] EXPLAIN evidence
- [ ] Movie/trailer public + admin flow evidence

---

## Tuần 6: Cinema, Screen, Seat, Showtime và Catalog events

**Phase:** Project Delivery

**Mode:** Security theory + implement auth boundary.

**Focus:** Mở rộng `catalog_db`, schedule invariants, showtime lifecycle, transactional outbox và versioned event contract.

**Outputs**
- [ ] Cinema/screen/seat/showtime ERD và migration
- [ ] Schedule constraints và overlap decision
- [ ] Public/admin showtime APIs
- [ ] Versioned showtime event contract
- [ ] Transaction + outbox evidence
- [ ] Consumer fixture cho tuần 7

---

## Tuần 7: Booking Service critical consistency: seat hold, ticket và idempotency

**Phase:** Project Delivery

**Mode:** Transaction/concurrency theory + implement critical flow.

**Focus:** Booking-owned seat snapshot, local transaction/lock/constraints, Catalog event consumer, idempotency and race tests.

**Outputs**
- [ ] State diagrams
- [ ] Transaction design
- [ ] Race test/logs
- [ ] E2E flow
- [ ] Audit logs
- [ ] Catalog-event → Booking snapshot evidence

---

## Tuần 8: Outbox/worker, payment/webhook, cache và semantic search optional

**Phase:** Project Delivery

**Mode:** Async/integration theory + implement selected production features.

**Focus:** Outbox relay/inbox, worker retry/DLQ, payment provider/webhook, service-local cache; Catalog semantic search only if core is stable.

**Outputs**
- [ ] Cache strategy
- [ ] Job design
- [ ] Webhook replay evidence
- [ ] Optional semantic search docs
- [ ] Outbox/inbox/DLQ evidence
- [ ] Integration logs

---

## Tuần 9: Microservice observability, resilience và deployment

**Phase:** Project Delivery

**Mode:** Operations theory + harden/deploy project.

**Focus:** Cross-service logs/traces/event IDs, per-service health/readiness, timeout/retry owner, Compose/CI, deployment order and runbook.

**Outputs**
- [ ] Log schema
- [ ] Health checks
- [ ] Rate limit/timeout policy
- [ ] Deploy guide
- [ ] Runbook evidence
- [ ] Cross-service trace/smoke evidence

---

## Tuần 10: Distributed system capstone, final evidence và mock interview

**Phase:** Capstone

**Mode:** Final synthesis at maximum intensity.

**Focus:** Service context/data ownership/API-event contracts, distributed failure/load evidence, release compatibility and mock interview.

**Outputs**
- [ ] System design doc
- [ ] Final README
- [ ] Evidence pack
- [ ] Release notes
- [ ] Mock interview answers
- [ ] Service topology and trade-off defense
