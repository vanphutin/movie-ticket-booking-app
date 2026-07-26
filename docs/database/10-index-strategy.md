# 10. Index Strategy

---

## Bảng Index toàn hệ thống

| Table | Index Name | Columns | Type | Reason / Query Pattern | Priority |
|-------|-----------|---------|:----:|------------------------|:--------:|
| `users` | `idx_users_email` | email | UNIQUE | Login lookup: `WHERE email = ?` | Must |
| `users` | `idx_users_role_id` | role_id | B-tree | Admin list users by role | Should |
| `roles` | `idx_roles_name` | name | UNIQUE | Lookup role by name | Must |
| `refresh_tokens` | `idx_rt_token_hash` | token_hash | B-tree | Refresh token lookup | Must |
| `refresh_tokens` | `idx_rt_user_id` | user_id | B-tree | Revoke all tokens for user | Must |
| `movies` | `idx_movies_status` | status | B-tree | Public listing filter | Must |
| `movies` | `idx_movies_genre` | genre | B-tree | Public listing filter | Must |
| `movies` | `idx_movies_status_genre` | status, genre | Composite | Combined filter | Should |
| `movies` | `idx_movies_release_date` | release_date | B-tree | Sort by release date | Should |
| `showtimes` | `idx_st_movie_id` | movie_id | B-tree | Suất chiếu theo phim | Must |
| `showtimes` | `idx_st_screen_id` | screen_id | B-tree | Suất chiếu theo phòng | Must |
| `showtimes` | `idx_st_start_time` | start_time | B-tree | Filter theo ngày/giờ | Must |
| `showtimes` | `idx_st_movie_start` | movie_id, start_time | Composite | Query phổ biến nhất | Must |
| `showtime_seats` | `idx_ss_showtime_id` | showtime_id | B-tree | Seat map: tất cả ghế cho suất chiếu | Must |
| `showtime_seats` | `idx_ss_showtime_status` | showtime_id, status | Composite | Filter ghế theo trạng thái | Must |
| `showtime_seats` | `idx_ss_held_by` | held_by_user_id | Partial (WHERE NOT NULL) | Tìm ghế user đang hold | Should |
| `seat_holds` | `idx_sh_user_showtime` | user_id, showtime_id | Composite | Check active hold | Must |
| `seat_holds` | `idx_sh_expires` | expires_at | Partial (WHERE status='ACTIVE') | Job expire tìm hold hết hạn | Must |
| `bookings` | `idx_bk_user_id` | user_id | B-tree | Customer booking history | Must |
| `bookings` | `idx_bk_showtime_id` | showtime_id | B-tree | Bookings theo suất chiếu | Must |
| `bookings` | `idx_bk_expires` | expires_at | Partial (WHERE status='PENDING_PAYMENT') | Job expire booking | Must |
| `payments` | `idx_pm_booking_id` | booking_id | UNIQUE | Lookup payment theo booking | Must |
| `payments` | `idx_pm_order_code` | order_code | UNIQUE | Webhook lookup | Must |
| `payments` | `idx_pm_link_id` | payment_link_id | B-tree | Webhook lookup bổ sung | Should |
| `tickets` | `idx_tk_ticket_code` | ticket_code | UNIQUE | Staff tra cứu vé | Must |
| `tickets` | `idx_tk_booking_id` | booking_id | B-tree | Customer xem vé theo booking | Must |
| `audit_logs` | `idx_al_created_at` | created_at | B-tree | Query log theo thời gian | Must |
| `audit_logs` | `idx_al_actor_id` | actor_id | B-tree | Filter log theo actor | Should |
| `audit_logs` | `idx_al_resource` | resource_type, resource_id | Composite | Filter log theo resource | Should |
| `integration_logs` | `idx_il_created_at` | created_at | B-tree | Query log theo thời gian | Must |
| `integration_logs` | `idx_il_provider` | provider | B-tree | Filter theo provider | Should |
| `embedding_docs` | `idx_ed_movie_id` | movie_id | B-tree | Lookup embedding cho phim | Must |
| `embedding_docs` | `idx_ed_status` | status | B-tree | Tìm docs cần process | Must |
| `embedding_docs` | `idx_ed_vector` | embedding (HNSW) | Vector (cosine) | Semantic search similarity | Could* |
| `ai_request_logs` | `idx_arl_created_at` | created_at | B-tree | Query log theo thời gian | Must |
| `seats` | `idx_seats_screen_id` | screen_id | B-tree | Ghế theo phòng chiếu | Must |
| `screens` | `idx_screens_cinema_id` | cinema_id | B-tree | Phòng chiếu theo rạp | Must |

> *Vector HNSW index: `Could` cho MVP (data nhỏ dùng exact search). Nâng lên `Must` khi data > 500 phim.

---

## Index Design Rules

1. **Mỗi index phải có query justification.** Không tạo index "phòng hờ".
2. **Composite index:** Column có selectivity cao đặt trước. Ví dụ: `(movie_id, start_time)` tốt hơn `(start_time, movie_id)` vì movie_id lọc nhiều hơn.
3. **Partial index** cho status columns: `WHERE status = 'ACTIVE'` — chỉ index rows cần query, tiết kiệm storage.
4. **UNIQUE index tự động tạo B-tree index** — không cần tạo thêm index riêng cho unique columns.
5. **Foreign key KHÔNG tự động tạo index trong PostgreSQL** — phải tạo index riêng cho FK columns nếu cần query.
