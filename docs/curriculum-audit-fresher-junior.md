# Kiểm toán khung 10 tuần cho vị trí Backend Fresher/Junior

## Kết luận

Khung hiện tại **đủ rộng cho Backend Fresher và có thể đạt ngưỡng Junior đầu vào**, nhưng hoàn thành đủ 10 tuần không tự động đồng nghĩa job-ready. Người học chỉ nên apply khi vượt các hard gate ở cuối tài liệu và có capstone chạy được từ clean checkout.

Điểm mạnh là chuỗi học hợp lý: protocol và failure → TypeScript/domain/test → SQL/transaction/security → service delivery → consistency/async/observability/deploy. Project Movie Ticket Booking có đủ bài toán thật để nói về ownership, concurrency, idempotency và vận hành, thay vì chỉ CRUD.

Rủi ro lớn nhất là phạm vi microservice rất rộng trong 10 tuần. Với người mới, một modular monolith hoàn thiện tốt còn có giá trị tuyển dụng hơn nhiều service chỉ có skeleton. Vì vậy Gateway, Identity, Catalog và Booking là core; payment thật, semantic search/AI và mở rộng hạ tầng là stretch.

## Coverage theo năng lực tuyển dụng

| Năng lực | Coverage | Evidence tối thiểu |
|---|---|---|
| JavaScript/TypeScript và Node runtime | Đạt, đã bổ sung official docs từng ngày | Giải thích event loop/async/error; code strict; test chạy được |
| Internet, HTTP, REST/API | Mạnh | Contract/OpenAPI, status/method/header/cache/CORS, curl failure cases |
| NestJS và tổ chức code | Đạt | Module/controller/provider, DI, validation, error mapping, test seam |
| SQL/PostgreSQL | Mạnh | ERD, constraints, migrations, index và `EXPLAIN ANALYZE` |
| Transaction/concurrency | Mạnh | Race test, lock/isolation, retry và idempotency evidence |
| Authentication/authorization/security | Đạt | Password hashing, token/session lifecycle, RBAC/ownership, secret/log redaction |
| Testing | Đạt nếu thực thi đủ | Unit + integration + e2e + negative/failure/concurrency tests |
| Cache/queue/outbox | Đạt ở mức Junior đầu vào | Cache-aside/invalidation; retry/DLQ; idempotent worker; outbox gap |
| Observability/resilience | Đạt | Structured log, request ID, metric/trace mindset, timeout và graceful shutdown |
| Docker/CI/deploy | Đạt nền tảng | Compose, health/readiness, migration step, CI và rollback/runbook |
| System design | Đạt mức entry-level | Boundary, data ownership, sequence/state/failure diagrams và trade-off |
| Git/team workflow | Cần biến thành evidence bắt buộc | Commit nhỏ, branch/PR, review checklist, README và release note |
| DSA/problem solving | Chưa phải trục riêng | Bổ sung 2–3 bài/tuần: map/set, stack/queue, sorting/search, complexity |
| Linux/network debugging | Có rải rác, cần gate thực hành | `curl`, port/process/log/env/DNS/TLS checks và runbook |
| Giao tiếp/phỏng vấn | Có drill, cần ghi hình/mock | Demo 10 phút, system-design walkthrough, câu trả lời STAR |

## Scope bắt buộc của capstone

### Core phải hoàn thành

1. Gateway, Identity, Catalog và Booking chạy được bằng một lệnh documented.
2. PostgreSQL migrations/seed từ database sạch; constraints bảo vệ invariant quan trọng.
3. Login/session hoặc token lifecycle, RBAC và resource ownership có negative tests.
4. Catalog/showtime API có pagination/filtering, validation và stable error contract.
5. Seat hold/booking có state machine, transaction, concurrency test và idempotency key.
6. Outbox + worker có retry/backoff, duplicate delivery test và dead-letter strategy.
7. Cross-service request ID, structured logs, health/readiness và graceful shutdown.
8. Unit, integration và e2e test; CI chạy lint/typecheck/test/build.
9. Docker Compose, `.env.example`, migration/deploy/rollback steps và runbook.
10. README có architecture, ERD, API/OpenAPI, trade-offs, known limitations và demo script.

### Stretch, không được làm hỏng core

- Payment provider thật; local mock + verified webhook đủ cho core.
- Semantic search/embeddings/pgvector.
- Kubernetes/cloud deployment, autoscaling hoặc broker cluster.
- Event sourcing, saga framework hay service mesh.

## Hard gate trước khi apply

Người học được xem là sẵn sàng apply Fresher/Junior khi tự mình chứng minh được tất cả:

- Clone mới → cài đặt → migrate/seed → chạy → test thành công theo README, không sửa tay.
- Happy path và ít nhất 8 failure cases có evidence, gồm unauthorized/forbidden, invalid input, conflict, duplicate request, race, dependency timeout và worker retry.
- Không có secret trong repo/log; dependency audit được xem xét và có threat model ngắn.
- Có query-plan evidence cho ít nhất 3 query quan trọng và giải thích vì sao index tồn tại.
- Có concurrency test chứng minh không bán trùng ghế và replay không tạo booking/ticket trùng.
- CI xanh với lint, typecheck, unit/integration/e2e và build.
- Demo được request xuyên Gateway → service → DB/worker bằng correlation ID.
- Giải thích được ít nhất 5 trade-off của chính project, không đọc thuộc định nghĩa.
- Có CV/GitHub README, 2–3 PR hoặc commit series dễ review, release tag và video/demo notes.
- Hoàn thành mock interview gồm Node/HTTP, SQL/transaction, auth/security, testing và một bài system design entry-level.

Nếu thiếu gate nào, vẫn có thể bắt đầu nộp internship để lấy phản hồi thị trường, nhưng chưa nên tự đánh giá là đã đạt Junior.

## Quy tắc dùng Node.js official docs trong 10 tuần

Mỗi daily ticket đã được gắn trực tiếp module liên quan từ [Node.js API index](https://nodejs.org/docs/latest/api/). Người học chỉ đọc phần API chạm tới ticket và phải tạo một note ngắn gồm mental model, lifecycle/error, snippet và failure case.

Link `/latest/` giúp tài liệu không cũ, nhưng project phải pin một major LTS. Trước khi dùng API, kiểm tra nhãn stability và `History Version Changes`; không giả định API của bản latest tồn tại trên runtime project. Framework docs giải thích abstraction, còn Node docs dùng để hiểu behavior bên dưới như HTTP timeout, process signal, crypto, timers, events, async context, diagnostics và test runner.

## Nhịp bổ sung để tăng xác suất tuyển dụng

- Mỗi tuần: 2–3 bài DSA nhỏ, 1 buổi đọc code/debug và 1 commit/PR được self-review.
- Từ tuần 4: mỗi tuần chạy một failure drill và cập nhật runbook.
- Tuần 8: feature freeze cho core; không bắt đầu AI/search nếu booking/idempotency chưa xanh.
- Tuần 9: deploy một môi trường có URL truy cập được nếu điều kiện cho phép.
- Tuần 10: chỉ sửa release blocker, hoàn thiện evidence, CV và mock interview.
