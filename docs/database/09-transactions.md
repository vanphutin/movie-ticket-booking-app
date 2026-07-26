# 9. Critical Transactions

---

## Transaction 1: Create Showtime and Snapshot Seats

### Input
- movie_id, screen_id, start_time, end_time, base_price

### Tables Touched
- `showtimes` (INSERT)
- `showtime_seats` (BATCH INSERT)
- `seats` (SELECT — đọc layout ghế)
- `audit_logs` (INSERT)

### Transaction Steps
```sql
BEGIN;

-- 1. Validate: movie exists, screen exists
-- 2. Validate: no overlapping showtime on same screen
SELECT id FROM showtimes
WHERE screen_id = $screen_id
  AND status = 'SCHEDULED'
  AND (start_time, end_time) OVERLAPS ($start_time, $end_time);
-- Nếu có kết quả → ROLLBACK, trả 409 Conflict

-- 3. Validate: screen has seats
SELECT COUNT(*) FROM seats WHERE screen_id = $screen_id;
-- Nếu 0 → ROLLBACK, trả 400

-- 4. Insert showtime
INSERT INTO showtimes (movie_id, screen_id, start_time, end_time, base_price, status)
VALUES ($movie_id, $screen_id, $start_time, $end_time, $base_price, 'SCHEDULED')
RETURNING id;

-- 5. Snapshot seats → showtime_seats
INSERT INTO showtime_seats (showtime_id, seat_id, row, number, seat_type, status, price)
SELECT $showtime_id, s.id, s.row, s.number, s.seat_type, 'AVAILABLE', $base_price
FROM seats s WHERE s.screen_id = $screen_id;

-- 6. Audit log
INSERT INTO audit_logs (action, resource_type, resource_id, actor_id, ...)
VALUES ('CREATE_SHOWTIME', 'showtime', $showtime_id, $admin_id, ...);

COMMIT;
```

### Rollback Cases
- Movie không tồn tại → ROLLBACK trước INSERT.
- Screen không có seats → ROLLBACK.
- Overlap detected → ROLLBACK.
- Bất kỳ INSERT fail → auto ROLLBACK.

### Constraint Needed
- Foreign keys trên movie_id, screen_id.
- UNIQUE(showtime_id, seat_id) trên showtime_seats.

### Evidence Required
- DB query: `SELECT COUNT(*) FROM showtime_seats WHERE showtime_id = ?` = số seats của screen.
- Curl test overlap detection.

---

## Transaction 2: Hold Seats (CRITICAL — Chống Double Booking)

### Input
- user_id (từ JWT), showtime_id, seat_ids (array)

### Locking Strategy

**Pessimistic Locking với `SELECT ... FOR UPDATE`:**

```sql
BEGIN;

-- 1. Lock các showtime_seats cần hold (ORDER BY id để tránh deadlock)
SELECT id, status, held_by_user_id
FROM showtime_seats
WHERE showtime_id = $showtime_id
  AND id = ANY($seat_ids::uuid[])
ORDER BY id  -- ← QUAN TRỌNG: order cố định tránh deadlock
FOR UPDATE;  -- ← Lock rows cho đến khi COMMIT

-- 2. Validate: tất cả ghế phải AVAILABLE
-- Nếu bất kỳ ghế nào không AVAILABLE → ROLLBACK, trả 409

-- 3. Validate: suất chiếu chưa qua, chưa CANCELLED
-- 4. Validate: user chưa có active hold cho suất chiếu này (optional)

-- 5. Create seat_hold
INSERT INTO seat_holds (user_id, showtime_id, status, expires_at)
VALUES ($user_id, $showtime_id, 'ACTIVE', NOW() + INTERVAL '5 minutes')
RETURNING id;

-- 6. Update showtime_seats
UPDATE showtime_seats
SET status = 'HELD',
    held_by_user_id = $user_id,
    held_until = NOW() + INTERVAL '5 minutes',
    updated_at = NOW()
WHERE id = ANY($seat_ids::uuid[]);

-- 7. Audit log
INSERT INTO audit_logs (...) VALUES ('HOLD_SEAT', ...);

COMMIT;
-- 8. Enqueue BullMQ delayed job: expire seat hold sau 5 phút
```

### Tại sao chống được Double Booking

1. **`SELECT ... FOR UPDATE`** lock các rows trong showtime_seats. Request thứ 2 cùng ghế phải **chờ** request 1 commit/rollback.
2. Khi request 2 nhận được lock, ghế đã chuyển sang HELD → validation fail → 409 Conflict.
3. **Order BY id** đảm bảo tất cả transactions lock theo cùng thứ tự → **ngăn deadlock**.

### Race Condition Test (Bắt buộc)

```
Terminal 1:                          Terminal 2:
POST /seat-holds {A1, A2}           POST /seat-holds {A1, A3}
  → BEGIN                             → BEGIN
  → SELECT FOR UPDATE (A1, A2)        → SELECT FOR UPDATE (A1, A3)
  → A1, A2 = AVAILABLE                → BLOCKED (waiting for lock on A1)
  → UPDATE A1, A2 = HELD              
  → COMMIT                            → Lock released
                                       → A1 = HELD (not AVAILABLE!)
                                       → ROLLBACK → 409 Conflict
```

### Evidence Required
- Concurrent test output: 2 requests, chỉ 1 thành công.
- DB state: showtime_seats chỉ 1 HELD.
- Lock strategy document.

---

## Transaction 3: Create Booking from Active Hold

### Transaction Steps

```sql
BEGIN;

-- 1. Validate seat_hold active + ownership
SELECT * FROM seat_holds
WHERE id = $seat_hold_id
  AND user_id = $user_id
  AND status = 'ACTIVE'
  AND expires_at > NOW()
FOR UPDATE;
-- Nếu không tìm thấy → ROLLBACK, trả 400/403

-- 2. Get showtime_seats cho hold này
SELECT id, price FROM showtime_seats
WHERE showtime_id = $showtime_id
  AND held_by_user_id = $user_id
  AND status = 'HELD'
FOR UPDATE;

-- 3. Calculate total_amount = SUM(price)
-- Amount PHẢI do backend tính, KHÔNG trust client

-- 4. Create booking
INSERT INTO bookings (user_id, showtime_id, seat_hold_id, total_amount, status, expires_at)
VALUES ($user_id, $showtime_id, $seat_hold_id, $total_amount, 'PENDING_PAYMENT',
        NOW() + INTERVAL '15 minutes')
RETURNING id;

-- 5. Create booking_seats
INSERT INTO booking_seats (booking_id, showtime_seat_id, price)
SELECT $booking_id, id, price FROM showtime_seats
WHERE showtime_id = $showtime_id AND held_by_user_id = $user_id AND status = 'HELD';

-- 6. Update seat_hold status
UPDATE seat_holds SET status = 'CONVERTED_TO_BOOKING', updated_at = NOW()
WHERE id = $seat_hold_id;

-- 7. Audit log
INSERT INTO audit_logs (...) VALUES ('CREATE_BOOKING', ...);

COMMIT;
-- 8. Enqueue BullMQ: expire booking sau 15 phút
```

### Edge Case: Hold expire đúng lúc tạo booking
- `FOR UPDATE` lock seat_hold → check expires_at trong transaction → nếu expired → ROLLBACK.
- Background expire job cũng cần `FOR UPDATE` → một trong hai sẽ chờ.

---

## Transaction 4: Confirm Payment from Webhook

### Transaction Steps

```sql
BEGIN;

-- 1. Lookup payment by orderCode (FROM webhook data)
SELECT * FROM payments
WHERE order_code = $orderCode
FOR UPDATE;

-- 2. Idempotency check: if payment already PAID → skip
-- Trả 200 cho payOS, không process

-- 3. Verify: amount khớp, paymentLinkId khớp
-- Nếu mismatch → ROLLBACK, log error

-- 4. Check booking status: phải PENDING_PAYMENT
SELECT * FROM bookings WHERE id = $booking_id FOR UPDATE;
-- Nếu EXPIRED/CANCELLED → ROLLBACK, log warning

-- 5. Update payment
UPDATE payments SET status = 'PAID', paid_at = NOW() WHERE id = $payment_id;

-- 6. Update booking
UPDATE bookings SET status = 'CONFIRMED', confirmed_at = NOW() WHERE id = $booking_id;

-- 7. Update showtime_seats → SOLD
UPDATE showtime_seats SET status = 'SOLD', updated_at = NOW()
WHERE id IN (SELECT showtime_seat_id FROM booking_seats WHERE booking_id = $booking_id);

-- 8. Create tickets (1 per booking_seat)
INSERT INTO tickets (booking_id, booking_seat_id, ticket_code, status)
SELECT $booking_id, bs.id, generate_ticket_code(), 'ACTIVE'
FROM booking_seats bs WHERE bs.booking_id = $booking_id;

-- 9. Audit log
INSERT INTO audit_logs (...) VALUES ('CONFIRM_PAYMENT', ...);

COMMIT;
-- 10. Integration log (outside transaction)
INSERT INTO integration_logs (...) VALUES ('PAYOS', 'POST', '/webhooks/payos', ...);
```

### Idempotency Detail
- Step 2: Nếu `payments.status = 'PAID'` → trả 200 ngay, không vào transaction.
- Step 8: Tickets chỉ tạo khi booking chuyển CONFIRMED. Unique constraint trên booking_seat_id ngăn duplicate.

### Race: 2 webhook cùng lúc
- `FOR UPDATE` trên payments → webhook thứ 2 chờ → khi được release, payment đã PAID → skip.

---

## Transaction 5: Staff Check-in Ticket

### Transaction Steps

```sql
BEGIN;

-- 1. Lookup ticket
SELECT t.*, b.showtime_id, s.start_time
FROM tickets t
JOIN bookings b ON t.booking_id = b.id
JOIN showtimes s ON b.showtime_id = s.id
WHERE t.id = $ticket_id
FOR UPDATE;

-- 2. Validate: ticket status = ACTIVE
-- Nếu CHECKED_IN → 200 idempotent hoặc 400
-- Nếu CANCELLED → 400

-- 3. Validate: showtime thời gian hợp lý (±2 giờ)

-- 4. Update ticket
UPDATE tickets
SET status = 'CHECKED_IN', checked_in_at = NOW(), checked_in_by = $staff_id
WHERE id = $ticket_id;

-- 5. Audit log
INSERT INTO audit_logs (action, resource_type, resource_id, actor_id, ...)
VALUES ('CHECK_IN_TICKET', 'ticket', $ticket_id, $staff_id, ...);

COMMIT;
```

### Evidence Required
- Curl check-in → verify ticket status.
- Double check-in test → verify idempotent/reject.
