# 1. Database Overview

---

## 1.1. Database Purpose

Không có PostgreSQL **single source of truth toàn hệ thống**. Mỗi service có database/schema/credential riêng; PostgreSQL là source of truth **trong boundary của service đó**:

- **`booking_db`:** Booking, payment, ticket, showtime-seat snapshot — ACID/local consistency chống bán trùng ghế.
- **`catalog_db`:** Movies, cinemas, screens, showtimes, catalog audit và embedding documents — read-heavy, cần index tốt.
- **`identity_db`:** Users, roles, refresh sessions/credentials.
- **Outbox/inbox:** thuộc database của producer/consumer; event đồng bộ giữa service theo at-least-once semantics.

---

## 1.2. Database Engine

| Thuộc tính | Giá trị |
|---|---|
| Engine | PostgreSQL 16+ |
| Extension | `pgvector` chỉ bắt buộc cho `catalog_db` nếu semantic search stretch được triển khai; UUID dùng `gen_random_uuid()` |
| Character set | UTF-8 |
| Timezone | UTC (tất cả timestamp lưu UTC, application convert khi cần) |
| Connection pool | Mỗi service có pool budget riêng; tổng pool không vượt khả năng Postgres/Compose dev |

---

## 1.3. Main Business Flows Supported

| Flow | Tables chính | Transaction required |
|------|-------------|:---:|
| Guest duyệt phim/rạp/suất chiếu | Catalog Service → `catalog_db` | Không |
| Customer đăng ký/đăng nhập | Identity Service → `identity_db` | Có (register) |
| Customer giữ ghế | Booking Service → `booking_db` showtime-seat snapshot, seat_holds | **Có (critical)** |
| Customer tạo booking | Booking Service → `booking_db` | **Có (critical)** |
| Payment confirmation (webhook) | Booking Service local transaction + outbox | **Có (critical)** |
| Staff check-in vé | tickets | Có |
| Admin CRUD phim/rạp/suất chiếu | Catalog Service → `catalog_db`; publish event after commit | Có (showtime publish) |
| AI semantic search | Catalog Service → `catalog_db` | Không |
| Admin AI content workflow | Catalog Service → `catalog_db` | Có (apply) |
| Background expiry/payment job | Worker invokes Booking local transaction/event consumer | **Có (critical)** |

---

## 1.4. Design Principles

### P1: Database là tuyến phòng thủ cuối cùng

Application code có thể có bug. Database constraints **không bao giờ** cho phép dữ liệu vi phạm business rules:

- Unique constraint chống duplicate booking seats.
- Foreign key chống orphan records.
- Check constraint chống invalid status transitions.
- NOT NULL chống missing required data.

Constraint chỉ bảo vệ data trong owner database. Nó không thay thế event contract, inbox/idempotency hoặc authorization boundary giữa service.

### P2: Migration-first

Mọi thay đổi schema phải thông qua migration file. `synchronize: true` chỉ dùng cho prototyping giai đoạn rất đầu.

Mỗi migration có owner service; không tạo migration “toàn hệ thống”. Thay đổi event/schema phải additive-first và có compatibility plan khi producer/consumer deploy lệch phiên bản.

### P3: Explicit over implicit

- Không dùng soft delete (trừ khi có lý do rõ ràng). Dùng status field thay vì `deleted_at`.
- Không dùng auto-increment ID. Dùng UUID v4 cho primary key.
- Không dùng database triggers cho business logic. Logic nằm trong application.

### P4: Index có chủ đích

Mỗi index phải giải thích được: "Index này tối ưu cho query nào?" Không tạo index thừa.

### P5: Audit by design

Mọi hành động quan trọng ghi audit log. Audit log là append-only, không bao giờ UPDATE hoặc DELETE.

---

## 1.5. Naming Convention

| Đối tượng | Convention | Ví dụ |
|---|---|---|
| Table name | snake_case, số nhiều | `movies`, `showtime_seats`, `booking_seats` |
| Column name | snake_case | `created_at`, `movie_id`, `ticket_code` |
| Primary key | `id` (UUID) | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Foreign key column | `{referenced_table_singular}_id` | `movie_id`, `user_id`, `showtime_id` |
| Foreign key constraint | `fk_{table}_{referenced_table}` | `fk_showtimes_movies` |
| Unique constraint | `uq_{table}_{columns}` | `uq_users_email` |
| Check constraint | `chk_{table}_{description}` | `chk_payments_amount_positive` |
| Index | `idx_{table}_{columns}` | `idx_showtimes_movie_id_start_time` |
| Enum/status values | UPPER_SNAKE_CASE | `NOW_SHOWING`, `PENDING_PAYMENT`, `CHECKED_IN` |
| Boolean columns | `is_` hoặc `has_` prefix | `is_active`, `has_trailer` |
| Timestamp columns | `_at` suffix | `created_at`, `updated_at`, `expired_at`, `checked_in_at` |

---

## 1.6. UUID Strategy

- **Tất cả primary key dùng UUID v4** thay vì auto-increment integer.
- Lý do:
  - Không expose sequential IDs (security: không đoán được ID tiếp theo).
  - Merge-friendly nếu sau này cần sharding.
  - Generate ở application layer không cần DB round-trip.
- Implementation: `DEFAULT gen_random_uuid()` (PostgreSQL built-in, không cần extension).

---

## 1.7. Timestamp Convention

- **Tất cả timestamp lưu bằng `TIMESTAMP WITH TIME ZONE` (TIMESTAMPTZ).**
- **Tất cả giá trị lưu ở UTC.**
- Application layer chuyển đổi timezone khi trả response nếu cần.
- Mọi bảng đều có `created_at` và `updated_at`.
- `updated_at` tự động cập nhật qua application code (TypeORM `@UpdateDateColumn`).

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## 1.8. Soft Delete Strategy

**Không dùng soft delete** (`deleted_at`) trong dự án này.

Lý do:
- Tăng complexity cho mọi query (phải thêm `WHERE deleted_at IS NULL`).
- Dễ quên filter → data leak.
- Các entity quan trọng (booking, payment, ticket) dùng **status field** thay vì xóa.

Ngoại lệ duy nhất: Nếu sau này cần "ẩn phim" → dùng `movies.status = 'ARCHIVED'` thay vì soft delete.

---

## 1.9. Audit Strategy

Hai tầng audit:

| Tầng | Bảng | Mục đích | Trigger |
|------|------|----------|---------|
| **Application audit** | `audit_logs` | Ghi ai làm gì, lúc nào, trên resource nào | Application code (interceptor/service) |
| **Integration audit** | `integration_logs` | Ghi request/response gọi third-party | Application code (service wrapper) |

- Audit logs là **append-only**: chỉ INSERT, không UPDATE hoặc DELETE.
- Không dùng database triggers cho audit — logic nằm trong application.
- Lý do: Triggers khó test, khó debug, khó maintenance trong NestJS context.

---

## 1.10. Migration-First Strategy

### Nguyên tắc

1. **Mọi schema change phải có migration file.**
2. **Migration file phải chạy được từ clean (empty) database.**
3. **Migration file là immutable** — không sửa migration đã chạy trên shared environment.
4. **`synchronize: true` chỉ dùng khi prototyping** — tắt ngay khi bắt đầu viết migration.

### Workflow

```
Design schema change
→ Tạo migration file (TypeORM CLI hoặc manual SQL)
→ Test migration trên clean DB
→ Test migration trên DB có data
→ Commit migration file
→ CI chạy migration verify
→ Deploy
```

### Naming convention

```
{timestamp}-{description}.ts

Ví dụ:
1720000001-create-users-table.ts
1720000002-create-movies-table.ts
1720000003-add-status-to-showtimes.ts
```

### Rollback consideration

- Migration có `up()` và `down()`.
- `down()` phải reverse được `up()` (drop table, remove column...).
- **Lưu ý:** `down()` không phải lúc nào cũng an toàn (ví dụ: drop column có data). Cần review kỹ.
