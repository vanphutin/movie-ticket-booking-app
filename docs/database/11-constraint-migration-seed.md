# 11. Constraint Strategy

---

## Bảng Constraint toàn hệ thống

| Table | Constraint | Type | Purpose | Business Rule Protected | Error Prevented |
|-------|-----------|:----:|---------|------------------------|----------------|
| `users` | `uq_users_email` | UNIQUE | Không trùng email | Mỗi email 1 account | Duplicate registration |
| `roles` | `uq_roles_name` | UNIQUE | Không trùng role | Roles rõ ràng | Duplicate role creation |
| `roles` | `chk_roles_name_valid` | CHECK | Chỉ 3 roles hợp lệ | RBAC chuẩn | Invalid role |
| `seats` | `uq_seats_screen_row_number` | UNIQUE(screen_id, row, number) | Không trùng ghế | 1 ghế 1 vị trí | 2 ghế A1 cùng phòng |
| `showtime_seats` | `uq_ss_showtime_seat` | UNIQUE(showtime_id, seat_id) | Không trùng snapshot | 1 ghế 1 record/suất chiếu | Duplicate snapshot |
| `showtime_seats` | `chk_ss_status` | CHECK | Status hợp lệ | State machine | Invalid status |
| `showtime_seats` | `chk_ss_price` | CHECK(price > 0) | Giá dương | Business logic | Giá 0 hoặc âm |
| `bookings` | `chk_bk_status` | CHECK | Status hợp lệ | State machine | Invalid status |
| `bookings` | `chk_bk_amount` | CHECK(total_amount > 0) | Tổng tiền dương | Business logic | Booking 0 đồng |
| `booking_seats` | `uq_bs_booking_showtime_seat` | UNIQUE(booking_id, showtime_seat_id) | Không trùng ghế/booking | 1 ghế chỉ book 1 lần | Ghế appear 2 lần trong booking |
| `booking_seats` | `uq_bs_showtime_seat_global`* | UNIQUE(showtime_seat_id) | **Chống double booking** | 1 ghế chỉ thuộc 1 booking | **2 booking cùng ghế** |
| `payments` | `uq_pm_booking_id` | UNIQUE | 1 booking 1 payment | Business flow | Tạo 2 payment cho 1 booking |
| `payments` | `uq_pm_order_code` | UNIQUE | orderCode unique | payOS requirement | payOS conflict |
| `payments` | `chk_pm_status` | CHECK | Status hợp lệ | State machine | Invalid status |
| `payments` | `chk_pm_amount` | CHECK(amount > 0) | Amount dương | Business logic | Amount âm gửi payOS |
| `tickets` | `uq_tk_ticket_code` | UNIQUE | Không trùng mã vé | Mỗi vé 1 code | 2 vé cùng code → check-in sai |
| `tickets` | `uq_tk_booking_seat` | UNIQUE(booking_seat_id) | Không trùng vé/ghế | 1 ghế 1 vé | Webhook replay tạo duplicate ticket |
| `tickets` | `chk_tk_status` | CHECK | Status hợp lệ | State machine | Invalid status |
| `cinemas` | `uq_cinemas_name_city` | UNIQUE(name, city) | Không trùng rạp | 1 tên 1 thành phố | Duplicate rạp |
| `screens` | `uq_screens_cinema_name` | UNIQUE(cinema_id, name) | Không trùng phòng/rạp | 1 tên 1 rạp | Duplicate phòng |
| `movies` | `chk_movies_status` | CHECK | Status hợp lệ | Business flow | Invalid movie status |
| `movies` | `chk_movies_duration` | CHECK(duration > 0) | Duration dương | Data quality | Phim 0 phút |
| `showtimes` | `chk_st_time` | CHECK(end_time > start_time) | Thời gian hợp lệ | Business logic | Suất chiếu end trước start |
| `showtimes` | `chk_st_price` | CHECK(base_price > 0) | Giá dương | Business logic | Giá 0 hoặc âm |
| `seat_holds` | `chk_sh_status` | CHECK | Status hợp lệ | State machine | Invalid status |
| `movie_trailers` | `uq_mt_movie_id` | UNIQUE(movie_id) | 1 phim 1 trailer | Business decision | Multiple trailers |

> *`uq_bs_showtime_seat_global`: Đây là **tuyến phòng thủ cuối cùng** chống double booking ở database level. Kể cả khi application code có bug bỏ qua locking, constraint này sẽ ngăn 2 booking cùng ghế.

---

## Constraint Design Rules

1. **Constraint là bảo hiểm, không phải logic chính.** Application code phải validate trước. Constraint là fallback khi code có bug.
2. **CHECK constraint cho status/enum:** Đảm bảo chỉ giá trị hợp lệ được lưu, kể cả khi code gửi sai.
3. **UNIQUE constraint cho business uniqueness:** Email, ticket code, order code — DB level guarantee.
4. **Foreign key cho referential integrity:** Không orphan records.
5. **NOT NULL cho required fields:** Đừng để field quan trọng thiếu data.

---

# 12. Migration & Seed Strategy

---

## 12.1. Migration Strategy

### Không dùng `synchronize: true`

```typescript
// ❌ KHÔNG BAO GIỜ trong production/staging
TypeOrmModule.forRoot({
  synchronize: true,  // ← XÓA DÒNG NÀY
});

// ✅ Chỉ dùng migration
TypeOrmModule.forRoot({
  synchronize: false,
  migrationsRun: true,  // hoặc chạy manual
});
```

### Migration Workflow

```
1. Thiết kế schema change → review
2. Generate migration: npx typeorm migration:generate -n DescriptiveName
   hoặc viết manual: npx typeorm migration:create -n DescriptiveName
3. Review migration file
4. Test trên clean DB: drop DB → run all migrations
5. Test trên DB có data: run new migration
6. Commit migration file
7. CI: clean DB → run all migrations → seed → test
```

### Naming Convention

```
{timestamp}-{description}.ts

Ví dụ:
identity/001-CreateUsersRolesAndRefreshSessions.ts        # tuần 4
catalog/001-CreateMoviesAndTrailers.ts                    # tuần 5
catalog/002-CreateCinemasScreensSeatsAndShowtimes.ts      # tuần 6
catalog/003-CreateCatalogOutbox.ts                        # tuần 6
booking/001-CreateSnapshotsHoldsBookingsInboxOutbox.ts   # tuần 7
booking/002-CreatePaymentsWebhooksAndTickets.ts           # tuần 8
booking/003-AddMeasuredOperationalIndexes.ts              # tuần 9, chỉ khi có EXPLAIN
```

### Migration Review Checklist

- [ ] Migration file có cả `up()` và `down()`.
- [ ] `up()` chạy từ clean DB không lỗi.
- [ ] `down()` reverse được `up()` (nếu safe).
- [ ] Foreign key references đúng bảng/column.
- [ ] Unique constraints đúng.
- [ ] Check constraints đúng.
- [ ] Indexes đã tạo.
- [ ] NOT NULL đúng (field required phải NOT NULL).
- [ ] Default values hợp lý.
- [ ] Không drop column có data quan trọng mà không migrate data trước.
- [ ] Migration chỉ thuộc một service owner và không tạo cross-service foreign key.
- [ ] Chạy được cả clean DB và upgrade từ schema tuần trước.
- [ ] Không tạo trước table/capability của tuần sau.

---

## 12.2. Seed Strategy

### Nguyên tắc

1. **Seed phải idempotent** — chạy lại không lỗi, không tạo duplicate.
2. **Seed không chứa secret thật** — dùng password demo, API key demo.
3. **Seed tạo đủ data cho full demo flow.**

### Dữ liệu tối thiểu

| Entity | Số lượng | Chi tiết |
|--------|:--------:|---------|
| Roles | 3 | CUSTOMER, STAFF, ADMIN |
| Users | 3-5 | 1 admin, 1 staff, 2-3 customers |
| Movies | 5-10 | Đủ genres, cả NOW_SHOWING và COMING_SOON |
| Movie Trailers | 3-5 | Một số phim có trailer PUBLISHED |
| Cinemas | 2 | 2 rạp khác thành phố |
| Screens | 3-4 | 2-3 phòng/rạp |
| Seats | 20-50/screen | Layout A1-E10 (5 hàng × 10 ghế = 50) |
| Showtimes | 5-8 | Nhiều phim, nhiều phòng, nhiều ngày |
| Showtime Seats | Auto | Snapshot từ seats khi tạo showtime |

### Demo Accounts

```
Admin:    admin@demo.com     / Demo@123456   / role: ADMIN
Staff:    staff@demo.com     / Demo@123456   / role: STAFF
Customer: customer@demo.com  / Demo@123456   / role: CUSTOMER
Customer: customer2@demo.com / Demo@123456   / role: CUSTOMER
```

> **QUAN TRỌNG:** Password demo dùng bcrypt hash. KHÔNG commit plaintext password. Seed file ghi hash trực tiếp.

### Idempotent Seed Pattern

```typescript
// ✅ Idempotent: check before insert
const existingRole = await roleRepo.findOne({ where: { name: 'ADMIN' } });
if (!existingRole) {
  await roleRepo.save({ name: 'ADMIN', description: 'System administrator' });
}

// ✅ Hoặc dùng upsert
await roleRepo.upsert(
  { name: 'ADMIN', description: 'System administrator' },
  { conflictPaths: ['name'] }
);
```

### Evidence Seed Run
- Seed output log (không lỗi).
- DB query verify: `SELECT COUNT(*) FROM movies` = expected count.
- Swagger test: GET /movies trả seed data.
