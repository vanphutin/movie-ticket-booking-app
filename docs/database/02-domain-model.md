# 2. Core Domain Model

---

## 2.1. Nhóm entity

### Nhóm 1: User & Access Control

| Entity | Trách nhiệm |
|---|---|
| `users` | Thông tin tài khoản (Customer/Staff/Admin) |
| `roles` | Định nghĩa vai trò và quyền hạn |
| `refresh_tokens` | Quản lý refresh token (hash, revoke, expiry) |

### Nhóm 2: Movie Catalog

| Entity | Trách nhiệm |
|---|---|
| `movies` | Thông tin chi tiết phim |
| `movie_trailers` | Trailer URL và metadata, trạng thái publish |

### Nhóm 3: Cinema Structure

| Entity | Trách nhiệm |
|---|---|
| `cinemas` | Thông tin rạp chiếu phim |
| `screens` | Phòng chiếu thuộc rạp |
| `seats` | Ghế vật lý cố định trong phòng chiếu |

### Nhóm 4: Showtime & Seat Snapshot

| Entity | Trách nhiệm |
|---|---|
| `showtimes` | Suất chiếu (movie + screen + thời gian + giá) |
| `showtime_seats` | **Snapshot** ghế cho mỗi suất chiếu — inventory bán vé |

### Nhóm 5: Booking Flow

| Entity | Trách nhiệm |
|---|---|
| `seat_holds` | Lệnh giữ ghế tạm thời của customer |
| `bookings` | Đơn đặt vé |
| `booking_seats` | Danh sách ghế trong booking |
| `tickets` | Vé xem phim — bằng chứng mua hàng, dùng check-in |

### Nhóm 6: Payment Flow

| Entity | Trách nhiệm |
|---|---|
| `payments` | Giao dịch thanh toán liên kết payOS |

### Nhóm 7: Operations & Logs

| Entity | Trách nhiệm |
|---|---|
| `audit_logs` | Ghi vết hành động người dùng |
| `integration_logs` | Ghi vết request/response tới third-party |

### Nhóm 8: AI & Semantic Search

| Entity | Trách nhiệm |
|---|---|
| `movie_embedding_documents` | Text profile phim + vector embeddings |
| `ai_request_logs` | Log chi tiết prompt/response AI provider |
| `movie_ai_content_drafts` | Bản nháp nội dung AI cho phim (chờ admin duyệt) |
| `user_movie_preferences` | Sở thích xem phim của customer |
| `ai_recommendation_feedback` | Feedback của user cho AI recommendations |

### Nhóm 9: Stretch Goals (nếu còn thời gian)

| Entity | Trách nhiệm |
|---|---|
| `ai_chat_sessions` | Phiên chat tư vấn phim |
| `ai_chat_messages` | Tin nhắn trong phiên chat |
| `movie_reviews` | Đánh giá phim của customer |
| `movie_review_summaries` | Tóm tắt review do AI tạo |

---

## 2.2. ERD Text Description

### Quan hệ chính

```
users (1) ──────── (N) refresh_tokens
users (1) ──────── (N) seat_holds
users (1) ──────── (N) bookings
users (1) ──────── (N) user_movie_preferences
users (N) ──────── (1) roles

movies (1) ──────── (1) movie_trailers
movies (1) ──────── (N) showtimes
movies (1) ──────── (N) movie_embedding_documents
movies (1) ──────── (N) movie_ai_content_drafts

cinemas (1) ──────── (N) screens
screens (1) ──────── (N) seats
screens (1) ──────── (N) showtimes

showtimes (1) ──────── (N) showtime_seats
showtime_seats (N) ──── (1) seats          [snapshot reference]

showtime_seats (1) ──── (N) seat_holds     [qua showtime_id + seat_id]
seat_holds (1) ──────── (0..1) bookings    [hold chuyển thành booking]

bookings (1) ──────── (N) booking_seats
bookings (1) ──────── (N) tickets
bookings (1) ──────── (1) payments

booking_seats (N) ──── (1) showtime_seats
```

### Giải thích quan hệ quan trọng

#### seats vs showtime_seats (Snapshot Pattern)

- `seats` là ghế **vật lý cố định** trong phòng chiếu. Không bao giờ thay đổi trừ khi Admin thay đổi layout.
- `showtime_seats` là **bản sao (snapshot)** của seats cho một suất chiếu cụ thể. Mỗi suất chiếu có riêng inventory ghế.
- Khi Admin tạo showtime → hệ thống copy tất cả seats của screen → tạo showtime_seats với status AVAILABLE.
- Lý do: Mỗi suất chiếu cần track trạng thái ghế độc lập (AVAILABLE/HELD/SOLD). Nếu dùng seats trực tiếp, không thể phân biệt trạng thái ghế giữa các suất chiếu.

#### seat_holds → bookings (Conversion)

- `seat_holds` là bản ghi tạm thời: customer "giữ" ghế trong 5 phút.
- Khi customer tạo booking, seat_hold chuyển status → CONVERTED_TO_BOOKING.
- Booking reference seat_hold_id để truy vết.
- Nếu hold hết hạn mà không booking → hold EXPIRED, ghế về AVAILABLE.

#### bookings → payments (1:1)

- Mỗi booking có tối đa 1 payment active.
- Payment có thể PENDING → PAID hoặc PENDING → EXPIRED.
- Khi payment PAID → booking CONFIRMED → tạo tickets.

#### bookings → tickets (1:N)

- Mỗi booking seat tạo 1 ticket.
- Ticket là bằng chứng cuối cùng, dùng để check-in tại rạp.
- Ticket có unique ticket_code để Staff tra cứu.

---

## 2.3. Cardinality Summary

| Quan hệ | Cardinality | Cascade Delete |
|----------|:-----------:|:--------------:|
| cinema → screens | 1:N | CASCADE |
| screen → seats | 1:N | CASCADE |
| screen → showtimes | 1:N | RESTRICT (có booking thì không xóa) |
| movie → showtimes | 1:N | RESTRICT |
| movie → movie_trailers | 1:1 | CASCADE |
| movie → movie_embedding_documents | 1:N | CASCADE |
| movie → movie_ai_content_drafts | 1:N | CASCADE |
| showtime → showtime_seats | 1:N | CASCADE |
| showtime_seat → seat_holds | 1:N | RESTRICT |
| user → seat_holds | 1:N | RESTRICT |
| user → bookings | 1:N | RESTRICT |
| user → refresh_tokens | 1:N | CASCADE |
| user → roles | N:1 | RESTRICT |
| booking → booking_seats | 1:N | CASCADE |
| booking → tickets | 1:N | CASCADE |
| booking → payments | 1:1 | CASCADE |
| seat_hold → booking | 1:0..1 | SET NULL |
