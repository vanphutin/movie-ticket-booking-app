# 4. Entity Detail — Catalog & Cinema

---

## Entity: `movies`

### Purpose
Lưu thông tin chi tiết phim — sản phẩm chính của hệ thống. Mọi luồng nghiệp vụ đều bắt đầu từ phim.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `title` | VARCHAR(255) | No | Tên phim | `Avengers: Endgame` |
| `original_title` | VARCHAR(255) | Yes | Tên gốc (nếu phim ngoại) | `復仇者聯盟：終局之戰` |
| `synopsis` | TEXT | Yes | Tóm tắt nội dung | — |
| `short_description` | VARCHAR(500) | Yes | Mô tả ngắn (cho card hiển thị) | — |
| `genre` | VARCHAR(100) | No | Thể loại chính | `Action`, `Comedy` |
| `director` | VARCHAR(255) | Yes | Đạo diễn | `Anthony Russo` |
| `cast_members` | TEXT | Yes | Diễn viên chính (comma-separated hoặc JSON) | `Robert Downey Jr., Chris Evans` |
| `duration_minutes` | INTEGER | No | Thời lượng phim (phút) | `181` |
| `age_rating` | VARCHAR(10) | Yes | Giới hạn tuổi | `PG-13`, `R`, `P` |
| `poster_url` | VARCHAR(500) | Yes | URL poster | — |
| `release_date` | DATE | Yes | Ngày phát hành | `2026-07-15` |
| `status` | VARCHAR(20) | No | Trạng thái phim | `NOW_SHOWING` |
| `mood_tags` | VARCHAR(255) | Yes | Tags mood cho AI search | `light, entertaining, fun` |
| `language` | VARCHAR(50) | Yes | Ngôn ngữ phim | `Vietnamese`, `English` |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Constraints
- `chk_movies_status` — CHECK(status IN ('DRAFT', 'COMING_SOON', 'NOW_SHOWING', 'ENDED', 'ARCHIVED')).
- `chk_movies_duration` — CHECK(duration_minutes > 0 AND duration_minutes <= 600).
- NOT NULL trên title, genre, duration_minutes, status.

### Indexes
- `idx_movies_status` — INDEX(status). Filter phim theo trạng thái.
- `idx_movies_genre` — INDEX(genre). Filter phim theo thể loại.
- `idx_movies_release_date` — INDEX(release_date). Sort theo ngày phát hành.
- `idx_movies_status_genre` — Composite INDEX(status, genre). Query kết hợp.

### Common Queries
```sql
-- Public listing (filtered)
SELECT id, title, genre, status, poster_url, duration_minutes, age_rating, release_date
FROM movies
WHERE status IN ('NOW_SHOWING', 'COMING_SOON')
  AND ($1::VARCHAR IS NULL OR genre = $1)
ORDER BY release_date DESC
LIMIT $2 OFFSET $3;

-- Count for pagination
SELECT COUNT(*) FROM movies
WHERE status IN ('NOW_SHOWING', 'COMING_SOON')
  AND ($1::VARCHAR IS NULL OR genre = $1);
```

### Design Notes
- **genre dùng VARCHAR thay vì bảng riêng** — MVP đơn giản. Nếu cần multi-genre, tách bảng `movie_genres` (many-to-many).
- **cast_members dùng TEXT** — không cần query theo diễn viên trong MVP. Nếu cần, tách bảng `movie_cast`.
- **mood_tags dùng VARCHAR** — phục vụ embedding text profile. Không cần structured query.
- **Lỗi cần tránh:** Quên index trên status → full table scan khi listing phim.

---

## Entity: `movie_trailers`

### Purpose
Lưu trailer URL và metadata cho phim. Tách riêng để quản lý trạng thái publish/unpublish độc lập.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `movie_id` | UUID | No | FK → movies, unique (1 phim 1 trailer) | — |
| `url` | VARCHAR(500) | No | URL trailer (YouTube, Vimeo...) | `https://youtube.com/watch?v=...` |
| `description` | TEXT | Yes | Mô tả trailer | — |
| `status` | VARCHAR(20) | No | Trạng thái | `DRAFT`, `PUBLISHED`, `UNPUBLISHED` |
| `published_at` | TIMESTAMPTZ | Yes | Thời điểm publish | — |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Foreign Keys
- `movie_id → movies(id)` ON DELETE CASCADE

### Constraints
- `uq_movie_trailers_movie_id` — UNIQUE(movie_id). Mỗi phim chỉ có 1 trailer.
- `chk_movie_trailers_status` — CHECK(status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED')).

### Business Rules
- Guest chỉ xem trailer PUBLISHED.
- Publish khi chưa có URL → application phải reject (app-level validation).

---

## Entity: `cinemas`

### Purpose
Lưu thông tin rạp chiếu phim — đơn vị kinh doanh vật lý.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `name` | VARCHAR(255) | No | Tên rạp | `CGV Vincom Đồng Khởi` |
| `address` | VARCHAR(500) | No | Địa chỉ | `Tầng 3, Vincom Center, 72 Lê Thánh Tôn` |
| `city` | VARCHAR(100) | No | Thành phố | `Ho Chi Minh` |
| `phone` | VARCHAR(20) | Yes | Số điện thoại | `028-1234-5678` |
| `is_active` | BOOLEAN | No | Rạp đang hoạt động | `true` |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Constraints
- `uq_cinemas_name_city` — UNIQUE(name, city). Không trùng tên rạp trong cùng thành phố.
- NOT NULL trên name, address, city.

### Indexes
- `idx_cinemas_city` — INDEX(city). Filter rạp theo thành phố.

---

## Entity: `screens`

### Purpose
Phòng chiếu thuộc rạp. Mỗi screen có layout ghế cố định.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `cinema_id` | UUID | No | FK → cinemas | — |
| `name` | VARCHAR(100) | No | Tên phòng chiếu | `Screen 1`, `Phòng IMAX` |
| `capacity` | INTEGER | No | Sức chứa (tính sau từ seats count) | `120` |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Foreign Keys
- `cinema_id → cinemas(id)` ON DELETE CASCADE

### Constraints
- `uq_screens_cinema_id_name` — UNIQUE(cinema_id, name). Không trùng tên phòng trong cùng rạp.
- `chk_screens_capacity` — CHECK(capacity > 0).

### Indexes
- `idx_screens_cinema_id` — INDEX(cinema_id). Query phòng chiếu theo rạp.

---

## Entity: `seats`

### Purpose
Ghế vật lý cố định trong phòng chiếu. Là **master data** — không thay đổi trừ khi Admin đổi layout.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `screen_id` | UUID | No | FK → screens | — |
| `row` | VARCHAR(5) | No | Hàng ghế | `A`, `B`, `C` |
| `number` | INTEGER | No | Số ghế trong hàng | `1`, `2`, `15` |
| `seat_type` | VARCHAR(20) | No | Loại ghế | `STANDARD` |
| `created_at` | TIMESTAMPTZ | No | — | — |

### Foreign Keys
- `screen_id → screens(id)` ON DELETE CASCADE

### Constraints
- `uq_seats_screen_row_number` — **UNIQUE(screen_id, row, number)**. Không trùng ghế trong cùng phòng.
- `chk_seats_type` — CHECK(seat_type IN ('STANDARD', 'VIP', 'COUPLE')). MVP chỉ dùng STANDARD.
- `chk_seats_number` — CHECK(number > 0).

### Indexes
- `idx_seats_screen_id` — INDEX(screen_id). Query ghế theo phòng chiếu.

### Design Notes
- **Seats là master data, showtime_seats là snapshot.** Khi tạo showtime, seats được copy sang showtime_seats.
- **Lỗi cần tránh:** Quên unique constraint (screen_id, row, number) → có thể tạo 2 ghế A1 trong cùng phòng.
