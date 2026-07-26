# 6. Entity Detail — Payment & Logs

---

## Entity: `payments`

### Purpose
Giao dịch thanh toán liên kết với payOS. Track payment lifecycle từ PENDING → PAID/FAILED/EXPIRED.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `booking_id` | UUID | No | FK → bookings, unique (1 booking 1 payment) | — |
| `amount` | INTEGER | No | Số tiền (VND, backend tính) | `170000` |
| `status` | VARCHAR(20) | No | Trạng thái payment | `PENDING` |
| `order_code` | BIGINT | No | Mã giao dịch gửi payOS, unique | `1720000001` |
| `payment_link_id` | VARCHAR(100) | Yes | ID payment link từ payOS response | — |
| `checkout_url` | VARCHAR(500) | Yes | URL thanh toán trả cho customer | — |
| `provider` | VARCHAR(50) | No | Payment provider | `PAYOS` |
| `paid_at` | TIMESTAMPTZ | Yes | Thời điểm thanh toán thành công | — |
| `expired_at` | TIMESTAMPTZ | Yes | Thời điểm hết hạn | — |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Constraints
- `uq_payments_booking_id` — **UNIQUE(booking_id)**. Mỗi booking chỉ có 1 payment.
- `uq_payments_order_code` — **UNIQUE(order_code)**. Mã giao dịch unique toàn hệ thống.
- `chk_payments_status` — CHECK(status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED')).
- `chk_payments_amount` — CHECK(amount > 0). Không cho phép amount ≤ 0.

### Indexes
- `idx_payments_booking_id` — UNIQUE INDEX. Lookup payment theo booking.
- `idx_payments_order_code` — UNIQUE INDEX. Webhook lookup theo orderCode.
- `idx_payments_payment_link_id` — INDEX. Webhook lookup theo paymentLinkId.
- `idx_payments_status` — INDEX. Filter payment theo trạng thái.

### Business Rules
- **Amount do backend tính** từ booking (SUM booking_seats.price). KHÔNG NHẬN từ client.
- **orderCode phải unique** — dùng strategy: timestamp + random hoặc sequence.
- **Đối soát webhook:** Khi nhận webhook, kiểm tra amount, orderCode, paymentLinkId tất cả phải khớp.
- **Idempotency:** Nếu payment đã PAID, webhook replay → skip.

### Common Queries
```sql
-- Webhook lookup
SELECT * FROM payments
WHERE order_code = $1 AND payment_link_id = $2
FOR UPDATE;  -- Lock khi processing webhook

-- Customer view payment
SELECT * FROM payments WHERE booking_id = $1;
```

### Design Notes
- **order_code dùng BIGINT** — payOS yêu cầu number type cho orderCode.
- **Lỗi cần tránh:** Quên unique constraint trên order_code → 2 payment cùng orderCode → payOS conflict.

---

## Entity: `audit_logs`

### Purpose
Ghi vết mọi hành động quan trọng trong hệ thống. Append-only, không bao giờ UPDATE hoặc DELETE.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `actor_id` | UUID | Yes | FK → users (null cho system actions) | — |
| `actor_role` | VARCHAR(50) | Yes | Role lúc thực hiện action | `ADMIN` |
| `action` | VARCHAR(100) | No | Hành động | `CREATE_MOVIE`, `HOLD_SEAT`, `CONFIRM_PAYMENT` |
| `resource_type` | VARCHAR(50) | No | Loại resource | `movie`, `booking`, `ticket` |
| `resource_id` | UUID | Yes | ID resource liên quan | — |
| `details` | JSONB | Yes | Chi tiết bổ sung | `{"seats": ["A1","A2"]}` |
| `ip_address` | VARCHAR(45) | Yes | IP address (IPv4/v6) | `192.168.1.1` |
| `request_id` | UUID | Yes | Correlation ID | — |
| `created_at` | TIMESTAMPTZ | No | Thời điểm action | — |

### Constraints
- NOT NULL trên action, resource_type.
- **Không có UPDATE/DELETE constraint** — table chỉ INSERT.

### Indexes
- `idx_audit_logs_actor_id` — INDEX. Filter log theo người thực hiện.
- `idx_audit_logs_resource` — INDEX(resource_type, resource_id). Filter log theo resource.
- `idx_audit_logs_created_at` — INDEX. Query log theo thời gian.
- `idx_audit_logs_action` — INDEX. Filter log theo loại action.

### Business Rules
- **Append-only:** Chỉ INSERT, không bao giờ UPDATE hoặc DELETE.
- **Không log sensitive data:** Không ghi password, token, card info vào details.
- **Audit log insert fail → KHÔNG block main operation.** Log error riêng.

### Design Notes
- **details dùng JSONB** — linh hoạt cho mỗi loại action, query bằng JSON operators.
- **actor_id nullable** — system actions (background jobs) không có actor.
- **Lỗi cần tránh:** Log password hoặc JWT token vào details.

---

## Entity: `integration_logs`

### Purpose
Ghi vết request/response cho mọi cuộc gọi tới third-party services (payOS, AI provider, embedding provider).

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `provider` | VARCHAR(50) | No | Service provider | `PAYOS`, `OPENAI`, `MOCK_AI` |
| `method` | VARCHAR(10) | No | HTTP method | `POST` |
| `url` | VARCHAR(500) | No | Request URL | `https://api-merchant.payos.vn/...` |
| `request_body` | TEXT | Yes | Request body (truncated ≤ 10KB) | — |
| `response_status` | INTEGER | Yes | HTTP response status | `200`, `500` |
| `response_body` | TEXT | Yes | Response body (truncated ≤ 10KB) | — |
| `latency_ms` | INTEGER | Yes | Response time (ms) | `350` |
| `error_message` | TEXT | Yes | Error nếu có | — |
| `request_id` | UUID | Yes | Correlation ID | — |
| `created_at` | TIMESTAMPTZ | No | — | — |

### Constraints
- NOT NULL trên provider, method, url.
- **Append-only.**

### Indexes
- `idx_integration_logs_provider` — INDEX. Filter log theo provider.
- `idx_integration_logs_created_at` — INDEX. Query theo thời gian.
- `idx_integration_logs_provider_status` — INDEX(provider, response_status). Tìm errors.

### Business Rules
- **Truncate body > 10KB** — tránh bảng phình to.
- **Mask secrets:** KHÔNG log API keys, checksumKey, JWT tokens trong request/response.
- **Append-only.**

### Design Notes
- **Lỗi cần tránh:** Log toàn bộ request body bao gồm API key header → security breach.
