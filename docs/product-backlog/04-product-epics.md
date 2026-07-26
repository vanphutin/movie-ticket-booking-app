# 4. Product Epics

---

## Epic 1: Public Movie Catalog

**Business purpose:** Cho phép Guest và Customer duyệt thông tin phim, rạp, suất chiếu và seat map — đây là điểm đầu vào của toàn bộ funnel đặt vé.

**Technical purpose:** Thiết lập foundation NestJS project: module structure, controller/service pattern, DTO validation, Swagger, pagination, filtering, global error handling.

**Included user stories:**
- BL-001: Xem danh sách phim (filter, pagination)
- BL-002: Xem chi tiết phim và trailer
- BL-003: Xem danh sách rạp
- BL-004: Xem suất chiếu theo phim/rạp/ngày
- BL-005: Xem seat map của suất chiếu

**Risks:**
- Performance: Pagination không đúng cách dẫn đến full table scan.
- Data: Movie status filter sai logic dẫn đến hiển thị phim không phù hợp.

**Completion criteria:**
- [ ] Tất cả 5 API public hoạt động, có Swagger docs.
- [ ] Pagination, filter, sort hoạt động đúng.
- [ ] Response format thống nhất.
- [ ] Unit test cho service layer.
- [ ] Seed data cho demo.

---

## Epic 2: Cinema, Screen, Seat & Showtime Management

**Business purpose:** Admin cần quản lý cơ sở hạ tầng rạp chiếu (rạp, phòng chiếu, layout ghế) và lập lịch suất chiếu — là nền tảng để tạo ra inventory bán vé.

**Technical purpose:** Thiết kế database schema phức tạp với quan hệ nhiều tầng (cinema → screen → seats, showtime → showtime_seats snapshot), migration strategy, seed data.

**Included user stories:**
- BL-006: Admin tạo/cập nhật rạp
- BL-007: Admin tạo phòng chiếu và layout ghế
- BL-008: Admin tạo suất chiếu (trigger seat snapshot)
- BL-009: Admin cập nhật/hủy suất chiếu
- BL-010: Admin quản lý phim (CRUD)
- BL-011: Admin quản lý trailer (publish/unpublish)

**Risks:**
- Data integrity: Showtime seat snapshot phải đồng bộ chính xác với screen seats tại thời điểm tạo.
- Business rule: Không được sửa/xóa suất chiếu đã có booking CONFIRMED.
- Migration: Schema phức tạp, cần test migration từ clean DB.

**Completion criteria:**
- [ ] Tất cả Admin CRUD API hoạt động.
- [ ] Showtime tạo thành công → showtime_seats được snapshot.
- [ ] Business rule bảo vệ suất chiếu có booking.
- [ ] ERD document cập nhật.
- [ ] Migration chạy từ clean DB không lỗi.

---

## Epic 3: Authentication & RBAC

**Business purpose:** Phân biệt người dùng, bảo vệ API theo vai trò, đảm bảo chỉ người có quyền mới truy cập được tài nguyên tương ứng.

**Technical purpose:** JWT access/refresh token, bcrypt password hashing, RBAC guard, token rotation, logout/revoke, middleware authentication.

**Included user stories:**
- BL-012: Customer đăng ký tài khoản
- BL-013: Customer đăng nhập
- BL-014: Refresh token rotation
- BL-015: Logout / Revoke refresh token
- BL-016: RBAC Guard cho API protection

**Risks:**
- Security: JWT secret leak, refresh token không revoke đúng, brute force login.
- Data: Duplicate email registration race condition.
- Token: Refresh token rotation không atomic dẫn đến token reuse attack.

**Completion criteria:**
- [ ] Register → Login → Access protected API → Refresh → Logout flow hoàn chỉnh.
- [ ] RBAC guard chặn đúng theo role.
- [ ] Password không lưu plaintext.
- [ ] Refresh token hash trong DB, revoke khi logout.
- [ ] Test cho auth happy path + unauthorized access.

---

## Epic 4: Seat Hold & Concurrency Control

**Business purpose:** Đây là **trái tim kỹ thuật** của dự án — cho phép customer giữ ghế tạm thời mà không bị double-booking, ngay cả khi nhiều customer cùng chọn một ghế đồng thời.

**Technical purpose:** Transaction isolation, pessimistic locking (`SELECT ... FOR UPDATE`), race condition handling, automatic expiry via background jobs.

**Included user stories:**
- BL-017: Customer giữ ghế (seat hold)
- BL-018: Customer hủy seat hold
- BL-019: System tự động expire seat hold

**Risks:**
- **Critical — Double booking:** Nếu locking strategy sai, hai customer có thể hold cùng ghế. Đây là risk cao nhất của dự án.
- **Deadlock:** Multiple seat hold trong cùng transaction có thể gây deadlock nếu không order locks.
- **Performance:** Lock contention cao khi nhiều customer cùng chọn suất chiếu hot.
- **Data consistency:** Seat hold expire nhưng showtime_seat không được release.

**Completion criteria:**
- [ ] Customer hold ghế thành công, showtime_seat chuyển sang HELD.
- [ ] Hai customer hold cùng ghế → một thành công, một nhận lỗi 409 Conflict.
- [ ] Race condition test có evidence (concurrent requests, chỉ 1 thắng).
- [ ] Seat hold tự động expire sau timeout.
- [ ] Hủy seat hold release ghế về AVAILABLE.
- [ ] Evidence: lock strategy document, race test output.

---

## Epic 5: Booking & Ticket Flow

**Business purpose:** Chuyển đổi seat hold thành booking chính thức và phát hành vé sau khi thanh toán thành công — hoàn tất luồng mua vé.

**Technical purpose:** State machine (booking states, payment states), atomic state transitions, ticket generation, customer booking history.

**Included user stories:**
- BL-020: Customer tạo booking từ seat hold
- BL-021: Customer xem lịch sử booking
- BL-022: Customer hủy booking
- BL-023: Hệ thống tạo ticket khi booking CONFIRMED
- BL-024: Customer xem vé
- BL-025: Staff tra cứu vé bằng ticket code
- BL-026: Staff check-in vé

**Risks:**
- State machine: Transition sai state dẫn đến booking ở trạng thái invalid.
- Data: Booking tạo nhưng seat hold đã expire → phải reject.
- Ticket: Duplicate ticket creation khi webhook replay.
- Check-in: Vé check-in cho sai suất chiếu.

**Completion criteria:**
- [ ] Create booking → showtime_seats HELD → booking PENDING_PAYMENT.
- [ ] Booking CONFIRMED → tickets tạo tự động.
- [ ] Customer xem booking history và ticket details.
- [ ] Staff tra cứu + check-in vé.
- [ ] State machine diagram documented.
- [ ] E2E test cho booking flow.

---

## Epic 6: Payment Integration with payOS

**Business purpose:** Tích hợp thanh toán thực tế qua cổng payOS để hoàn tất quy trình mua vé, đảm bảo tiền chuyển đúng thì vé mới được phát hành.

**Technical purpose:** Payment provider abstraction, webhook processing, signature verification, idempotency, amount reconciliation, integration logging.

**Included user stories:**
- BL-027: Customer tạo payOS payment link
- BL-028: System xử lý payOS webhook
- BL-029: Webhook idempotency
- BL-030: Customer xem payment status

**Risks:**
- **Security:** Webhook signature spoofing — ai đó giả mạo webhook để "thanh toán" giả.
- **Data consistency:** Payment PAID nhưng booking không chuyển CONFIRMED do transaction failure.
- **Idempotency:** Webhook retry tạo duplicate tickets.
- **Amount mismatch:** Amount từ payOS không khớp với booking amount.
- **Integration:** payOS downtime hoặc thay đổi API.

**Completion criteria:**
- [ ] Payment link tạo thành công, trả checkoutUrl.
- [ ] Webhook verify signature pass.
- [ ] Webhook idempotent: gọi 3 lần cùng data → chỉ xử lý 1 lần.
- [ ] Amount/orderCode/paymentLinkId đối soát đúng.
- [ ] Transaction atomic: payment PAID + booking CONFIRMED + seats SOLD + tickets created.
- [ ] Integration log cho mọi payOS request/response.
- [ ] PaymentProvider abstraction để mock trong test.

---

## Epic 7: Webhook & Idempotency

> **Lưu ý:** Epic này thực tế được merge vào Epic 6 (Payment Integration) vì webhook và idempotency là phần không thể tách rời của payment flow. Tuy nhiên, giữ riêng epic để nhấn mạnh tầm quan trọng kỹ thuật.

**Business purpose:** Đảm bảo hệ thống xử lý đúng mọi webhook event từ payOS, kể cả khi payOS retry nhiều lần — không bỏ sót, không xử lý trùng.

**Technical purpose:** Idempotency key design, signature verification, replay protection, failure recovery, integration logging.

**Included user stories:**
- BL-028: System xử lý payOS webhook (shared với Epic 6)
- BL-029: Webhook idempotency (shared với Epic 6)
- BL-031: Webhook failure logging & alerting

**Risks:**
- Replay attack: Kẻ tấn công replay webhook cũ.
- Timeout: Webhook processing quá lâu, payOS retry.
- Partial failure: Webhook process nửa chừng bị lỗi, state inconsistent.

**Completion criteria:**
- [ ] Signature verification chặn mọi webhook không hợp lệ.
- [ ] Replay cùng webhook 5 lần → state không đổi sau lần 1.
- [ ] Webhook failure được log đầy đủ vào integration_logs.
- [ ] Evidence: curl replay test, log output.

---

## Epic 8: Background Jobs

**Business purpose:** Tự động dọn dẹp seat holds và bookings hết hạn để ghế không bị "treo" vĩnh viễn, đảm bảo inventory luôn chính xác.

**Technical purpose:** BullMQ job queue, delayed jobs, retry strategy, job failure handling, Redis connection, worker lifecycle.

**Included user stories:**
- BL-019: System expire seat hold (shared với Epic 4)
- BL-032: System expire pending booking
- BL-033: System generate movie embeddings (shared với Epic 9)

**Risks:**
- Redis downtime: Jobs không được enqueue hoặc không được process.
- Race condition: Job expire seat hold chạy cùng lúc customer tạo booking.
- Memory leak: BullMQ worker không cleanup đúng cách.
- Duplicate processing: Job được process nhiều lần.

**Completion criteria:**
- [ ] Seat hold expire job: showtime_seat → AVAILABLE, seat_hold → EXPIRED.
- [ ] Booking expire job: booking → EXPIRED, release seats, payment → EXPIRED.
- [ ] Embedding generation job: document → vector → status READY.
- [ ] Job failure → retry (tối đa 3 lần) → log error.
- [ ] BullMQ dashboard hoặc log evidence cho job execution.

---

## Epic 9: AI Semantic Movie Search

**Business purpose:** Cho phép khách hàng tìm phim bằng ngôn ngữ tự nhiên ("phim nhẹ nhàng để đi date tối nay") thay vì chỉ filter theo genre/keyword — tạo trải nghiệm tìm kiếm thông minh.

**Technical purpose:** pgvector extension, vector embeddings, cosine similarity search, provider abstraction (mock/real), embedding lifecycle management.

**Included user stories:**
- BL-034: AI semantic movie search
- BL-035: Admin rebuild embeddings cho phim
- BL-036: System auto-generate embeddings khi phim được tạo/cập nhật
- BL-033: System generate movie embeddings job (shared với Epic 8)

**Risks:**
- Embedding quality: Text profile không tốt → search không relevant.
- pgvector setup: Extension cần install riêng trong PostgreSQL.
- Cost: Real embedding provider (OpenAI) tốn tiền per request.
- Latency: Embedding generation chậm, block API response nếu không async.

**Completion criteria:**
- [ ] Movie search trả kết quả với relevance score.
- [ ] Mock provider hoạt động trong test/CI (không tốn tiền).
- [ ] Real provider hoạt động trong demo.
- [ ] Embeddings auto-generate khi phim tạo/cập nhật.
- [ ] Admin có thể rebuild embeddings.
- [ ] AI request logs ghi đầy đủ.

---

## Epic 10: Admin AI Content Workflow

**Business purpose:** Giúp Admin tạo nội dung phim (synopsis, trailer description, tags) nhanh hơn bằng AI, nhưng vẫn đảm bảo human approval trước khi publish.

**Technical purpose:** AI provider integration, prompt engineering, schema validation cho AI output, draft/apply state machine, content versioning.

**Included user stories:**
- BL-037: Admin tạo AI content draft cho phim
- BL-038: Admin tạo AI trailer description draft
- BL-039: Admin duyệt/từ chối AI content draft
- BL-040: AI request logging

**Risks:**
- AI hallucination: AI tạo nội dung sai sự thật hoặc không phù hợp.
- Auto-apply bypass: Logic bug cho phép AI content apply mà không qua admin approval.
- PII leak: Prompt vô tình chứa thông tin nhạy cảm.
- Provider failure: AI provider timeout/error → cần fallback graceful.

**Completion criteria:**
- [ ] Admin request AI draft → nhận content ở trạng thái DRAFT.
- [ ] Admin review → Apply (nội dung cập nhật vào phim) hoặc Reject.
- [ ] AI output validate qua DTO schema trước khi lưu.
- [ ] Không có path nào AI content tự apply mà không qua admin.
- [ ] Prompt không chứa PII.
- [ ] AI request log ghi prompt + response + latency.

---

## Epic 11: Audit, Integration Logs & Operations

**Business purpose:** Cung cấp khả năng truy vết (traceability) cho mọi hành động quan trọng trong hệ thống — ai làm gì, lúc nào, kết quả ra sao — phục vụ debug, compliance và operations.

**Technical purpose:** Audit log interceptor/decorator, integration log service, structured logging, request ID correlation, query/filter audit data.

**Included user stories:**
- BL-041: Audit log cho hành động quan trọng
- BL-042: Integration log cho third-party calls
- BL-043: Admin xem audit logs
- BL-044: Admin xem integration logs
- BL-045: Request ID tracking

**Risks:**
- Performance: Logging quá nhiều gây slow down API.
- Storage: Log table phình to nếu không có retention policy.
- Sensitive data: Log vô tình chứa password, token, card info.

**Completion criteria:**
- [ ] Mọi hành động admin, payment, booking, check-in đều có audit log.
- [ ] Mọi payOS/AI call đều có integration log.
- [ ] Request ID xuất hiện trong log và response header.
- [ ] Admin query audit/integration logs với filter.
- [ ] Log không chứa sensitive data (password, token).

---

## Epic 12: Testing, Docker, CI & Release Evidence

**Business purpose:** Đảm bảo code quality, reproducible environment, automated verification — là bằng chứng về engineering maturity cho portfolio và phỏng vấn.

**Technical purpose:** Jest unit/e2e testing, Docker Compose multi-service, GitHub Actions CI pipeline, Swagger generation, migration verification.

**Included user stories:**
- BL-046: Unit test cho service layer
- BL-047: E2E test cho core flows
- BL-048: Docker Compose setup
- BL-049: GitHub Actions CI pipeline
- BL-050: Swagger/OpenAPI documentation
- BL-051: Database migration strategy
- BL-052: Seed data cho demo
- BL-053: Release notes v1.0.0
- BL-054: README portfolio
- BL-055: Interview preparation notes

**Risks:**
- Flaky tests: Test phụ thuộc external service hoặc timing.
- Docker: Port conflict, volume permission, image size quá lớn.
- CI: Secrets management trong GitHub Actions.
- Migration: Migration order sai gây lỗi trên clean DB.

**Completion criteria:**
- [ ] Unit test coverage ≥ 60% service layer.
- [ ] E2E test cho: auth, seat hold, booking, payment webhook.
- [ ] `docker compose up` chạy full stack từ zero.
- [ ] CI pipeline: lint → test → build pass.
- [ ] Swagger UI accessible, mô tả đầy đủ.
- [ ] Migration chạy từ clean DB.
- [ ] Seed data tạo đủ dữ liệu demo.
- [ ] Release notes, README, interview notes hoàn chỉnh.

---

## Dependency Map giữa các Epic

```
Epic 1 (Public Catalog) ──────────────────────────────────────┐
    │                                                          │
Epic 2 (Cinema/Screen/Showtime Mgmt) ──┐                      │
    │                                   │                      │
Epic 3 (Auth & RBAC) ──────────────┐    │                      │
    │                              │    │                      │
    ▼                              ▼    ▼                      │
Epic 4 (Seat Hold) ◄──────── depends on Epic 1, 2, 3          │
    │                                                          │
    ▼                                                          │
Epic 5 (Booking & Ticket) ◄── depends on Epic 4               │
    │                                                          │
    ▼                                                          │
Epic 6 (Payment / payOS) ◄── depends on Epic 5                │
Epic 7 (Webhook / Idempotency) ◄── depends on Epic 6          │
    │                                                          │
    ▼                                                          │
Epic 8 (Background Jobs) ◄── depends on Epic 4, 5, 6          │
    │                                                          │
Epic 9 (AI Semantic Search) ◄── depends on Epic 1, 8          │
    │                                                          │
    ▼                                                          │
Epic 10 (Admin AI Content) ◄── depends on Epic 2, 9           │
    │                                                          │
    ▼                                                          │
Epic 11 (Audit/Integration Logs) ◄── cross-cutting, mọi epic  │
    │                                                          │
    ▼                                                          ▼
Epic 12 (Testing/Docker/CI/Release) ◄── depends on tất cả epic
```
