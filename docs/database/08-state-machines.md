# 8. State Machines

---

## 8.1. Showtime Seat Status

Bảng: `showtime_seats.status`

### States

| State | Meaning | Ai/gì có thể trigger |
|-------|---------|----------------------|
| `AVAILABLE` | Ghế trống, có thể hold | System (initial), expire job, cancel hold |
| `HELD` | Đang được customer giữ tạm thời | Customer (POST seat-holds) |
| `SOLD` | Đã bán, vé đã phát hành | System (payment confirmed) |
| `BLOCKED` | Admin block ghế (hỏng, bảo trì) | Admin |

### Transitions hợp lệ

```
AVAILABLE → HELD       [Customer hold ghế]
AVAILABLE → BLOCKED    [Admin block ghế]
HELD → AVAILABLE       [Hold expire / customer hủy hold]
HELD → SOLD            [Payment confirmed]
BLOCKED → AVAILABLE    [Admin unblock ghế]
```

### Transitions KHÔNG hợp lệ

```
AVAILABLE → SOLD       ✗ Phải qua HELD trước
SOLD → AVAILABLE       ✗ Ghế đã bán không refund ở seat level
SOLD → HELD            ✗ Không revert
HELD → BLOCKED         ✗ Không block ghế đang hold
BLOCKED → SOLD         ✗ Không bán ghế bị block
BLOCKED → HELD         ✗ Không hold ghế bị block
```

### Test cases bắt buộc

- [ ] Hold ghế AVAILABLE → status = HELD ✓
- [ ] Hold ghế HELD (bởi người khác) → 409 Conflict ✓
- [ ] Hold ghế SOLD → 409 Conflict ✓
- [ ] Hold ghế BLOCKED → 409 Conflict ✓
- [ ] Expire hold → status = AVAILABLE ✓
- [ ] Payment confirm → status = SOLD ✓
- [ ] Concurrent hold cùng ghế → chỉ 1 thành công ✓

---

## 8.2. Seat Hold Status

Bảng: `seat_holds.status`

### States

| State | Meaning |
|-------|---------|
| `ACTIVE` | Hold đang hiệu lực, chưa hết hạn |
| `EXPIRED` | Đã hết thời hạn 5 phút, ghế đã release |
| `CANCELLED` | Customer tự hủy hold |
| `CONVERTED_TO_BOOKING` | Hold đã chuyển thành booking |

### Transitions hợp lệ

```
ACTIVE → EXPIRED                [Timeout 5 phút, background job]
ACTIVE → CANCELLED              [Customer hủy]
ACTIVE → CONVERTED_TO_BOOKING   [Customer tạo booking thành công]
```

### Transitions KHÔNG hợp lệ

```
EXPIRED → ACTIVE                ✗ Không hồi sinh hold đã expire
EXPIRED → CONVERTED_TO_BOOKING  ✗ Không tạo booking từ hold expired
CANCELLED → ACTIVE              ✗ Không hồi sinh hold đã hủy
CONVERTED_TO_BOOKING → *        ✗ Terminal state, không chuyển tiếp
```

### Test cases bắt buộc

- [ ] Hold active → tạo booking → status = CONVERTED_TO_BOOKING ✓
- [ ] Hold active → expire → status = EXPIRED ✓
- [ ] Hold expired → tạo booking → 400 Bad Request ✓
- [ ] Hold cancelled → tạo booking → 400 Bad Request ✓

---

## 8.3. Booking Status

Bảng: `bookings.status`

### States

| State | Meaning |
|-------|---------|
| `PENDING_PAYMENT` | Chờ thanh toán (có thời hạn 15 phút) |
| `CONFIRMED` | Thanh toán thành công, vé đã phát hành |
| `CANCELLED` | Customer hủy booking (chỉ khi PENDING) |
| `EXPIRED` | Hết thời hạn thanh toán 15 phút |

### Transitions hợp lệ

```
PENDING_PAYMENT → CONFIRMED    [Payment PAID, webhook confirm]
PENDING_PAYMENT → CANCELLED    [Customer hủy]
PENDING_PAYMENT → EXPIRED      [Timeout 15 phút, background job]
```

### Transitions KHÔNG hợp lệ

```
CONFIRMED → CANCELLED    ✗ MVP không refund booking đã confirm
CONFIRMED → EXPIRED      ✗ Booking đã confirm không expire
CANCELLED → *            ✗ Terminal state
EXPIRED → *              ✗ Terminal state
```

### Test cases bắt buộc

- [ ] Booking PENDING → payment PAID → status = CONFIRMED ✓
- [ ] Booking PENDING → 15 phút → status = EXPIRED, ghế release ✓
- [ ] Booking PENDING → customer cancel → status = CANCELLED, ghế release ✓
- [ ] Booking CONFIRMED → customer cancel → 400 ✓
- [ ] Booking EXPIRED → payment webhook → reject ✓

---

## 8.4. Payment Status

Bảng: `payments.status`

### States

| State | Meaning |
|-------|---------|
| `PENDING` | Payment link đã tạo, chờ customer thanh toán |
| `PAID` | payOS xác nhận thanh toán thành công |
| `FAILED` | Thanh toán thất bại |
| `CANCELLED` | Customer hủy thanh toán |
| `EXPIRED` | Hết hạn thanh toán (booking expire) |

### Transitions hợp lệ

```
PENDING → PAID        [payOS webhook: success]
PENDING → FAILED      [payOS webhook: failed]
PENDING → CANCELLED   [payOS webhook: cancelled]
PENDING → EXPIRED     [Booking expire job]
```

### Transitions KHÔNG hợp lệ

```
PAID → *        ✗ Terminal state (không refund trong MVP)
FAILED → PAID   ✗ Không retry payment đã fail
EXPIRED → PAID  ✗ Không accept payment cho booking expired
```

### Test cases bắt buộc

- [ ] Payment PENDING → webhook PAID → status = PAID, booking CONFIRMED ✓
- [ ] Payment PENDING → booking expire → status = EXPIRED ✓
- [ ] Payment PAID → webhook replay → skip (idempotent) ✓
- [ ] Payment EXPIRED → webhook PAID → reject ✓

---

## 8.5. Ticket Status

Bảng: `tickets.status`

### States

| State | Meaning |
|-------|---------|
| `ACTIVE` | Vé hợp lệ, chưa check-in |
| `CHECKED_IN` | Đã check-in tại rạp |
| `CANCELLED` | Vé bị hủy (booking cancel sau confirm, nếu có) |

### Transitions hợp lệ

```
ACTIVE → CHECKED_IN   [Staff check-in]
ACTIVE → CANCELLED    [Admin cancel nếu cần]
```

### Transitions KHÔNG hợp lệ

```
CHECKED_IN → ACTIVE      ✗ Không undo check-in
CHECKED_IN → CANCELLED   ✗ Không cancel vé đã check-in
CANCELLED → *            ✗ Terminal state
```

### Test cases bắt buộc

- [ ] Ticket ACTIVE → staff check-in → status = CHECKED_IN ✓
- [ ] Ticket CHECKED_IN → check-in lại → 400 (hoặc idempotent 200) ✓
- [ ] Ticket CANCELLED → check-in → 400 ✓

---

## 8.6. AI Content Draft Status

Bảng: `movie_ai_content_drafts.status`

### States

| State | Meaning |
|-------|---------|
| `DRAFT` | AI đã tạo, chờ Admin review |
| `APPLIED` | Admin duyệt, nội dung đã áp dụng vào phim |
| `REJECTED` | Admin từ chối bản nháp |

### Transitions hợp lệ

```
DRAFT → APPLIED     [Admin duyệt]
DRAFT → REJECTED    [Admin từ chối]
```

### Transitions KHÔNG hợp lệ

```
APPLIED → DRAFT      ✗ Không revert nội dung đã apply
APPLIED → REJECTED   ✗ Đã apply rồi
REJECTED → APPLIED   ✗ Phải tạo draft mới
REJECTED → DRAFT     ✗ Không revert
```

### Test cases bắt buộc

- [ ] Draft → Admin apply → status = APPLIED, movie content updated ✓
- [ ] Draft → Admin reject → status = REJECTED ✓
- [ ] Applied → apply lại → 400 ✓
- [ ] Không có path nào AI auto-apply mà không qua Admin ✓
