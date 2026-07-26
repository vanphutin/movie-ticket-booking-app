# 10. Final Portfolio Evidence

Tài liệu này liệt kê toàn bộ evidence cuối khóa cần có để chứng minh project đủ chuẩn đi phỏng vấn Backend Fresher/Junior.

---

## 10.1. Evidence bắt buộc

| # | Evidence | Mô tả | Vị trí khuyến nghị | Backlog |
|--:|----------|-------|---------------------|---------|
| 1 | **README Portfolio** | Setup guide, architecture overview, core flows, tech highlights, screenshots/logs | `README.md` | BL-054 |
| 2 | **Swagger/OpenAPI Docs** | Toàn bộ API endpoints có description, schema, status codes | Swagger UI `/api/docs` | BL-050 |
| 3 | **ERD & Database Notes** | ERD diagram, constraints, indexes, migration notes, design rationale | `docs/db/erd.md` | BL-051 |
| 4 | **State Machine Diagrams** | Seat hold, booking, payment, ticket check-in state transitions | `docs/design/state-machines.md` | BL-020 |
| 5 | **Race Condition Evidence** | Concurrent seat hold test output, lock strategy ADR, transaction isolation | `docs/evidence/seat-race-condition.md` | BL-017 |
| 6 | **Test Output** | Unit test + e2e test output, coverage report | `docs/evidence/test-output.md` | BL-046, BL-047 |
| 7 | **Docker Demo** | `docker compose up` từ zero → full stack running | `docs/evidence/docker-demo.md` | BL-048 |
| 8 | **CI Pipeline** | GitHub Actions pass screenshot, green badge | `docs/evidence/ci-pipeline.md` | BL-049 |
| 9 | **payOS Integration Flow** | Payment link creation, webhook verify, idempotency replay test, amount reconciliation | `docs/integrations/payos-flow.md` | BL-027→031 |
| 10 | **AI Semantic Search Design** | Embedding documents, pgvector query, SQL filters, mock vs real provider | `docs/ai/semantic-search.md` | BL-033, BL-034 |
| 11 | **AI Admin Content Workflow** | Draft → Apply/Reject flow, human approval, schema validation | `docs/ai/admin-content-workflow.md` | BL-037→039 |
| 12 | **Audit & Integration Logs** | Sample log entries, log query API, request ID correlation | `docs/evidence/logging.md` | BL-041→045 |
| 13 | **Release Notes v1.0.0** | Scope hoàn thành, known limitations, future improvements | `docs/release/v1.0.0.md` | BL-053 |
| 14 | **Interview Notes** | 3-minute pitch, deep-dive Q&A (15+ câu), tradeoff explanations | `docs/interview/notes.md` | BL-055 |

---

## 10.2. Cấu trúc 3-Minute Pitch

Chuẩn bị pitch theo flow:

```
1. Problem (30s)
   "Hệ thống đặt vé xem phim cần giải quyết: double-booking khi nhiều người cùng chọn ghế,
   thanh toán qua payment gateway với webhook, và tìm phim bằng AI."

2. Solution (60s)
   "Backend NestJS + PostgreSQL. Seat hold dùng pessimistic locking chống race condition.
   Payment qua payOS với webhook idempotent. AI search bằng pgvector embeddings."

3. Architecture highlights (60s)
   "Module structure chuẩn NestJS. Provider abstraction cho payOS và AI.
   BullMQ background jobs cho expiry. RBAC 4 roles. Audit + integration logging."

4. Evidence (30s)
   "Race condition test output. Webhook replay test. Docker Compose one-command setup.
   CI green. Swagger full docs. 60%+ test coverage."
```

---

## 10.3. Deep-Dive Q&A chuẩn bị

Chuẩn bị trả lời thuyết phục cho các câu hỏi sau:

### Architecture & Design
1. Vì sao chọn NestJS thay vì Express thuần?
2. Module structure được tổ chức như thế nào? Tại sao?
3. Provider abstraction pattern dùng ở đâu và vì sao?
4. Request lifecycle trong NestJS: Guard → Interceptor → Pipe → Handler → Interceptor → Filter?

### Database
5. ERD có bao nhiêu tables? Mối quan hệ chính?
6. Tại sao dùng showtime_seats (snapshot) thay vì query seats trực tiếp?
7. Index nào quan trọng nhất và vì sao?
8. Migration strategy: tại sao không dùng synchronize?

### Concurrency & Transaction
9. **Giải thích chi tiết cách chống double-booking.** (Câu hỏi quan trọng nhất)
10. SELECT FOR UPDATE hoạt động thế nào? Transaction isolation level nào?
11. Deadlock có thể xảy ra không? Cách phòng tránh?
12. Race condition test evidence: chạy thế nào, kết quả gì?

### Payment & Integration
13. payOS integration flow từ đầu đến cuối.
14. Webhook signature verification hoạt động thế nào?
15. Idempotency: nếu payOS gửi 5 webhook giống nhau thì sao?
16. returnUrl có phải là confirmation? Tại sao không?

### AI & Search
17. Vector embeddings là gì? pgvector hoạt động thế nào?
18. AI content workflow: tại sao cần human approval?
19. Mock provider vs real provider: khi nào dùng cái nào?

### Operations & Production
20. Audit log ghi những gì? Tại sao cần?
21. Request ID tracking giúp gì trong production?
22. BullMQ jobs: nếu Redis down thì sao?
23. Docker Compose setup có những service gì?

### Trade-offs
24. Nếu có thêm 2 tuần, bạn sẽ làm gì?
25. Nếu phải scale 10x, kiến trúc thay đổi thế nào?
26. Limitation lớn nhất của project là gì?

---

## 10.4. Evidence KHÔNG đạt chuẩn

Những thứ sau **KHÔNG** được tính là evidence:

- Screenshot code editor mà không có output.
- Link docs đã đọc.
- Ghi chú lý thuyết không mapping vào project.
- "Đã hiểu" nhưng không có log/test/API response.
- Code chạy trên máy nhưng không có reproduction steps.
- PR không có description.

---

## 10.5. Final Demo Flow

Demo cuối khóa nên chạy theo luồng sau (từ zero):

```
1. docker compose up (full stack from scratch)
2. Migration + seed data
3. Guest: GET /movies → danh sách phim
4. Guest: GET /showtimes → suất chiếu
5. Guest: GET /showtimes/:id/seats → seat map
6. Guest: POST /ai/movie-search → semantic search
7. Customer: POST /auth/register → đăng ký
8. Customer: POST /auth/login → nhận JWT
9. Customer: POST /showtimes/:id/seat-holds → giữ ghế
10. Customer: POST /bookings → tạo booking
11. Customer: POST /bookings/:id/payments/payos → payment link
12. System: POST /webhooks/payos → webhook confirm (hoặc real payOS)
13. Customer: GET /tickets/my → xem vé
14. Staff: GET /staff/tickets/:code → tra cứu vé
15. Staff: POST /staff/tickets/:id/check-in → check-in
16. Admin: POST /admin/movies/:id/ai/content-draft → AI draft
17. Admin: POST /admin/movies/:id/ai-content/apply → apply
18. Admin: GET /admin/audit-logs → audit trail
```

> **Thời gian demo:** 10-15 phút cho full flow. Có thể cut ngắn 5-7 phút nếu skip AI features.
