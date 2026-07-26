# 5. Entity Detail — Showtime, Seat Snapshot & Booking Flow

---

## Entity: `showtimes`

### Purpose
Suất chiếu phim — kết nối phim + phòng chiếu + thời gian + giá. Là đơn vị bán hàng chính.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `movie_id` | UUID | No | FK → movies | — |
| `screen_id` | UUID | No | FK → screens | — |
| `start_time` | TIMESTAMPTZ | No | Giờ bắt đầu chiếu | `2026-07-10T19:00:00Z` |
| `end_time` | TIMESTAMPTZ | No | Giờ kết thúc | `2026-07-10T22:00:00Z` |
| `base_price` | INTEGER | No | Giá cơ bản (VND, đơn vị đồng) | `85000` |
| `status` | VARCHAR(20) | No | Trạng thái suất chiếu | `SCHEDULED` |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Foreign Keys
- `movie_id → movies(id)` ON DELETE RESTRICT
- `screen_id → screens(id)` ON DELETE RESTRICT

### Constraints
- `chk_showtimes_status` — CHECK(status IN ('SCHEDULED', 'CANCELLED')).
- `chk_showtimes_time` — CHECK(end_time > start_time).
- `chk_showtimes_price` — CHECK(base_price > 0).

### Indexes
- `idx_showtimes_movie_id` — INDEX(movie_id). Filter suất chiếu theo phim.
- `idx_showtimes_screen_id` — INDEX(screen_id). Filter suất chiếu theo phòng.
- `idx_showtimes_start_time` — INDEX(start_time). Filter suất chiếu theo ngày/giờ.
- `idx_showtimes_movie_id_start_time` — Composite INDEX. Query phổ biến nhất: suất chiếu theo phim + ngày.

### Business Rules
- Không overlap suất chiếu trên cùng screen (check ở application layer + có thể dùng exclusion constraint nâng cao).
- Không sửa/xóa suất chiếu có booking CONFIRMED (application check).
- `base_price` dùng đơn vị đồng (integer), không dùng float → tránh lỗi tính toán số thập phân.

### Common Queries
```sql
-- Public listing: suất chiếu theo phim + ngày
SELECT s.*, m.title, scr.name as screen_name, c.name as cinema_name
FROM showtimes s
JOIN movies m ON s.movie_id = m.id
JOIN screens scr ON s.screen_id = scr.id
JOIN cinemas c ON scr.cinema_id = c.id
WHERE s.movie_id = $1
  AND s.start_time >= $2 AND s.start_time < $3
  AND s.status = 'SCHEDULED'
ORDER BY s.start_time;
```

### Design Notes
- **Price dùng INTEGER (đồng)** — tránh floating point errors. 85000 = 85.000 VND.
- **Lỗi cần tránh:** Dùng FLOAT/DECIMAL cho price → sai số khi tính tổng. Dùng INTEGER luôn chính xác.

---

## Entity: `showtime_seats`

### Purpose
**Snapshot ghế cho mỗi suất chiếu.** Đây là bảng quan trọng nhất cho booking flow — track trạng thái từng ghế (AVAILABLE/HELD/SOLD/BLOCKED).

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `showtime_id` | UUID | No | FK → showtimes | — |
| `seat_id` | UUID | No | FK → seats (reference gốc) | — |
| `row` | VARCHAR(5) | No | Copy từ seats.row | `A` |
| `number` | INTEGER | No | Copy từ seats.number | `5` |
| `seat_type` | VARCHAR(20) | No | Copy từ seats.seat_type | `STANDARD` |
| `status` | VARCHAR(20) | No | Trạng thái ghế cho suất chiếu này | `AVAILABLE` |
| `price` | INTEGER | No | Giá ghế (= showtime.base_price, có thể override) | `85000` |
| `held_by_user_id` | UUID | Yes | Customer đang hold ghế | — |
| `held_until` | TIMESTAMPTZ | Yes | Thời điểm hold hết hạn | — |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Foreign Keys
- `showtime_id → showtimes(id)` ON DELETE CASCADE
- `seat_id → seats(id)` ON DELETE RESTRICT

### Constraints
- `uq_showtime_seats_showtime_seat` — **UNIQUE(showtime_id, seat_id)**. Mỗi suất chiếu, mỗi ghế chỉ có 1 record.
- `chk_showtime_seats_status` — CHECK(status IN ('AVAILABLE', 'HELD', 'SOLD', 'BLOCKED')).
- `chk_showtime_seats_price` — CHECK(price > 0).

### Indexes
- `idx_showtime_seats_showtime_id` — INDEX(showtime_id). Query tất cả ghế cho suất chiếu.
- `idx_showtime_seats_showtime_status` — INDEX(showtime_id, status). Filter ghế theo trạng thái.
- `idx_showtime_seats_held_by` — INDEX(held_by_user_id) WHERE held_by_user_id IS NOT NULL. Tìm ghế đang hold bởi user.

### Business Rules
- **Tạo snapshot:** Khi tạo showtime → copy tất cả seats của screen → tạo showtime_seats, status = AVAILABLE, price = base_price.
- **Hold ghế:** Status AVAILABLE → HELD, set held_by_user_id, held_until = now + 5 phút.
- **Sold ghế:** Status HELD → SOLD khi payment confirmed.
- **Release ghế:** Status HELD → AVAILABLE khi hold expire hoặc customer hủy.
- **Block ghế:** Status AVAILABLE → BLOCKED (admin block ghế bị hỏng).

### Common Queries
```sql
-- Seat map cho Guest/Customer
SELECT id, row, number, seat_type, status, price
FROM showtime_seats
WHERE showtime_id = $1
ORDER BY row, number;

-- Lock ghế cho hold (CRITICAL — SELECT FOR UPDATE)
SELECT id, status, held_by_user_id
FROM showtime_seats
WHERE showtime_id = $1 AND id = ANY($2::uuid[])
FOR UPDATE;
```

### Design Notes
- **Đây là bảng được lock nhiều nhất** — cần `SELECT FOR UPDATE` khi hold ghế.
- **Copy row/number/seat_type** thay vì chỉ reference seat_id → avoid JOIN khi query seat map, denormalization có chủ đích.
- **held_by_user_id denormalize** thay vì JOIN seat_holds → nhanh hơn khi check seat map.
- **Lỗi cần tránh:** Quên `FOR UPDATE` khi hold ghế → race condition → double booking.

---

## Entity: `seat_holds`

### Purpose
Bản ghi giữ ghế tạm thời của customer. Track lifecycle: ACTIVE → EXPIRED/CANCELLED/CONVERTED.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `user_id` | UUID | No | FK → users (customer) | — |
| `showtime_id` | UUID | No | FK → showtimes | — |
| `status` | VARCHAR(30) | No | Trạng thái hold | `ACTIVE` |
| `expires_at` | TIMESTAMPTZ | No | Hết hạn (now + 5 phút) | — |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Constraints
- `chk_seat_holds_status` — CHECK(status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'CONVERTED_TO_BOOKING')).

### Indexes
- `idx_seat_holds_user_showtime` — INDEX(user_id, showtime_id). Kiểm tra user đã có active hold cho suất chiếu.
- `idx_seat_holds_status` — INDEX(status) WHERE status = 'ACTIVE'. Tìm hold active.
- `idx_seat_holds_expires_at` — INDEX(expires_at) WHERE status = 'ACTIVE'. Job expire tìm hold hết hạn.

### Design Notes
- **Seat hold là bản ghi nhóm** — 1 hold có thể chứa nhiều ghế (thông qua showtime_seats.held_by_user_id hoặc bảng trung gian seat_hold_items).
- **Design decision:** Dùng seat_hold là bản ghi nhóm + showtime_seats.held_by_user_id chỉ user, thay vì bảng trung gian, đơn giản hơn cho MVP.

---

## Entity: `bookings`

### Purpose
Đơn đặt vé — kết quả của quá trình hold ghế → tạo booking → thanh toán → nhận vé.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `user_id` | UUID | No | FK → users | — |
| `showtime_id` | UUID | No | FK → showtimes | — |
| `seat_hold_id` | UUID | Yes | FK → seat_holds (truy vết) | — |
| `total_amount` | INTEGER | No | Tổng tiền (VND, backend tính) | `170000` |
| `status` | VARCHAR(20) | No | Trạng thái booking | `PENDING_PAYMENT` |
| `expires_at` | TIMESTAMPTZ | No | Hết hạn thanh toán (now + 15 phút) | — |
| `confirmed_at` | TIMESTAMPTZ | Yes | Thời điểm confirm | — |
| `cancelled_at` | TIMESTAMPTZ | Yes | Thời điểm hủy | — |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Foreign Keys
- `user_id → users(id)` ON DELETE RESTRICT
- `showtime_id → showtimes(id)` ON DELETE RESTRICT
- `seat_hold_id → seat_holds(id)` ON DELETE SET NULL

### Constraints
- `chk_bookings_status` — CHECK(status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED')).
- `chk_bookings_amount` — CHECK(total_amount > 0).

### Indexes
- `idx_bookings_user_id` — INDEX(user_id). Query lịch sử booking theo customer.
- `idx_bookings_showtime_id` — INDEX(showtime_id). Query bookings theo suất chiếu.
- `idx_bookings_status` — INDEX(status). Filter booking theo trạng thái.
- `idx_bookings_expires_at` — INDEX(expires_at) WHERE status = 'PENDING_PAYMENT'. Job expire tìm booking hết hạn.

### Common Queries
```sql
-- Customer booking history
SELECT b.*, s.start_time, m.title
FROM bookings b
JOIN showtimes s ON b.showtime_id = s.id
JOIN movies m ON s.movie_id = m.id
WHERE b.user_id = $1
ORDER BY b.created_at DESC
LIMIT $2 OFFSET $3;
```

---

## Entity: `booking_seats`

### Purpose
Danh sách ghế trong booking. Liên kết booking ↔ showtime_seats.

### Important Fields

| Field | Type | Nullable | Description |
|-------|------|:--------:|-------------|
| `id` | UUID | No | Primary key |
| `booking_id` | UUID | No | FK → bookings |
| `showtime_seat_id` | UUID | No | FK → showtime_seats |
| `price` | INTEGER | No | Giá ghế tại thời điểm booking |
| `created_at` | TIMESTAMPTZ | No | — |

### Constraints
- `uq_booking_seats_booking_showtime_seat` — **UNIQUE(booking_id, showtime_seat_id)**. Không trùng ghế trong booking.
- `uq_booking_seats_showtime_seat` — **UNIQUE(showtime_seat_id)** trên booking CONFIRMED. Một ghế chỉ thuộc 1 booking (chống double booking ở DB level).

### Design Notes
- **price snapshot** — lưu giá tại thời điểm booking, không tham chiếu lại showtime_seats.price (giá có thể thay đổi).
- Unique trên showtime_seat_id là tuyến phòng thủ cuối cùng chống double booking ở DB level.

---

## Entity: `tickets`

### Purpose
Vé xem phim — bằng chứng mua hàng cuối cùng. Mỗi ghế trong booking CONFIRMED tạo 1 ticket. Staff dùng ticket_code để check-in.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `booking_id` | UUID | No | FK → bookings | — |
| `booking_seat_id` | UUID | No | FK → booking_seats | — |
| `ticket_code` | VARCHAR(20) | No | Code unique để tra cứu/QR | `TKT-A1B2C3D4` |
| `status` | VARCHAR(20) | No | Trạng thái vé | `ACTIVE` |
| `checked_in_at` | TIMESTAMPTZ | Yes | Thời điểm check-in | — |
| `checked_in_by` | UUID | Yes | FK → users (staff) | — |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Constraints
- `uq_tickets_ticket_code` — **UNIQUE(ticket_code)**. Không trùng mã vé toàn hệ thống.
- `uq_tickets_booking_seat` — **UNIQUE(booking_seat_id)**. Mỗi booking_seat chỉ có 1 ticket.
- `chk_tickets_status` — CHECK(status IN ('ACTIVE', 'CHECKED_IN', 'CANCELLED')).

### Indexes
- `idx_tickets_ticket_code` — UNIQUE INDEX. Staff tra cứu vé bằng code.
- `idx_tickets_booking_id` — INDEX. Customer xem danh sách vé theo booking.

### Common Queries
```sql
-- Staff tra cứu vé
SELECT t.*, bs.price, ss.row, ss.number, b.showtime_id,
       s.start_time, m.title, u.full_name as customer_name
FROM tickets t
JOIN booking_seats bs ON t.booking_seat_id = bs.id
JOIN showtime_seats ss ON bs.showtime_seat_id = ss.id
JOIN bookings b ON t.booking_id = b.id
JOIN showtimes s ON b.showtime_id = s.id
JOIN movies m ON s.movie_id = m.id
JOIN users u ON b.user_id = u.id
WHERE t.ticket_code = $1;
```
