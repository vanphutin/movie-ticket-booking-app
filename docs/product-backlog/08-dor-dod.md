# 8. Definition of Ready & Definition of Done

---

## 8.1. Definition of Ready (DoR)

Một backlog item được phép **bắt đầu implement** khi đạt đủ tất cả tiêu chí sau:

### Tiêu chí bắt buộc

| # | Tiêu chí | Giải thích |
|--:|----------|------------|
| R-1 | **Business scenario rõ ràng** | Biết actor là ai, cần làm gì, vì sao cần. Không implement khi chưa hiểu business. |
| R-2 | **Acceptance criteria đã viết** | Danh sách điều kiện cụ thể, testable, không mơ hồ. |
| R-3 | **API contract đã thiết kế** | Method, path, request/response schema, status codes đã định nghĩa. |
| R-4 | **DB impact đã xác định** | Biết cần tạo/sửa table nào, migration nào, index nào. |
| R-5 | **Edge cases đã liệt kê** | Ít nhất 2-3 edge cases đã xác định. |
| R-6 | **Failure cases đã liệt kê** | Biết chuyện gì xảy ra khi input sai, DB lỗi, third-party timeout. |
| R-7 | **Security concern đã review** | Biết cần auth không, RBAC role nào, sensitive data nào cần bảo vệ. |
| R-8 | **Dependencies đã sẵn sàng** | Backlog items phụ thuộc đã Done hoặc có mock/stub thay thế. |
| R-9 | **Không có blocker** | Không chờ decision, không chờ external resource. |

### Tiêu chí bổ sung cho critical flows

| # | Tiêu chí | Áp dụng cho |
|--:|----------|-------------|
| R-10 | **State machine đã vẽ** | Seat hold, booking, payment, ticket |
| R-11 | **Transaction strategy đã thiết kế** | Seat hold, booking create, payment confirm |
| R-12 | **Invariant đã viết** | "Một showtime seat chỉ có thể HELD bởi 1 customer" |

> **Nguyên tắc:** Nếu không đạt DoR, item phải quay lại backlog refinement. KHÔNG bắt đầu code khi chưa Ready.

---

## 8.2. Definition of Done (DoD)

Một backlog item được xem là **Done** khi đạt đủ tất cả tiêu chí sau:

### Tier 1: Code Quality (Bắt buộc cho mọi item)

| # | Tiêu chí | Chi tiết |
|--:|----------|----------|
| D-1 | **Code implemented** | Chức năng hoạt động đúng theo acceptance criteria. |
| D-2 | **DTO validation** | Input được validate qua class-validator DTO. Invalid input → 400 với message rõ. |
| D-3 | **Error handling** | Mọi error case trả response đúng status code, đúng format. Không expose stack trace cho client. |
| D-4 | **Controller thin** | Controller chỉ delegate, không chứa business logic. Logic nằm trong service. |
| D-5 | **Naming conventions** | Files, classes, methods theo NestJS conventions. |
| D-6 | **No debug artifacts** | Không có console.log, commented-out code, TODO trong production code. |

### Tier 2: Testing (Bắt buộc cho mọi item)

| # | Tiêu chí | Chi tiết |
|--:|----------|----------|
| D-7 | **Unit test** | Service layer có test cho happy path + ít nhất 1 edge case. |
| D-8 | **Test pass** | `npm run test` pass cho module liên quan. |
| D-9 | **Manual verification** | Curl hoặc Swagger test evidence cho API endpoints. |

### Tier 3: Documentation (Bắt buộc cho mọi item)

| # | Tiêu chí | Chi tiết |
|--:|----------|----------|
| D-10 | **Swagger updated** | Endpoint có trong Swagger với description, request/response schema, status codes. |
| D-11 | **Migration nếu có** | DB change có migration file. Migration chạy từ clean DB. |
| D-12 | **Evidence** | Ít nhất 1 loại: test output, curl response, Swagger screenshot, log output. |
| D-13 | **PR description** | Problem, solution, test, evidence, tradeoff. |

### Tier 4: Security (Bắt buộc cho items có auth/data sensitivity)

| # | Tiêu chí | Chi tiết |
|--:|----------|----------|
| D-14 | **Auth check** | Protected endpoint có auth guard. |
| D-15 | **RBAC enforced** | Endpoint chỉ accessible bởi đúng role. |
| D-16 | **Ownership check** | Customer chỉ access resource của mình. |
| D-17 | **No secret hardcode** | Secrets từ env vars, không trong source code. |
| D-18 | **No PII leak** | Logs, responses không chứa password, token, card info. |

### Tier 5: Production Mindset (Bắt buộc cho critical flows)

| # | Tiêu chí | Chi tiết |
|--:|----------|----------|
| D-19 | **Audit log** | Hành động quan trọng được ghi audit log. |
| D-20 | **Integration log** | Third-party calls có integration log. |
| D-21 | **Transaction safety** | Critical state changes trong transaction. |
| D-22 | **Idempotency** | Webhook/job idempotent. |
| D-23 | **Reviewable** | Mentor/team lead có thể review code + evidence mà không cần hỏi thêm. |

> **Nguyên tắc:** Done không phải "code chạy trên máy tôi". Done là "người khác có thể review, chạy lại, và hiểu quyết định kỹ thuật."
