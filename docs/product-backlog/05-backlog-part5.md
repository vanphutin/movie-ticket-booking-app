# 5. Detailed Product Backlog — Phần 5 (Epic 11–12: Operations & Release)

---

## BL-041: Audit log cho hành động quan trọng

- **Epic:** Epic 11 — Audit, Integration Logs & Operations
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, tôi cần ghi lại mọi hành động quan trọng (ai, làm gì, lúc nào, trên resource nào).
- **Business value:** Truy vết, compliance, debug. Audit log là yêu cầu production bắt buộc.
- **Functional requirements:**
  - Ghi: actor_id, actor_role, action, resource_type, resource_id, details (JSON), ip_address, timestamp.
  - Actions cần log: CREATE/UPDATE/DELETE movie, cinema, screen, showtime. CREATE/CANCEL booking. Payment confirm. Check-in. AI content apply/reject. Seat hold/release.
  - Implement qua interceptor hoặc decorator.
- **Acceptance criteria:**
  - [ ] Mọi hành động admin → audit log record.
  - [ ] Booking create/cancel → audit log.
  - [ ] Payment confirm → audit log.
  - [ ] Check-in → audit log.
  - [ ] AI content apply → audit log.
  - [ ] Log không chứa password hoặc token.
- **API endpoints:** Không (internal). Admin query: BL-043.
- **Database impact:** INSERT `audit_logs`. Cần index trên `actor_id`, `resource_type`, `created_at`.
- **Edge cases:** Rất nhiều audit logs → pagination, cần retention policy (out of MVP scope nhưng cần awareness).
- **Failure cases:** Audit log insert fail → KHÔNG block main operation. Log error separately.
- **Security/data consistency risks:** KHÔNG log sensitive data (password, token, card info).
- **Evidence required:** DB audit_logs entries, curl trigger action → verify log.
- **Definition of Done:**
  - [ ] Audit log hoạt động cho tất cả critical actions.
  - [ ] Interceptor/decorator reusable.
  - [ ] No sensitive data leak.
  - [ ] Unit test.

---

## BL-042: Integration log cho third-party calls

- **Epic:** Epic 11
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, tôi cần log request/response cho mọi cuộc gọi tới payOS và AI provider.
- **Business value:** Debug integration issues, monitor third-party health.
- **Functional requirements:**
  - Ghi: provider, method, url, request_body (truncated), response_status, response_body (truncated), latency_ms, error, timestamp.
  - Truncate body > 10KB.
  - Áp dụng cho: payOS create payment link, payOS webhook, AI provider calls, embedding provider calls.
- **Acceptance criteria:**
  - [ ] Mỗi payOS call → integration log.
  - [ ] Mỗi AI/embedding call → integration log.
  - [ ] Webhook receive → integration log.
  - [ ] Error cases → log error message + stack.
- **API endpoints:** Không (internal). Admin query: BL-044.
- **Database impact:** INSERT `integration_logs`.
- **Edge cases:** Body chứa binary data → skip body, log metadata only.
- **Security/data consistency risks:** KHÔNG log API keys, secrets, PII.
- **Evidence required:** Integration log entries cho payOS + AI calls.
- **Definition of Done:** Logging đầy đủ, truncation, no sensitive data, unit test.

---

## BL-043: Admin xem audit logs

- **Epic:** Epic 11
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn xem audit logs để truy vết hành động trong hệ thống.
- **Acceptance criteria:**
  - [ ] GET `/admin/audit-logs` → danh sách (pagination).
  - [ ] Filter: actor_id, resource_type, action, date range.
  - [ ] Sort: created_at desc (mặc định).
- **API endpoints:** `GET /admin/audit-logs`
- **Database impact:** SELECT `audit_logs` với filters.
- **Edge cases:** Không có logs → `data: []`.
- **Definition of Done:** API hoạt động, filters, RBAC Admin, unit test.

---

## BL-044: Admin xem integration logs

- **Epic:** Epic 11
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn xem integration logs để debug vấn đề tích hợp payOS/AI.
- **Acceptance criteria:**
  - [ ] GET `/admin/integration-logs` → danh sách (pagination).
  - [ ] Filter: provider, status, date range.
- **API endpoints:** `GET /admin/integration-logs`
- **Database impact:** SELECT `integration_logs`.
- **Definition of Done:** API hoạt động, filters, RBAC Admin, unit test.

---

## BL-045: Request ID tracking

- **Epic:** Epic 11
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, tôi cần gắn request ID duy nhất cho mỗi API request để trace logs xuyên suốt.
- **Business value:** Debug production issues — tìm tất cả log entries liên quan đến 1 request.
- **Functional requirements:**
  - Generate UUID request ID cho mỗi incoming request.
  - Truyền request ID qua context (cls-hooked hoặc AsyncLocalStorage).
  - Gắn request ID vào response header: `X-Request-Id`.
  - Gắn request ID vào mọi log entry.
- **Acceptance criteria:**
  - [ ] Mỗi response có header `X-Request-Id`.
  - [ ] Log entries chứa request ID.
  - [ ] Audit log chứa request ID.
  - [ ] Integration log chứa request ID.
- **API endpoints:** Cross-cutting (middleware).
- **Database impact:** Thêm column `request_id` vào `audit_logs`, `integration_logs` nếu cần.
- **Edge cases:** Client gửi `X-Request-Id` header → sử dụng hoặc override (design decision).
- **Definition of Done:** Request ID trong response header + logs, unit test.

---

## BL-046: Unit test cho service layer

- **Epic:** Epic 12 — Testing, Docker, CI & Release Evidence
- **Priority:** Must
- **Actor:** Developer
- **User story:** Là Developer, tôi cần unit test cho service layer để đảm bảo business logic đúng.
- **Business value:** Chất lượng code, confidence khi refactor, evidence cho portfolio.
- **Functional requirements:**
  - Jest test framework.
  - Mock repositories/providers.
  - Coverage ≥ 60% cho service files.
  - Test: happy path + ít nhất 1 edge case cho mỗi service method quan trọng.
- **Acceptance criteria:**
  - [ ] `npm run test` pass.
  - [ ] Coverage report generated.
  - [ ] Service coverage ≥ 60%.
  - [ ] Critical services (seat hold, booking, payment) coverage ≥ 80%.
- **Evidence required:** Test output, coverage report screenshot.
- **Definition of Done:** Tests pass, coverage met, CI integrated.

---

## BL-047: E2E test cho core flows

- **Epic:** Epic 12
- **Priority:** Must
- **Actor:** Developer
- **User story:** Là Developer, tôi cần e2e test cho core flows để đảm bảo API hoạt động end-to-end.
- **Functional requirements:**
  - Supertest + test database.
  - Flows cần test: auth (register → login → access), seat hold (hold → verify seat status), booking (hold → booking → verify), webhook (simulate webhook → verify tickets).
- **Acceptance criteria:**
  - [ ] `npm run test:e2e` pass.
  - [ ] Auth flow e2e pass.
  - [ ] Seat hold e2e pass.
  - [ ] Booking flow e2e pass.
  - [ ] Webhook flow e2e pass.
- **Evidence required:** E2E test output.
- **Definition of Done:** E2E tests pass, CI integrated.

---

## BL-048: Docker Compose setup

- **Epic:** Epic 12
- **Priority:** Must
- **Actor:** Developer
- **User story:** Là Developer/Reviewer, tôi muốn chạy full stack bằng một lệnh Docker Compose.
- **Functional requirements:**
  - Services: app (NestJS), postgres (+ pgvector), redis.
  - Dockerfile multi-stage build.
  - Environment variables qua .env file.
  - Volume cho persistent data.
  - Health checks.
- **Acceptance criteria:**
  - [ ] `docker compose up` chạy full stack.
  - [ ] App connect được PostgreSQL và Redis.
  - [ ] Migration chạy tự động hoặc qua command.
  - [ ] Swagger accessible tại localhost.
- **Evidence required:** Docker compose up log, Swagger screenshot.
- **Definition of Done:** Full stack chạy từ zero, documented trong README.

---

## BL-049: GitHub Actions CI pipeline

- **Epic:** Epic 12
- **Priority:** Must
- **Actor:** Developer
- **User story:** Là Developer, tôi muốn CI tự động chạy lint, test, build khi push code.
- **Acceptance criteria:**
  - [ ] Push/PR trigger CI.
  - [ ] Steps: install → lint → test → build.
  - [ ] CI pass → green badge.
  - [ ] CI fail → notification.
- **Evidence required:** CI pipeline screenshot, green badge.
- **Definition of Done:** CI hoạt động, badge trong README.

---

## BL-050: Swagger/OpenAPI documentation

- **Epic:** Epic 12
- **Priority:** Must
- **Actor:** Developer, Reviewer
- **User story:** Là Reviewer, tôi muốn xem Swagger UI để hiểu toàn bộ API.
- **Acceptance criteria:**
  - [ ] Swagger UI accessible tại `/api/docs`.
  - [ ] Mọi endpoint có description, request/response schema.
  - [ ] Auth endpoints có lock icon.
  - [ ] DTO schemas hiển thị.
- **Evidence required:** Swagger UI screenshot.
- **Definition of Done:** Tất cả endpoints documented trong Swagger.

---

## BL-051 → BL-055: Migration, Seed, Release Notes, README, Interview Notes

Các backlog items này là **evidence và documentation** — chi tiết trong Section 10 (Final Portfolio Evidence).

- **BL-051:** Database migration chạy từ clean DB → evidence migration log.
- **BL-052:** Seed data tạo movies, cinemas, screens, seats, showtimes, users demo.
- **BL-053:** Release notes v1.0.0 — scope, limitations, future improvements.
- **BL-054:** README portfolio — setup, architecture, core flows, tech highlights.
- **BL-055:** Interview preparation notes — 3-minute pitch, deep-dive Q&A.

**Priority:** Tất cả Must. **Evidence:** Documents hoàn chỉnh, reviewable.
