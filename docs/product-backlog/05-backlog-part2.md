# 5. Detailed Product Backlog — Phần 2 (Epic 4–5)

---

## BL-017: Customer giữ ghế (Seat Hold)

- **Epic:** Epic 4 — Seat Hold & Concurrency Control
- **Priority:** Must
- **Actor:** Customer
- **User story:** Là Customer, tôi muốn giữ một hoặc nhiều ghế cho suất chiếu để có thời gian thanh toán mà không bị người khác mua mất.
- **Business value:** **Core feature.** Seat hold là bước chuyển đổi từ browsing sang booking. Không có hold → double-booking.
- **Functional requirements:**
  - Input: showtime_id, seat_ids (array, tối đa 8 ghế).
  - Kiểm tra tất cả ghế đều AVAILABLE.
  - Dùng `SELECT ... FOR UPDATE` để lock rows.
  - Tạo `seat_holds` record với expires_at = now + 5 phút.
  - Cập nhật `showtime_seats` status → HELD.
  - Enqueue BullMQ delayed job để expire sau 5 phút.
- **Acceptance criteria:**
  - [ ] POST `/showtimes/:id/seat-holds` → 201, trả seat hold info + expires_at.
  - [ ] Ghế đã HELD bởi customer khác → 409 Conflict.
  - [ ] Ghế đã SOLD → 409 Conflict.
  - [ ] Seat ID không thuộc showtime → 404.
  - [ ] Chưa login → 401.
  - [ ] Quá 8 ghế → 400.
  - [ ] Customer đã có active hold cho suất chiếu này → 409 (design decision).
- **API endpoints:** `POST /showtimes/:id/seat-holds`
- **Database impact:**
  - SELECT FOR UPDATE trên `showtime_seats` (lock).
  - INSERT `seat_holds`.
  - UPDATE `showtime_seats` status = HELD.
  - Phải trong cùng một transaction.
- **Edge cases:**
  - Chọn ghế BLOCKED → 409.
  - Suất chiếu đã qua → 400.
  - Suất chiếu đã CANCELLED → 400.
  - Hai customer cùng giữ ghế A1 đồng thời → chỉ 1 thành công (lock đảm bảo).
  - Network timeout giữa chừng → transaction rollback, ghế vẫn AVAILABLE.
- **Failure cases:**
  - Deadlock khi hold nhiều ghế → order lock theo seat_id ascending.
  - Redis down → BullMQ job không enqueue → phải có fallback (cron check).
  - Transaction timeout → rollback, trả 500.
- **Security/data consistency risks:**
  - **CRITICAL:** Phải đảm bảo atomicity — không có state mà seat_hold tạo nhưng showtime_seat chưa update.
  - Customer chỉ được hold ghế cho chính mình.
  - Rate limit: chống spam hold request.
- **Evidence required:**
  - Curl hold thành công.
  - Race condition test: 2 concurrent requests cùng ghế, chỉ 1 thành công.
  - Lock strategy document.
  - Transaction isolation level evidence.
- **Definition of Done:**
  - [ ] API hoạt động với transaction + lock.
  - [ ] Race condition test pass (concurrent curl/test).
  - [ ] BullMQ delayed job enqueued.
  - [ ] Audit log.
  - [ ] Unit test + integration test.
  - [ ] Lock strategy documented.

---

## BL-018: Customer hủy seat hold

- **Epic:** Epic 4
- **Priority:** Must
- **Actor:** Customer
- **User story:** Là Customer, tôi muốn hủy giữ ghế nếu đổi ý.
- **Acceptance criteria:**
  - [ ] DELETE `/seat-holds/:id` → 200, ghế trở về AVAILABLE.
  - [ ] Chỉ owner mới được hủy → 403.
  - [ ] Hold đã expire → 400.
  - [ ] Hold đã chuyển thành booking → 400.
- **API endpoints:** `DELETE /seat-holds/:id`
- **Database impact:** UPDATE `showtime_seats` status = AVAILABLE, UPDATE `seat_holds` status = CANCELLED.
- **Edge cases:** Hủy hold đã bị expire bởi job → 400 (đã expire).
- **Failure cases:** Race: hủy hold cùng lúc expire job chạy → cần transaction.
- **Security/data consistency risks:** Ownership check bắt buộc.
- **Evidence required:** Curl hủy hold, verify seat status.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] Ownership enforced.
  - [ ] Unit test.

---

## BL-019: System expire seat hold

- **Epic:** Epic 4 + Epic 8
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, tôi cần tự động expire seat hold sau thời hạn để ghế không bị "treo" vĩnh viễn.
- **Business value:** Bảo vệ inventory — ghế held nhưng không thanh toán phải được release.
- **Functional requirements:**
  - BullMQ delayed job: chạy sau expires_at.
  - Kiểm tra seat hold còn active (chưa bị hủy, chưa chuyển thành booking).
  - Cập nhật seat_hold status → EXPIRED.
  - Cập nhật showtime_seats status → AVAILABLE.
  - Phải trong transaction.
- **Acceptance criteria:**
  - [ ] Sau 5 phút, ghế held tự động về AVAILABLE.
  - [ ] Nếu seat hold đã chuyển thành booking → job skip (không release).
  - [ ] Nếu seat hold đã bị customer hủy → job skip.
  - [ ] Job failure → retry 3 lần → log error.
- **API endpoints:** Không (background job).
- **Database impact:** UPDATE `seat_holds`, UPDATE `showtime_seats`. Transaction.
- **Edge cases:**
  - Job delay: Redis chậm, job chạy trễ vài giây → acceptable.
  - Customer tạo booking ngay trước khi job chạy → job phải check status.
- **Failure cases:** Redis connection lost → job không chạy → cần fallback (cron hoặc startup scan).
- **Security/data consistency risks:** Job phải idempotent — chạy lại không gây side effect.
- **Evidence required:** BullMQ job log, DB state before/after expire.
- **Definition of Done:**
  - [ ] Job chạy đúng thời gian.
  - [ ] Idempotent.
  - [ ] Retry strategy.
  - [ ] Unit test.

---

## BL-020: Customer tạo booking

- **Epic:** Epic 5 — Booking & Ticket Flow
- **Priority:** Must
- **Actor:** Customer
- **User story:** Là Customer, tôi muốn tạo booking từ seat hold còn hiệu lực để chuyển sang bước thanh toán.
- **Business value:** Chuyển đổi seat hold → booking — bước quan trọng trong funnel mua vé.
- **Functional requirements:**
  - Input: seat_hold_id.
  - Kiểm tra seat hold còn active, chưa expire.
  - Kiểm tra seat hold thuộc customer.
  - Tạo booking với status PENDING_PAYMENT.
  - Tạo booking_seats từ seat hold.
  - Tính total_amount = base_price × số ghế.
  - Enqueue BullMQ delayed job expire booking sau 15 phút.
- **Acceptance criteria:**
  - [ ] POST `/bookings` → 201, trả booking info + total_amount.
  - [ ] Seat hold đã expire → 400.
  - [ ] Seat hold không thuộc customer → 403.
  - [ ] Seat hold đã dùng cho booking khác → 409.
  - [ ] Booking status = PENDING_PAYMENT.
- **API endpoints:** `POST /bookings`
- **Database impact:** INSERT `bookings`, INSERT `booking_seats`. Transaction.
- **Edge cases:**
  - Seat hold expire đúng lúc tạo booking → check trong transaction.
  - Amount tính sai → Backend phải tính, không trust client.
- **Failure cases:** Transaction failure → rollback. Seat hold vẫn active.
- **Security/data consistency risks:**
  - Amount PHẢI do backend tính.
  - Ownership check bắt buộc.
- **Evidence required:** Curl booking, verify booking_seats count.
- **Definition of Done:**
  - [ ] API hoạt động, amount tính đúng.
  - [ ] Seat hold validation.
  - [ ] Expire job enqueued.
  - [ ] Audit log.
  - [ ] Unit test.

---

## BL-021: Customer xem lịch sử booking

- **Epic:** Epic 5
- **Priority:** Must
- **Actor:** Customer
- **User story:** Là Customer, tôi muốn xem lịch sử đặt vé của mình.
- **Acceptance criteria:**
  - [ ] GET `/bookings/my` → danh sách booking của customer (pagination).
  - [ ] GET `/bookings/:id` → chi tiết booking (chỉ booking của mình).
  - [ ] Booking của customer khác → 403.
- **API endpoints:** `GET /bookings/my`, `GET /bookings/:id`
- **Database impact:** SELECT `bookings` WHERE user_id = current_user. JOIN booking_seats, showtime, movie.
- **Edge cases:** Chưa có booking nào → `data: []`.
- **Security/data consistency risks:** Chỉ xem booking của chính mình.
- **Evidence required:** Curl response.
- **Definition of Done:** API hoạt động, ownership enforced, unit test.

---

## BL-022: Customer hủy booking

- **Epic:** Epic 5
- **Priority:** Must
- **Actor:** Customer
- **User story:** Là Customer, tôi muốn hủy booking nếu chưa thanh toán.
- **Acceptance criteria:**
  - [ ] POST `/bookings/:id/cancel` → 200, booking status = CANCELLED.
  - [ ] Chỉ hủy được khi status = PENDING_PAYMENT.
  - [ ] Booking CONFIRMED → 400.
  - [ ] showtime_seats trở về AVAILABLE.
  - [ ] Không phải owner → 403.
- **API endpoints:** `POST /bookings/:id/cancel`
- **Database impact:** UPDATE `bookings`, UPDATE `showtime_seats`. Transaction.
- **Edge cases:** Hủy booking đã EXPIRED → 400.
- **Security/data consistency risks:** Release seats phải atomic với booking cancel.
- **Evidence required:** Curl cancel, verify seat status.
- **Definition of Done:** API hoạt động, state machine enforced, audit log, unit test.

---

## BL-023: System tạo ticket khi booking CONFIRMED

- **Epic:** Epic 5
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, khi booking chuyển sang CONFIRMED (sau payment success), tôi cần tự động tạo vé cho mỗi ghế.
- **Business value:** Vé là bằng chứng mua hàng, dùng để check-in tại rạp.
- **Functional requirements:**
  - Mỗi booking_seat → tạo 1 ticket.
  - Ticket có unique ticket_code (có thể dùng nanoid hoặc UUID short).
  - Ticket status: ACTIVE.
- **Acceptance criteria:**
  - [ ] Sau payment PAID → booking CONFIRMED → tickets tạo.
  - [ ] Mỗi ghế có 1 ticket.
  - [ ] Ticket code unique.
  - [ ] Không tạo duplicate ticket khi webhook replay (idempotent).
- **API endpoints:** Không (internal, triggered by payment confirmation).
- **Database impact:** INSERT `tickets`.
- **Edge cases:** Booking đã có tickets (webhook replay) → skip.
- **Failure cases:** Ticket creation fail → phải retry, booking vẫn CONFIRMED.
- **Security/data consistency risks:** Duplicate prevention bắt buộc.
- **Evidence required:** DB query tickets after payment, verify ticket_code unique.
- **Definition of Done:**
  - [ ] Tickets tạo đúng.
  - [ ] Idempotent.
  - [ ] Unit test.

---

## BL-024: Customer xem vé

- **Epic:** Epic 5
- **Priority:** Must
- **Actor:** Customer
- **User story:** Là Customer, tôi muốn xem danh sách vé và chi tiết vé để biết thông tin check-in.
- **Acceptance criteria:**
  - [ ] GET `/tickets/my` → danh sách vé (pagination).
  - [ ] GET `/tickets/:id` → chi tiết vé (movie, showtime, seat, ticket_code, status).
  - [ ] Chỉ xem vé của mình → 403 cho vé người khác.
- **API endpoints:** `GET /tickets/my`, `GET /tickets/:id`
- **Database impact:** SELECT `tickets` JOIN booking, showtime, movie, seat.
- **Edge cases:** Chưa có vé → `data: []`.
- **Security/data consistency risks:** Ownership check.
- **Evidence required:** Curl response.
- **Definition of Done:** API hoạt động, ownership, unit test.

---

## BL-025: Staff tra cứu vé

- **Epic:** Epic 5
- **Priority:** Must
- **Actor:** Staff
- **User story:** Là Staff, tôi muốn tra cứu vé bằng ticket code để xác nhận thông tin trước khi cho khách vào phòng.
- **Acceptance criteria:**
  - [ ] GET `/staff/tickets/:code` → chi tiết vé (movie, showtime, seat, customer name, status).
  - [ ] Ticket code không tồn tại → 404.
  - [ ] Không cần quyền Admin, chỉ cần role Staff.
- **API endpoints:** `GET /staff/tickets/:code`
- **Database impact:** SELECT `tickets` WHERE ticket_code = :code.
- **Edge cases:** Vé đã check-in → vẫn trả thông tin, status = CHECKED_IN.
- **Security/data consistency risks:** Staff chỉ xem, không sửa. RBAC role STAFF.
- **Evidence required:** Curl tra cứu vé.
- **Definition of Done:** API hoạt động, RBAC, unit test.

---

## BL-026: Staff check-in vé

- **Epic:** Epic 5
- **Priority:** Must
- **Actor:** Staff
- **User story:** Là Staff, tôi muốn check-in vé khi khách đến rạp.
- **Business value:** Xác nhận khách sử dụng vé, hoàn tất luồng nghiệp vụ.
- **Functional requirements:**
  - Check-in chỉ cho vé ACTIVE.
  - Check-in chỉ cho suất chiếu đúng ngày (±2 giờ trước giờ chiếu).
  - Cập nhật ticket status → CHECKED_IN, ghi checked_in_at, checked_in_by.
- **Acceptance criteria:**
  - [ ] POST `/staff/tickets/:id/check-in` → 200.
  - [ ] Vé đã check-in → 400 (hoặc 200 idempotent, design decision).
  - [ ] Vé CANCELLED → 400.
  - [ ] Suất chiếu đã qua > 2 giờ → 400.
  - [ ] GET `/staff/showtimes/:id/check-ins` → danh sách vé đã check-in.
- **API endpoints:** `POST /staff/tickets/:id/check-in`, `GET /staff/showtimes/:id/check-ins`
- **Database impact:** UPDATE `tickets`. Index trên `showtime_id` + `status`.
- **Edge cases:**
  - Check-in vé của suất chiếu khác rạp staff đang làm → cho phép (MVP không quản lý staff assignment).
  - Check-in lại vé đã check-in → nên idempotent.
- **Failure cases:** Ticket ID không tồn tại → 404.
- **Security/data consistency risks:** Chỉ Staff mới check-in. Audit log ghi ai check-in.
- **Evidence required:** Curl check-in, verify status change, check-in list.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] Business rules enforced.
  - [ ] Audit log.
  - [ ] Unit test.
