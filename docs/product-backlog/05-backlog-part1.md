# 5. Detailed Product Backlog — Phần 1 (Epic 1–3)

---

## BL-001: Xem danh sách phim

- **Epic:** Epic 1 — Public Movie Catalog
- **Priority:** Must
- **Actor:** Guest, Customer
- **User story:** Là Guest, tôi muốn xem danh sách phim đang chiếu/sắp chiếu để chọn phim muốn xem.
- **Business value:** Điểm đầu vào funnel đặt vé. Không có catalog → không có booking.
- **Functional requirements:**
  - Filter theo genre, status (NOW_SHOWING / COMING_SOON).
  - Pagination (page, limit, default 10).
  - Sort theo title, release date, created date.
  - Trả về: id, title, genre, status, poster URL, duration, rating, release date.
- **Acceptance criteria:**
  - [ ] GET `/movies` trả danh sách phim với pagination metadata.
  - [ ] Filter `?genre=Action` chỉ trả phim Action.
  - [ ] Filter `?status=NOW_SHOWING` chỉ trả phim đang chiếu.
  - [ ] Pagination `?page=2&limit=5` trả đúng offset.
  - [ ] Response 200 với format `{ data: [], meta: { page, limit, total, totalPages } }`.
- **API endpoints:** `GET /movies`
- **Database impact:** Query bảng `movies`. Index trên `status`, `genre`.
- **Edge cases:**
  - Không có phim nào → trả `data: []` với `total: 0`.
  - Page vượt quá tổng số trang → trả `data: []`.
  - Limit quá lớn (>100) → cap lại 100.
- **Failure cases:**
  - Query parameter invalid (limit = -1) → 400 Bad Request.
  - Database connection error → 500 Internal Server Error.
- **Security/data consistency risks:** Không có risk đặc biệt. API public, read-only.
- **Evidence required:** Swagger screenshot, curl response, unit test output.
- **Definition of Done:**
  - [ ] API hoạt động đúng spec.
  - [ ] DTO validation cho query params.
  - [ ] Swagger documented.
  - [ ] Unit test cho service (happy path + empty result).
  - [ ] Seed data có ≥ 5 phim demo.

---

## BL-002: Xem chi tiết phim và trailer

- **Epic:** Epic 1 — Public Movie Catalog
- **Priority:** Must
- **Actor:** Guest, Customer
- **User story:** Là Guest, tôi muốn xem chi tiết một bộ phim bao gồm trailer để quyết định có đặt vé không.
- **Business value:** Thông tin chi tiết giúp khách hàng ra quyết định.
- **Functional requirements:**
  - Chi tiết phim: title, original title, synopsis, genre, director, cast, duration, rating, age rating, release date, status, poster URL.
  - Trailer: URL, description — chỉ trả trailer có status PUBLISHED.
- **Acceptance criteria:**
  - [ ] GET `/movies/:id` trả đầy đủ thông tin phim.
  - [ ] Trailer chỉ hiện khi status = PUBLISHED.
  - [ ] Movie không tồn tại → 404.
- **API endpoints:** `GET /movies/:id`, `GET /movies/:id/trailer`
- **Database impact:** Query `movies` + LEFT JOIN `movie_trailers`.
- **Edge cases:**
  - Phim chưa có trailer → trả phim, trailer = null.
  - Trailer ở trạng thái UNPUBLISHED → không trả cho Guest.
  - UUID format sai → 400.
- **Failure cases:** ID không tồn tại → 404 Not Found.
- **Security/data consistency risks:** Không expose trailer UNPUBLISHED cho public.
- **Evidence required:** Curl response cho phim có/không có trailer.
- **Definition of Done:**
  - [ ] API hoạt động, Swagger updated.
  - [ ] 404 handling cho phim không tồn tại.
  - [ ] Unit test cho service.

---

## BL-003: Xem danh sách rạp

- **Epic:** Epic 1 — Public Movie Catalog
- **Priority:** Must
- **Actor:** Guest, Customer
- **User story:** Là Guest, tôi muốn xem danh sách rạp chiếu phim để chọn rạp gần nhà.
- **Business value:** Khách cần biết rạp nào đang hoạt động.
- **Functional requirements:**
  - Danh sách rạp với pagination.
  - Chi tiết rạp: id, name, address, city, phone.
- **Acceptance criteria:**
  - [ ] GET `/cinemas` trả danh sách rạp.
  - [ ] GET `/cinemas/:id` trả chi tiết rạp.
  - [ ] Rạp không tồn tại → 404.
- **API endpoints:** `GET /cinemas`, `GET /cinemas/:id`
- **Database impact:** Query bảng `cinemas`.
- **Edge cases:** Không có rạp nào → trả `data: []`.
- **Failure cases:** ID invalid → 400, ID not found → 404.
- **Security/data consistency risks:** Không có risk đặc biệt.
- **Evidence required:** Curl response, Swagger.
- **Definition of Done:**
  - [ ] API hoạt động, Swagger updated.
  - [ ] Unit test.

---

## BL-004: Xem suất chiếu

- **Epic:** Epic 1 — Public Movie Catalog
- **Priority:** Must
- **Actor:** Guest, Customer
- **User story:** Là Guest, tôi muốn xem suất chiếu theo phim/rạp/ngày để chọn suất phù hợp.
- **Business value:** Suất chiếu là inventory trực tiếp — khách cần chọn suất trước khi đặt vé.
- **Functional requirements:**
  - Filter theo movie_id, cinema_id, date.
  - Trả về: id, movie info (title, poster), cinema info, screen info, start_time, end_time, base_price.
  - Chỉ trả suất chiếu chưa qua (start_time > now).
- **Acceptance criteria:**
  - [ ] GET `/showtimes?movie_id=xxx&date=2026-07-10` trả đúng suất.
  - [ ] GET `/showtimes/:id` trả chi tiết suất chiếu.
  - [ ] Suất chiếu đã qua không hiển thị trong danh sách.
- **API endpoints:** `GET /showtimes`, `GET /showtimes/:id`
- **Database impact:** Query `showtimes` JOIN `movies`, `screens`, `cinemas`. Index trên `movie_id`, `start_time`.
- **Edge cases:**
  - Không có suất chiếu cho ngày chỉ định → trả `data: []`.
  - Filter thiếu → trả toàn bộ suất chiếu tương lai.
  - Suất chiếu bị CANCELLED → không hiển thị.
- **Failure cases:** Date format sai → 400.
- **Security/data consistency risks:** Đảm bảo suất chiếu CANCELLED không hiển thị.
- **Evidence required:** Curl response với filter, Swagger.
- **Definition of Done:**
  - [ ] API hoạt động, filter đúng.
  - [ ] Swagger updated.
  - [ ] Unit test.

---

## BL-005: Xem seat map của suất chiếu

- **Epic:** Epic 1 — Public Movie Catalog
- **Priority:** Must
- **Actor:** Guest, Customer
- **User story:** Là Guest/Customer, tôi muốn xem sơ đồ ghế của một suất chiếu để biết ghế nào còn trống.
- **Business value:** Seat map là thông tin quyết định để customer chọn ghế và tiến hành đặt vé.
- **Functional requirements:**
  - Trả danh sách ghế với trạng thái: AVAILABLE, HELD, SOLD, BLOCKED.
  - Thông tin ghế: row, number, type, status.
  - Không expose ai đang hold ghế (chỉ hiển thị trạng thái).
- **Acceptance criteria:**
  - [ ] GET `/showtimes/:id/seats` trả danh sách ghế với trạng thái.
  - [ ] Ghế AVAILABLE hiển thị đúng.
  - [ ] Ghế HELD hoặc SOLD hiển thị trạng thái nhưng không expose customer info.
- **API endpoints:** `GET /showtimes/:id/seats`
- **Database impact:** Query `showtime_seats` JOIN `seats`. Có thể cần index trên `showtime_id`.
- **Edge cases:**
  - Suất chiếu không tồn tại → 404.
  - Toàn bộ ghế đã SOLD → trả tất cả ghế với status SOLD.
- **Failure cases:** Showtime ID invalid → 400.
- **Security/data consistency risks:** KHÔNG expose customer_id của người đang hold ghế.
- **Evidence required:** Curl response, seat map json output.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] Không leak customer info.
  - [ ] Swagger updated.
  - [ ] Unit test.

---

## BL-006: Admin tạo/cập nhật rạp

- **Epic:** Epic 2 — Cinema, Screen, Seat & Showtime Management
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn tạo và cập nhật thông tin rạp chiếu phim.
- **Business value:** Rạp là đơn vị kinh doanh cơ bản, cần có trước khi tạo phòng chiếu và suất chiếu.
- **Functional requirements:**
  - Tạo rạp: name, address, city, phone.
  - Cập nhật rạp: PATCH partial update.
  - Validation: name required, unique trong city.
- **Acceptance criteria:**
  - [ ] POST `/admin/cinemas` tạo rạp thành công → 201.
  - [ ] PATCH `/admin/cinemas/:id` cập nhật thành công → 200.
  - [ ] Thiếu name → 400.
  - [ ] Không có quyền Admin → 403.
- **API endpoints:** `POST /admin/cinemas`, `PATCH /admin/cinemas/:id`
- **Database impact:** INSERT/UPDATE bảng `cinemas`.
- **Edge cases:** Trùng tên rạp trong cùng thành phố → 409 Conflict.
- **Failure cases:** Body rỗng → 400. ID không tồn tại → 404.
- **Security/data consistency risks:** Chỉ Admin mới được tạo/sửa. RBAC guard bắt buộc.
- **Evidence required:** Curl request/response, Swagger.
- **Definition of Done:**
  - [ ] API hoạt động, RBAC protected.
  - [ ] DTO validation.
  - [ ] Audit log ghi lại action.
  - [ ] Unit test.

---

## BL-007: Admin tạo phòng chiếu và layout ghế

- **Epic:** Epic 2 — Cinema, Screen, Seat & Showtime Management
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn tạo phòng chiếu trong rạp và thiết lập layout ghế (hàng, số ghế).
- **Business value:** Phòng chiếu và ghế là inventory vật lý, cần có trước khi tạo suất chiếu.
- **Functional requirements:**
  - Tạo phòng chiếu: name, cinema_id, capacity.
  - Tạo layout ghế: danh sách seats với row (A, B, C...) và number (1, 2, 3...).
  - Ghế có type: STANDARD (mặc định).
- **Acceptance criteria:**
  - [ ] POST `/admin/screens` tạo phòng chiếu → 201.
  - [ ] POST `/admin/screens/:id/seats` tạo layout ghế → 201.
  - [ ] Cinema không tồn tại → 404.
  - [ ] Trùng row+number trong cùng screen → 409.
- **API endpoints:** `POST /admin/screens`, `POST /admin/screens/:id/seats`
- **Database impact:** INSERT bảng `screens`, `seats`. Unique constraint (screen_id, row, number).
- **Edge cases:**
  - Layout ghế rỗng → 400.
  - Tạo layout khi screen đã có seats → 409 (hoặc design decision: cho phép override?).
- **Failure cases:** Cinema ID không tồn tại → 404.
- **Security/data consistency risks:** Unique constraint bảo vệ duplicate seats.
- **Evidence required:** Curl, Swagger, migration file.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] DB constraints đúng.
  - [ ] Audit log.
  - [ ] Unit test.

---

## BL-008: Admin tạo suất chiếu (snapshot seat map)

- **Epic:** Epic 2 — Cinema, Screen, Seat & Showtime Management
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn tạo suất chiếu cho phim tại phòng chiếu cụ thể, và hệ thống tự động tạo snapshot ghế cho suất chiếu đó.
- **Business value:** Suất chiếu là đơn vị bán hàng. Snapshot seat map đảm bảo mỗi suất chiếu có inventory ghế riêng.
- **Functional requirements:**
  - Tạo suất chiếu: movie_id, screen_id, start_time, end_time, base_price.
  - Hệ thống tự động copy seats của screen → tạo showtime_seats với status AVAILABLE.
  - Kiểm tra conflict: không overlap suất chiếu trên cùng screen.
- **Acceptance criteria:**
  - [ ] POST `/admin/showtimes` tạo suất chiếu → 201.
  - [ ] showtime_seats được tạo tự động, mỗi ghế status = AVAILABLE.
  - [ ] Suất chiếu overlap trên cùng screen → 409 Conflict.
  - [ ] Movie hoặc screen không tồn tại → 404.
  - [ ] start_time < now → 400.
- **API endpoints:** `POST /admin/showtimes`
- **Database impact:** INSERT `showtimes` + BATCH INSERT `showtime_seats`. Phải trong transaction.
- **Edge cases:**
  - Screen chưa có seats → 400 (phải tạo layout ghế trước).
  - Tạo suất chiếu cho phim COMING_SOON → cho phép (Admin biết khi nào phim ra mắt).
  - end_time < start_time → 400.
- **Failure cases:** Transaction failure khi tạo showtime_seats → rollback toàn bộ.
- **Security/data consistency risks:** Showtime seat snapshot phải atomic — không được tạo showtime mà không có seats.
- **Evidence required:** Curl, DB query showtime_seats count, Swagger.
- **Definition of Done:**
  - [ ] API hoạt động, snapshot seats đúng.
  - [ ] Transaction atomic.
  - [ ] Overlap detection.
  - [ ] Audit log.
  - [ ] Unit test.

---

## BL-009: Admin cập nhật/hủy suất chiếu

- **Epic:** Epic 2
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn cập nhật hoặc hủy suất chiếu, nhưng không được sửa suất chiếu đã có booking CONFIRMED.
- **Business value:** Linh hoạt quản lý lịch chiếu, bảo vệ khách đã đặt vé.
- **Acceptance criteria:**
  - [ ] PATCH `/admin/showtimes/:id` cập nhật thành công nếu chưa có booking CONFIRMED.
  - [ ] POST `/admin/showtimes/:id/cancel` hủy suất chiếu.
  - [ ] Có booking CONFIRMED → 409 Conflict.
- **API endpoints:** `PATCH /admin/showtimes/:id`, `POST /admin/showtimes/:id/cancel`
- **Database impact:** UPDATE `showtimes`. Check `bookings` có CONFIRMED không.
- **Edge cases:** Suất chiếu đã qua → 400. Suất chiếu đã CANCELLED → 400.
- **Failure cases:** ID không tồn tại → 404.
- **Security/data consistency risks:** Business rule: không sửa/xóa suất chiếu có booking CONFIRMED.
- **Evidence required:** Curl test cả 2 case (có/không có booking).
- **Definition of Done:**
  - [ ] API hoạt động, business rule enforced.
  - [ ] Audit log.
  - [ ] Unit test cho cả allow/deny cases.

---

## BL-010: Admin quản lý phim (CRUD)

- **Epic:** Epic 2
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn tạo và cập nhật thông tin phim.
- **Business value:** Phim là sản phẩm chính của hệ thống.
- **Acceptance criteria:**
  - [ ] POST `/admin/movies` tạo phim → 201.
  - [ ] PATCH `/admin/movies/:id` cập nhật phim → 200.
  - [ ] Thiếu required fields → 400.
  - [ ] Khi cập nhật phim → trigger rebuild embedding (nếu embedding đã tồn tại).
- **API endpoints:** `POST /admin/movies`, `PATCH /admin/movies/:id`
- **Database impact:** INSERT/UPDATE bảng `movies`. Trigger enqueue embedding job khi content thay đổi.
- **Edge cases:** Title trùng → cho phép (phim khác nhau có thể trùng tên).
- **Failure cases:** Body validation fail → 400.
- **Security/data consistency risks:** Chỉ Admin. Audit log bắt buộc.
- **Evidence required:** Curl, Swagger.
- **Definition of Done:**
  - [ ] API hoạt động, RBAC.
  - [ ] DTO validation.
  - [ ] Audit log.
  - [ ] Embedding re-trigger khi content đổi.
  - [ ] Unit test.

---

## BL-011: Admin quản lý trailer

- **Epic:** Epic 2
- **Priority:** Should
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn cập nhật trailer URL, publish/unpublish trailer.
- **Business value:** Trailer giúp khách quyết định xem phim.
- **Acceptance criteria:**
  - [ ] PATCH `/admin/movies/:id/trailer` cập nhật trailer URL/metadata.
  - [ ] POST `/admin/movies/:id/trailer/publish` → trailer hiển thị cho Guest.
  - [ ] POST `/admin/movies/:id/trailer/unpublish` → trailer ẩn.
- **API endpoints:** `PATCH /admin/movies/:id/trailer`, `POST .../publish`, `POST .../unpublish`
- **Database impact:** INSERT/UPDATE bảng `movie_trailers`.
- **Edge cases:** Publish khi chưa có URL → 400.
- **Failure cases:** Movie ID không tồn tại → 404.
- **Security/data consistency risks:** Unpublished trailer không hiển thị public.
- **Evidence required:** Curl test publish/unpublish, verify public API.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] State transition đúng.
  - [ ] Audit log.
  - [ ] Unit test.

---

## BL-012: Customer đăng ký tài khoản

- **Epic:** Epic 3 — Authentication & RBAC
- **Priority:** Must
- **Actor:** Guest (trở thành Customer)
- **User story:** Là Guest, tôi muốn đăng ký tài khoản bằng email và mật khẩu để có thể đặt vé.
- **Business value:** Chuyển đổi Guest → Customer, mở khóa booking flow.
- **Functional requirements:**
  - Input: email, password, full_name.
  - Password hash bằng bcrypt (salt rounds ≥ 10).
  - Email unique constraint.
  - Auto-assign role CUSTOMER.
  - Trả về user info (không trả password).
- **Acceptance criteria:**
  - [ ] POST `/auth/register` → 201, trả user info.
  - [ ] Email đã tồn tại → 409 Conflict.
  - [ ] Password < 8 ký tự → 400.
  - [ ] Email format sai → 400.
  - [ ] Password KHÔNG được trả về trong response.
- **API endpoints:** `POST /auth/register`
- **Database impact:** INSERT bảng `users`. Unique constraint trên `email`.
- **Edge cases:**
  - Hai request đăng ký cùng email đồng thời → DB unique constraint bắt 1 request lỗi.
  - Email có spaces → trim trước khi validate.
  - Email mixed case → normalize lowercase.
- **Failure cases:** Database connection error → 500.
- **Security/data consistency risks:**
  - KHÔNG lưu plaintext password.
  - KHÔNG trả password hash trong response.
  - Rate limit register endpoint để chống spam.
- **Evidence required:** Curl register, DB query user (verify hash), duplicate email test.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] Bcrypt hash verified.
  - [ ] Unique email enforced.
  - [ ] Unit test.

---

## BL-013: Customer đăng nhập

- **Epic:** Epic 3
- **Priority:** Must
- **Actor:** Customer, Staff, Admin
- **User story:** Là Customer, tôi muốn đăng nhập bằng email/password để truy cập API cần xác thực.
- **Business value:** Gateway vào toàn bộ authenticated features.
- **Functional requirements:**
  - Input: email, password.
  - Verify password bằng bcrypt.compare.
  - Trả JWT access token (short-lived, 15-30 phút) + refresh token (long-lived).
  - Lưu refresh token hash vào DB.
- **Acceptance criteria:**
  - [ ] POST `/auth/login` → 200, trả access_token + refresh_token.
  - [ ] Email không tồn tại → 401 Unauthorized.
  - [ ] Password sai → 401 Unauthorized (không phân biệt email/password sai).
  - [ ] Access token chứa: user_id, role, exp.
- **API endpoints:** `POST /auth/login`
- **Database impact:** SELECT `users`, INSERT `refresh_tokens`.
- **Edge cases:**
  - Account bị disable (nếu có flag) → 401.
  - Login nhiều lần → tạo nhiều refresh tokens (design decision: giới hạn?).
- **Failure cases:** JWT signing error → 500.
- **Security/data consistency risks:**
  - Timing attack: bcrypt.compare đủ chậm tự nhiên.
  - Không trả thông tin "email not found" vs "password wrong" — đều là 401.
- **Evidence required:** Curl login, decode JWT payload.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] JWT payload đúng.
  - [ ] Refresh token lưu hash trong DB.
  - [ ] Unit test.

---

## BL-014: Refresh token rotation

- **Epic:** Epic 3
- **Priority:** Must
- **Actor:** Customer, Staff, Admin
- **User story:** Là Customer, tôi muốn refresh access token mà không cần login lại.
- **Business value:** UX — không bắt user đăng nhập liên tục.
- **Acceptance criteria:**
  - [ ] POST `/auth/refresh` gửi refresh_token → trả access_token mới + refresh_token mới.
  - [ ] Refresh token cũ bị revoke sau khi sử dụng.
  - [ ] Refresh token expired → 401.
  - [ ] Refresh token đã revoke → 401.
- **API endpoints:** `POST /auth/refresh`
- **Database impact:** UPDATE `refresh_tokens` (revoke cũ), INSERT refresh token mới.
- **Edge cases:** Dùng refresh token cũ (đã rotated) → 401 + revoke tất cả tokens của user (reuse detection).
- **Failure cases:** DB error → 500.
- **Security/data consistency risks:** Token reuse detection quan trọng — nếu ai đó dùng lại token cũ → có thể bị đánh cắp.
- **Evidence required:** Curl refresh flow, verify token cũ bị revoke.
- **Definition of Done:**
  - [ ] Rotation hoạt động.
  - [ ] Reuse detection.
  - [ ] Unit test.

---

## BL-015: Logout / Revoke refresh token

- **Epic:** Epic 3
- **Priority:** Must
- **Actor:** Customer, Staff, Admin
- **User story:** Là Customer, tôi muốn logout để revoke refresh token.
- **Acceptance criteria:**
  - [ ] POST `/auth/logout` → 200, refresh token bị revoke.
  - [ ] Dùng refresh token sau logout → 401.
- **API endpoints:** `POST /auth/logout`
- **Database impact:** UPDATE `refresh_tokens` set revoked = true.
- **Edge cases:** Logout khi đã logout → 200 (idempotent).
- **Security/data consistency risks:** Access token vẫn valid đến khi expire (stateless JWT limitation).
- **Evidence required:** Curl logout → try refresh → 401.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] Idempotent.
  - [ ] Unit test.

---

## BL-016: RBAC Guard

- **Epic:** Epic 3
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, tôi cần bảo vệ API endpoints theo role để chỉ actor phù hợp mới truy cập được.
- **Business value:** Bảo mật — ngăn customer truy cập admin API, staff truy cập payment.
- **Functional requirements:**
  - Guard kiểm tra JWT → extract role → so sánh với required roles của endpoint.
  - Public endpoints: không cần guard.
  - Customer endpoints: role CUSTOMER.
  - Staff endpoints: role STAFF.
  - Admin endpoints: role ADMIN.
- **Acceptance criteria:**
  - [ ] Customer access `/admin/*` → 403 Forbidden.
  - [ ] Staff access `/admin/*` → 403.
  - [ ] No token access protected endpoint → 401.
  - [ ] Expired token → 401.
  - [ ] Admin access `/admin/*` → 200.
- **API endpoints:** Cross-cutting, áp dụng cho toàn bộ protected endpoints.
- **Database impact:** Không. Role lấy từ JWT payload.
- **Edge cases:** Token bị tamper → 401. Role không tồn tại trong system → 403.
- **Failure cases:** JWT verification error → 401.
- **Security/data consistency risks:**
  - JWT secret phải đủ mạnh.
  - Không dùng algorithm none.
- **Evidence required:** Curl test từng role truy cập sai endpoint.
- **Definition of Done:**
  - [ ] Guard hoạt động cho tất cả role combinations.
  - [ ] Unit test cho allow/deny cases.
  - [ ] Swagger hiển thị auth requirement.
