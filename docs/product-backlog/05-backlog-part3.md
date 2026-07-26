# 5. Detailed Product Backlog — Phần 3 (Epic 6–7: Payment & Webhook)

---

## BL-027: Customer tạo payOS payment link

- **Epic:** Epic 6 — Payment Integration with payOS
- **Priority:** Must
- **Actor:** Customer
- **User story:** Là Customer, tôi muốn tạo link thanh toán payOS cho booking để hoàn tất mua vé.
- **Business value:** Kết nối thanh toán thực tế — biến booking thành doanh thu.
- **Functional requirements:**
  - Input: booking_id.
  - Backend tính lại amount từ booking (KHÔNG trust client).
  - Tạo orderCode unique.
  - Gọi payOS API tạo payment link.
  - Lưu payment record: status PENDING, orderCode, paymentLinkId, amount.
  - Trả checkoutUrl cho customer.
  - Ghi integration log.
- **Acceptance criteria:**
  - [ ] POST `/bookings/:id/payments/payos` → 201, trả checkoutUrl.
  - [ ] Booking không phải PENDING_PAYMENT → 400.
  - [ ] Booking không phải của customer → 403.
  - [ ] Booking đã có payment PENDING → trả payment hiện có (idempotent).
  - [ ] Amount do backend tính, khớp booking.
  - [ ] orderCode unique.
  - [ ] Integration log ghi request/response payOS.
- **API endpoints:** `POST /bookings/:id/payments/payos`
- **Database impact:** INSERT `payments`, INSERT `integration_logs`.
- **Edge cases:**
  - payOS API timeout → trả 502, log error.
  - payOS API trả lỗi → trả 502, log error.
  - Tạo payment cho booking đã có payment → trả payment cũ (idempotent).
- **Failure cases:**
  - payOS down → 502 Bad Gateway.
  - Amount = 0 → 400.
  - Booking expired giữa chừng → check trước khi gọi payOS.
- **Security/data consistency risks:**
  - **CRITICAL:** Amount PHẢI do backend tính, KHÔNG nhận từ client.
  - payOS API key không được hard-code.
  - returnUrl chỉ dùng cho UI, backend KHÔNG dựa vào returnUrl để xác nhận thanh toán.
- **Evidence required:** Curl tạo payment link, payOS response log, DB payment record.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] Amount tính đúng.
  - [ ] PaymentProvider abstraction.
  - [ ] Integration log.
  - [ ] Audit log.
  - [ ] Unit test (mock payOS).

---

## BL-028: System xử lý payOS webhook

- **Epic:** Epic 6 + Epic 7
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, khi nhận webhook từ payOS thông báo thanh toán thành công, tôi cần xác nhận booking và phát hành vé.
- **Business value:** **Điểm xác nhận thanh toán duy nhất.** Backend chỉ tin webhook verified, không tin returnUrl.
- **Functional requirements:**
  - Verify webhook signature bằng checksum key.
  - Đối soát: amount, orderCode, paymentLinkId khớp với payment record.
  - Trong một transaction atomic:
    - Payment → PAID.
    - Booking → CONFIRMED.
    - showtime_seats → SOLD.
    - Tạo tickets.
    - Ghi audit log.
  - Ghi integration log (request webhook).
  - Trả 200 OK cho payOS (nhanh, không block).
- **Acceptance criteria:**
  - [ ] POST `/webhooks/payos` → 200.
  - [ ] Signature invalid → 400 (hoặc 200 + ignore, tùy payOS spec).
  - [ ] Amount mismatch → log error, reject.
  - [ ] orderCode không tìm thấy → log error, trả 200 (không retry).
  - [ ] Transaction atomic: payment + booking + seats + tickets.
  - [ ] Tickets tạo đúng số ghế.
- **API endpoints:** `POST /webhooks/payos`
- **Database impact:** UPDATE `payments`, UPDATE `bookings`, UPDATE `showtime_seats`, INSERT `tickets`, INSERT `audit_logs`, INSERT `integration_logs`. Tất cả trong 1 transaction.
- **Edge cases:**
  - payOS gửi webhook cho payment CANCELLED → cập nhật payment status.
  - payOS gửi webhook cho payment FAILED → cập nhật + release seats.
  - Webhook đến trước customer redirect về returnUrl → bình thường, đúng flow.
  - Webhook đến khi booking đã EXPIRED → reject, log warning.
- **Failure cases:**
  - Transaction failure → rollback, payOS sẽ retry.
  - DB lock timeout → trả 500, payOS retry.
- **Security/data consistency risks:**
  - **CRITICAL:** Signature verification là bắt buộc. Không skip.
  - **CRITICAL:** Amount đối soát trước khi confirm.
  - Webhook endpoint public nhưng chỉ chấp nhận request có valid signature.
- **Evidence required:** Curl simulate webhook, signature verification log, DB state after confirm.
- **Definition of Done:**
  - [ ] Webhook xử lý đúng.
  - [ ] Signature verify.
  - [ ] Amount reconciliation.
  - [ ] Transaction atomic.
  - [ ] Integration log.
  - [ ] Unit test + integration test.

---

## BL-029: Webhook idempotency

- **Epic:** Epic 7 — Webhook & Idempotency
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, khi nhận cùng webhook từ payOS nhiều lần (do retry), tôi chỉ xử lý lần đầu và bỏ qua các lần sau.
- **Business value:** Ngăn tạo duplicate tickets, ngăn update state sai.
- **Functional requirements:**
  - Kiểm tra payment status trước khi process.
  - Nếu payment đã PAID → trả 200, skip processing.
  - Không tạo ticket trùng.
- **Acceptance criteria:**
  - [ ] Gửi cùng webhook 5 lần → chỉ process 1 lần.
  - [ ] Ticket count không tăng sau lần 1.
  - [ ] Tất cả 5 lần đều trả 200.
  - [ ] Integration log ghi cả 5 lần (để audit).
- **API endpoints:** `POST /webhooks/payos` (cùng BL-028).
- **Database impact:** SELECT check payment status trước khi UPDATE.
- **Edge cases:** Webhook cho cùng orderCode nhưng status khác nhau (PAID rồi CANCELLED) → chỉ process nếu state transition hợp lệ.
- **Failure cases:** Check idempotency + process không atomic → race condition giữa 2 webhook cùng lúc.
- **Security/data consistency risks:** Phải dùng DB lock hoặc unique constraint để chống race.
- **Evidence required:** Curl replay test 5 lần, DB ticket count, integration log count.
- **Definition of Done:**
  - [ ] Replay test pass.
  - [ ] No duplicate tickets.
  - [ ] Integration log ghi đủ.
  - [ ] Unit test.

---

## BL-030: Customer xem payment status

- **Epic:** Epic 6
- **Priority:** Must
- **Actor:** Customer
- **User story:** Là Customer, tôi muốn kiểm tra trạng thái thanh toán.
- **Acceptance criteria:**
  - [ ] GET `/payments/:id` → payment status, amount, created_at.
  - [ ] Chỉ xem payment của mình → 403.
- **API endpoints:** `GET /payments/:id`
- **Database impact:** SELECT `payments`.
- **Edge cases:** Payment không tồn tại → 404.
- **Security/data consistency risks:** Ownership check.
- **Evidence required:** Curl response.
- **Definition of Done:** API hoạt động, ownership, unit test.

---

## BL-031: Webhook failure logging

- **Epic:** Epic 7
- **Priority:** Should
- **Actor:** System
- **User story:** Là System, tôi cần log mọi webhook failure để Admin có thể debug.
- **Acceptance criteria:**
  - [ ] Signature fail → log chi tiết (headers, body hash, expected vs actual).
  - [ ] Amount mismatch → log chi tiết.
  - [ ] DB error → log stack trace.
  - [ ] Admin xem qua integration logs API.
- **API endpoints:** Không (internal logging).
- **Database impact:** INSERT `integration_logs`.
- **Edge cases:** Log quá lớn → cần truncate body.
- **Security/data consistency risks:** KHÔNG log sensitive fields (card info nếu có).
- **Evidence required:** Integration log entries cho failure cases.
- **Definition of Done:** Logging đầy đủ, không leak sensitive data, unit test.

---

## BL-032: System expire pending booking

- **Epic:** Epic 8 — Background Jobs
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, tôi cần expire booking PENDING_PAYMENT sau 15 phút nếu khách chưa thanh toán.
- **Business value:** Release ghế bị giữ bởi booking chưa thanh toán, bảo vệ inventory.
- **Functional requirements:**
  - BullMQ delayed job chạy sau 15 phút.
  - Booking status → EXPIRED.
  - Payment status → EXPIRED (nếu có).
  - showtime_seats → AVAILABLE.
  - Audit log.
- **Acceptance criteria:**
  - [ ] Sau 15 phút, booking PENDING_PAYMENT → EXPIRED.
  - [ ] Ghế trở về AVAILABLE.
  - [ ] Nếu booking đã CONFIRMED (payment đến kịp) → job skip.
  - [ ] Nếu booking đã CANCELLED → job skip.
  - [ ] Job idempotent.
- **API endpoints:** Không (background job).
- **Database impact:** UPDATE `bookings`, UPDATE `payments`, UPDATE `showtime_seats`. Transaction.
- **Edge cases:**
  - Payment webhook đến đúng lúc expire job chạy → transaction race → payment webhook phải thắng nếu đến trước.
  - Booking có nhiều seats → tất cả phải release.
- **Failure cases:** Job failure → retry 3 lần → alert log.
- **Security/data consistency risks:** Transaction atomic bắt buộc.
- **Evidence required:** BullMQ job log, DB state before/after.
- **Definition of Done:**
  - [ ] Job hoạt động đúng.
  - [ ] Idempotent.
  - [ ] Race condition safe.
  - [ ] Audit log.
  - [ ] Unit test.
