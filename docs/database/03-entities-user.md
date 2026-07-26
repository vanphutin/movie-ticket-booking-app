# 3. Entity Detail — User & Access Control

---

## Entity: `users`

### Purpose
Lưu thông tin tài khoản người dùng. Một user có thể là Customer, Staff hoặc Admin tùy theo role.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | `550e8400-e29b-41d4-a716-446655440000` |
| `email` | VARCHAR(255) | No | Email đăng nhập, unique | `customer@example.com` |
| `password_hash` | VARCHAR(255) | No | Bcrypt hash, KHÔNG BAO GIỜ lưu plaintext | `$2b$10$...` |
| `full_name` | VARCHAR(255) | No | Họ tên hiển thị | `Nguyễn Văn A` |
| `role_id` | UUID | No | FK → roles | — |
| `is_active` | BOOLEAN | No | Account active/disabled | `true` |
| `created_at` | TIMESTAMPTZ | No | Thời điểm tạo | — |
| `updated_at` | TIMESTAMPTZ | No | Thời điểm cập nhật cuối | — |

### Primary Key
`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`

### Foreign Keys
- `role_id → roles(id)` ON DELETE RESTRICT

### Constraints
- `uq_users_email` — UNIQUE(email). Chống đăng ký trùng email.
- `chk_users_email_format` — CHECK(email ~* '^[^@]+@[^@]+\.[^@]+$'). Validate email format ở DB level (bổ sung cho app validation).
- NOT NULL trên email, password_hash, full_name, role_id.

### Indexes
- `idx_users_email` — UNIQUE INDEX trên email. Query: login lookup.
- `idx_users_role_id` — INDEX trên role_id. Query: admin list users by role.

### Relationships
- **Many-to-One:** users → roles (mỗi user có 1 role).
- **One-to-Many:** users → refresh_tokens, seat_holds, bookings.

### Business Rules
- Email phải lowercase, trim whitespace trước khi lưu.
- Password hash bằng bcrypt (salt rounds ≥ 10).
- Không bao giờ trả `password_hash` trong API response.
- User mới mặc định `is_active = true`.

### Common Queries
```sql
-- Login lookup
SELECT id, email, password_hash, role_id, is_active
FROM users WHERE email = $1;

-- List users by role (admin)
SELECT u.*, r.name as role_name
FROM users u JOIN roles r ON u.role_id = r.id
WHERE r.name = $1
ORDER BY u.created_at DESC
LIMIT $2 OFFSET $3;
```

### Design Notes
- **Không dùng username** — email là identifier duy nhất. Đơn giản cho MVP.
- **Không dùng soft delete** — dùng `is_active = false` để disable account.
- **Không lưu avatar** — out of scope cho MVP.
- **Lỗi cần tránh:** Quên unique constraint trên email → race condition khi 2 request register cùng email đồng thời.

---

## Entity: `roles`

### Purpose
Định nghĩa vai trò trong hệ thống. Dùng cho RBAC guard.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `name` | VARCHAR(50) | No | Tên role, unique | `CUSTOMER`, `STAFF`, `ADMIN` |
| `description` | VARCHAR(255) | Yes | Mô tả | `Khách hàng đặt vé` |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Constraints
- `uq_roles_name` — UNIQUE(name). Chống tạo role trùng tên.
- `chk_roles_name_valid` — CHECK(name IN ('CUSTOMER', 'STAFF', 'ADMIN')). Chỉ cho phép 3 roles.

### Indexes
- `idx_roles_name` — UNIQUE INDEX trên name. Query: lookup role by name.

### Business Rules
- Hệ thống có đúng 3 roles: CUSTOMER, STAFF, ADMIN.
- Roles được seed khi init database, không tạo qua API.
- Không xóa role khi còn user đang sử dụng (FK RESTRICT).

### Design Notes
- **MVP đơn giản:** Không cần bảng `permissions` riêng. RBAC guard check role name trực tiếp.
- **Nếu mở rộng sau:** Thêm bảng `role_permissions` → `permissions` cho fine-grained access control.
- **Lỗi cần tránh:** Quên seed roles → application crash khi register user.

---

## Entity: `refresh_tokens`

### Purpose
Lưu trữ refresh token hash để hỗ trợ token rotation, revoke khi logout, và phát hiện token reuse attack.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `user_id` | UUID | No | FK → users | — |
| `token_hash` | VARCHAR(255) | No | SHA-256 hash của refresh token | — |
| `is_revoked` | BOOLEAN | No | Đã bị revoke chưa | `false` |
| `expires_at` | TIMESTAMPTZ | No | Thời điểm hết hạn | — |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `replaced_by_id` | UUID | Yes | FK → refresh_tokens(id). Token mới thay thế | — |

### Foreign Keys
- `user_id → users(id)` ON DELETE CASCADE
- `replaced_by_id → refresh_tokens(id)` ON DELETE SET NULL

### Constraints
- NOT NULL trên user_id, token_hash, is_revoked, expires_at.

### Indexes
- `idx_refresh_tokens_user_id` — INDEX trên user_id. Query: revoke all tokens khi detect reuse.
- `idx_refresh_tokens_token_hash` — INDEX trên token_hash. Query: lookup token khi refresh.

### Business Rules
- **Token rotation:** Khi refresh, token cũ bị revoke, tạo token mới. Token cũ lưu `replaced_by_id`.
- **Reuse detection:** Nếu token đã revoke được sử dụng lại → revoke TẤT CẢ tokens của user (bị đánh cắp).
- **Logout:** Set `is_revoked = true`.
- **Cleanup:** Tokens expired có thể cleanup bằng scheduled job (not critical cho MVP).

### Common Queries
```sql
-- Lookup token for refresh
SELECT * FROM refresh_tokens
WHERE token_hash = $1 AND is_revoked = false AND expires_at > NOW();

-- Revoke all tokens for user (reuse detection)
UPDATE refresh_tokens SET is_revoked = true
WHERE user_id = $1 AND is_revoked = false;

-- Revoke specific token (logout)
UPDATE refresh_tokens SET is_revoked = true WHERE id = $1;
```

### Design Notes
- **Lưu hash, không lưu token gốc** — nếu DB bị leak, attacker không dùng được refresh token.
- **`replaced_by_id`** cho phép trace token chain, phát hiện reuse.
- **Lỗi cần tránh:** Lưu plaintext refresh token → nếu DB leak, attacker có thể impersonate user.
