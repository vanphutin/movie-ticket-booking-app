# 6. API Backlog Summary

## Delivery order tuần 4–10

| Tuần | API được phép mở | Phụ thuộc |
|---:|---|---|
| 4 | `/auth/*`, `/me` | Khởi tạo Identity/Gateway |
| 5 | Public/Admin movie + trailer | Actor context/RBAC tuần 4 |
| 6 | Public/Admin cinema, screen, seat layout và showtime | Movie tuần 5 |
| 7 | Seat map, seat hold và booking | Showtime event tuần 6 + actor tuần 4 |
| 8 | Payment, webhook và ticket/check-in | Booking tuần 7 |
| 9 | Không mở domain API mới; chỉ operational endpoints nếu cần | Core tuần 4–8 |
| 10 | Không mở endpoint mới; đóng contract và regression | Release candidate tuần 9 |

Các AI endpoints ở mục 6.8 là **stretch backlog**, không thuộc release gate nếu core chưa hoàn tất.

---

Canonical inventory và delivery disposition nằm tại
`AI-contracts/traceability/backlog-contract-map.yml` theo CCR-005. Các path dưới đây là
projection không có prefix `/api/v1`; `:id` tương đương `{id}`. `CORE_REQUIRED` mới chặn
MVP release; priority không tự động cấp quyền triển khai. Staff là `POST_MVP`; toàn bộ AI
và preferences là `STRETCH`; trailer management và payment reconcile là `CORE_OPTIONAL`.

## 6.1. Public APIs

| Method | Path | Actor | Purpose | Auth | Priority | Backlog |
|--------|------|-------|---------|------|----------|---------|
| GET | `/movies` | Guest | Danh sách phim, filter genre/status | No | Must | BL-001 |
| GET | `/movies/:id` | Guest | Chi tiết phim | No | Must | BL-002 |
| GET | `/movies/:id/trailer` | Guest | Trailer published | No | Must | BL-002 |
| GET | `/cinemas` | Guest | Danh sách rạp | No | Must | BL-003 |
| GET | `/cinemas/:id` | Guest | Chi tiết rạp | No | Must | BL-003 |
| GET | `/showtimes` | Guest | Suất chiếu theo movie/cinema/date | No | Must | BL-004 |
| GET | `/showtimes/:id` | Guest | Chi tiết suất chiếu | No | Must | BL-004 |
| GET | `/showtimes/:id/seats` | Guest | Seat map và trạng thái ghế | No | Must | BL-005 |

---

## 6.2. Auth APIs

| Method | Path | Actor | Purpose | Auth | Priority | Backlog |
|--------|------|-------|---------|------|----------|---------|
| POST | `/auth/register` | Guest | Đăng ký customer | No | Must | BL-012 |
| POST | `/auth/login` | Guest | Đăng nhập | No | Must | BL-013 |
| POST | `/auth/refresh` | Any | Refresh access token | Refresh Token | Must | BL-014 |
| POST | `/auth/logout` | Authenticated | Revoke refresh token | JWT | Must | BL-015 |

---

## 6.3. Customer APIs

| Method | Path | Actor | Purpose | Auth | Priority | Backlog |
|--------|------|-------|---------|------|----------|---------|
| GET | `/me` | Customer | Profile hiện tại | JWT | Must | BL-012 |
| PATCH | `/me/preferences` | Customer | Cập nhật sở thích phim | JWT | Could | S-6 |
| POST | `/showtimes/:id/holds` | Customer | Giữ ghế | JWT | Must | BL-017 |
| DELETE | `/holds/:id` | Customer | Hủy giữ ghế | JWT | Must | BL-018 |
| POST | `/bookings` | Customer | Tạo booking | JWT | Must | BL-020 |
| GET | `/bookings` | Customer | Lịch sử booking của actor hiện tại | JWT | Must | BL-021 |
| GET | `/bookings/:id` | Customer | Chi tiết booking | JWT | Must | BL-021 |
| POST | `/bookings/:id/cancel` | Customer | Hủy booking | JWT | Must | BL-022 |
| GET | `/tickets` | Customer | Danh sách vé của actor hiện tại | JWT | Must | BL-024 |
| GET | `/tickets/:id` | Customer | Chi tiết vé | JWT | Must | BL-024 |

---

## 6.4. Staff APIs — `POST_MVP`

| Method | Path | Actor | Purpose | Auth | Priority | Backlog |
|--------|------|-------|---------|------|----------|---------|
| GET | `/staff/tickets/:code` | Staff | Tra cứu vé bằng code | JWT | Must | BL-025 |
| POST | `/staff/tickets/:id/check-in` | Staff | Check-in vé | JWT | Must | BL-026 |
| GET | `/staff/showtimes/:id/check-ins` | Staff | Danh sách vé đã check-in | JWT | Must | BL-026 |

---

## 6.5. Admin APIs

| Method | Path | Actor | Purpose | Auth | Priority | Backlog |
|--------|------|-------|---------|------|----------|---------|
| POST | `/admin/movies` | Admin | Tạo phim | JWT | Must | BL-010 |
| PATCH | `/admin/movies/:id` | Admin | Cập nhật phim | JWT | Must | BL-010 |
| PATCH | `/admin/movies/:id/trailer` | Admin | Cập nhật trailer | JWT | Should | BL-011 |
| POST | `/admin/movies/:id/trailer/publish` | Admin | Publish trailer | JWT | Should | BL-011 |
| POST | `/admin/movies/:id/trailer/unpublish` | Admin | Unpublish trailer | JWT | Should | BL-011 |
| POST | `/admin/cinemas` | Admin | Tạo rạp | JWT | Must | BL-006 |
| PATCH | `/admin/cinemas/:id` | Admin | Cập nhật rạp | JWT | Must | BL-006 |
| POST | `/admin/cinemas/:id/screens` | Admin | Tạo phòng chiếu thuộc rạp | JWT | Must | BL-007 |
| POST | `/admin/screens/:id/seats` | Admin | Tạo layout ghế | JWT | Must | BL-007 |
| POST | `/admin/screens/:id/showtimes` | Admin | Tạo suất chiếu thuộc phòng | JWT | Must | BL-008 |
| PATCH | `/admin/showtimes/:id` | Admin | Cập nhật suất chiếu | JWT | Must | BL-009 |
| POST | `/admin/showtimes/:id/cancel` | Admin | Hủy suất chiếu | JWT | Must | BL-009 |
| GET | `/admin/bookings` | Admin | Quản lý bookings | JWT | Must | BL-021 |
| GET | `/admin/payments` | Admin | Quản lý payments | JWT | Must | BL-030 |
| POST | `/admin/payments/:id/reconcile` | Admin | Yêu cầu reconciliation payment | JWT | Should | BL-030 |
| GET | `/admin/audit-logs` | Admin | Xem audit logs | JWT | Must | BL-043 |
| GET | `/admin/integration-logs` | Admin | Xem integration logs | JWT | Must | BL-044 |

---

## 6.6. Payment APIs

| Method | Path | Actor | Purpose | Auth | Priority | Backlog |
|--------|------|-------|---------|------|----------|---------|
| POST | `/bookings/:id/payments` | Customer | Tạo payment qua provider-neutral port (payOS adapter) | JWT | Must | BL-027 |
| GET | `/payments/:id` | Customer | Xem payment status | JWT | Must | BL-030 |

---

## 6.7. Webhook APIs

| Method | Path | Actor | Purpose | Auth | Priority | Backlog |
|--------|------|-------|---------|------|----------|---------|
| POST | `/webhooks/payments/payos` | System (payOS) | Nhận webhook thanh toán | Signature | Must | BL-028, BL-029 |

---

## 6.8. AI APIs — `STRETCH`

| Method | Path | Actor | Purpose | Auth | Priority | Backlog |
|--------|------|-------|---------|------|----------|---------|
| POST | `/ai/movie-search` | Guest/Customer | Tìm phim bằng NLP | No/JWT | Must | BL-034 |
| POST | `/ai/recommendations` | Customer | Gợi ý phim | JWT | Could | S-1 |
| POST | `/ai/recommendations/feedback` | Customer | Feedback gợi ý | JWT | Could | S-2 |
| POST | `/admin/movies/:id/ai/content-drafts` | Admin | AI gợi ý nội dung phim | JWT | Must | BL-037 |
| POST | `/admin/movies/:id/ai/trailer-description-drafts` | Admin | AI gợi ý mô tả trailer | JWT | Should | BL-038 |
| POST | `/admin/movies/:id/ai-content/:draftId/apply` | Admin | Duyệt AI content | JWT | Must | BL-039 |
| POST | `/admin/movies/:id/embeddings/rebuild` | Admin | Rebuild embedding 1 phim | JWT | Must | BL-035 |
| POST | `/admin/ai/embeddings/rebuild` | Admin | Rebuild tất cả embeddings | JWT | Must | BL-035 |
| GET | `/admin/ai/logs` | Admin | Xem AI logs | JWT | Must | BL-040 |
| GET | `/admin/ai/usage` | Admin | Xem AI usage stats | JWT | Should | BL-040 |

---

## 6.9. Tổng kết

| Nhóm | Số endpoints | Priority Must | Priority Should | Priority Could |
|------|:---:|:---:|:---:|:---:|
| Public | 8 | 8 | 0 | 0 |
| Auth | 4 | 4 | 0 | 0 |
| Customer | 10 | 9 | 0 | 1 |
| Staff | 3 | 3 | 0 | 0 |
| Admin | 17 | 13 | 4 | 0 |
| Payment | 2 | 2 | 0 | 0 |
| Webhook | 1 | 1 | 0 | 0 |
| AI | 10 | 5 | 3 | 2 |
| **Tổng** | **55** | **46** | **6** | **3** |

> Số đếm 46/6/3 là số đếm thực tế của 55 rows. Số 45/7/3 trước CCR-005 là lỗi
> tổng hợp. Delivery scope được quyết định bởi disposition, không phải chỉ bởi priority.
