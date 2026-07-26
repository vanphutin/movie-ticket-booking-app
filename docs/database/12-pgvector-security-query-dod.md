# 13. AI & pgvector Design

---

## 13.1. Tại sao cần Semantic Search

Traditional keyword search chỉ tìm được phim khi user biết chính xác tên hoặc thể loại. Semantic search cho phép:

| Query kiểu cũ (keyword) | Query kiểu mới (semantic) |
|---|---|
| `?genre=Action` | "phim hành động nhẹ nhàng cho date tối nay" |
| `?title=Avengers` | "phim siêu anh hùng giống Marvel nhưng ít bạo lực" |
| Không hỗ trợ | "phim gia đình cho cuối tuần có trẻ em" |

pgvector cho phép lưu vector embeddings trực tiếp trong PostgreSQL, kết hợp similarity search với SQL filters truyền thống — không cần service riêng (Elasticsearch, Pinecone...).

---

## 13.2. Embedding Lifecycle

```
Admin tạo/cập nhật movie
→ Application tạo text profile từ movie data
→ Hash content → so sánh với content_hash hiện tại
→ Nếu khác: tạo/update movie_embedding_documents (status = PENDING)
→ Enqueue BullMQ job: generate-movie-embedding
→ Worker:
   → Gọi embedding provider (Mock / OpenAI)
   → Nhận vector (1536 dimensions)
   → Lưu vector + status = READY + embedded_at
   → Nếu lỗi: status = FAILED + error_message
→ Semantic search chỉ query documents READY
```

---

## 13.3. Content Template

Text profile chuẩn bị cho embedding:

```
Title: [movies.title]
Original title: [movies.original_title]
Genres: [movies.genre]
Mood tags: [movies.mood_tags]
Age rating: [movies.age_rating]
Cast: [movies.cast_members]
Director: [movies.director]
Synopsis: [movies.synopsis]
Trailer description: [movie_trailers.description]
Language: [movies.language]
```

Quy tắc:
- Bỏ fields NULL/empty.
- Không gửi: user data, JWT, payment info, passwords.
- Hash nội dung bằng SHA-256 → lưu `content_hash`.
- Nếu hash không đổi khi phim update → skip rebuild (tiết kiệm chi phí).

---

## 13.4. Provider Abstraction

```
EmbeddingProvider (interface)
├── MockEmbeddingProvider    → Test/CI: trả fixed vector, zero cost
└── OpenAIEmbeddingProvider  → Demo/Production: gọi API thật
```

Chọn provider qua environment variable:
```
EMBEDDING_PROVIDER=mock    # Test, CI
EMBEDDING_PROVIDER=openai  # Demo, production
```

**Mock provider:** Trả vector cố định (ví dụ: vector toàn 0.1) → cho phép test flow end-to-end mà không tốn tiền, không phụ thuộc external service.

---

## 13.5. Semantic Search Query Flow

```sql
-- 1. Tạo query embedding từ user message
--    Application gọi embedding provider với user query text
--    Nhận query_vector

-- 2. Cosine similarity search
SELECT
    med.movie_id,
    m.title,
    m.genre,
    m.status,
    1 - (med.embedding <=> $query_vector::vector) AS similarity_score
FROM movie_embedding_documents med
JOIN movies m ON med.movie_id = m.id
WHERE med.status = 'READY'
  AND med.document_type = 'MOVIE_PROFILE'
  AND m.status IN ('NOW_SHOWING', 'COMING_SOON')
  -- Optional SQL filters:
  AND ($genre::VARCHAR IS NULL OR m.genre = $genre)
ORDER BY med.embedding <=> $query_vector::vector  -- ascending = most similar first
LIMIT $limit;

-- 3. Kết hợp với showtime availability (optional)
-- JOIN showtimes để filter phim có suất chiếu hôm nay, có ghế trống
```

### Operators pgvector

| Operator | Meaning | Dùng khi |
|----------|---------|----------|
| `<->` | L2 distance (Euclidean) | Ít dùng cho text |
| `<=>` | Cosine distance | **Dùng cho text embeddings** |
| `<#>` | Inner product (negative) | Khi vectors đã normalized |

**Dùng `<=>` (cosine distance)** cho text embeddings. Giá trị nhỏ = giống nhau nhiều. Score = `1 - distance`.

---

## 13.6. pgvector Setup trong Docker

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    # hoặc: ankane/pgvector:latest
    environment:
      POSTGRES_DB: movie_booking
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
```

Migration enable extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Lưu ý:** Phải dùng Docker image có pgvector pre-installed. PostgreSQL official image KHÔNG có pgvector.

---

# 14. Data Privacy & Security Rules

---

## 14.1. Bảng Rules

| # | Rule | Áp dụng cho | Hậu quả nếu vi phạm |
|--:|------|------------|---------------------|
| S-1 | **Không lưu plaintext password** | `users.password_hash` | Account takeover nếu DB leak |
| S-2 | **Refresh token phải hash** | `refresh_tokens.token_hash` | Token theft nếu DB leak |
| S-3 | **Không log JWT/password** | `audit_logs`, `integration_logs` | Credential exposure |
| S-4 | **Không log payment sensitive** | `integration_logs` | Card/account info leak |
| S-5 | **Customer chỉ đọc data mình** | bookings, tickets, payments | Data breach |
| S-6 | **Admin action cần audit log** | Mọi admin endpoint | Không truy vết được |
| S-7 | **Webhook verify signature** | `POST /webhooks/payos` | Payment spoofing |
| S-8 | **AI prompt không chứa PII** | `ai_request_logs` | PII sent to third-party |
| S-9 | **Integration logs mask secrets** | `integration_logs` | API key exposure |
| S-10 | **Secrets từ env, không hardcode** | Connection strings, API keys | Source code leak → full breach |
| S-11 | **Amount do backend tính** | `payments.amount` | Amount manipulation |
| S-12 | **UUID không sequential** | Tất cả primary keys | ID enumeration attack |

---

## 14.2. Checklist Security cho Database

- [ ] `users.password_hash` lưu bcrypt hash (verify: bắt đầu bằng `$2b$`).
- [ ] `refresh_tokens.token_hash` lưu SHA-256 hash (verify: 64 hex chars).
- [ ] `audit_logs.details` KHÔNG chứa password, token, card info.
- [ ] `integration_logs.request_body` KHÔNG chứa API keys.
- [ ] `integration_logs.response_body` truncated ≤ 10KB.
- [ ] `ai_request_logs.prompt` KHÔNG chứa user email, password, payment info.
- [ ] Foreign keys prevent orphan records.
- [ ] UNIQUE constraints prevent data corruption.
- [ ] CHECK constraints prevent invalid states.
- [ ] `.env` file trong `.gitignore`.
- [ ] Docker Compose dùng env vars cho DB password.

---

# 15. Query Review

---

## 10 Query quan trọng cần review hiệu năng

### Q1: GET /movies (Public listing)
- **Tables:** movies
- **Filter:** status, genre, pagination
- **Index needed:** `idx_movies_status_genre`
- **Risk if no index:** Full table scan khi listing → slow response với nhiều phim
- **Evidence:** `EXPLAIN ANALYZE` output

### Q2: GET /showtimes (Suất chiếu theo phim/ngày)
- **Tables:** showtimes JOIN movies JOIN screens JOIN cinemas
- **Filter:** movie_id, start_time range, status
- **Index needed:** `idx_st_movie_start` composite
- **Risk if no index:** Scan toàn bộ showtimes → slow khi có nhiều suất chiếu
- **Evidence:** `EXPLAIN ANALYZE` output

### Q3: GET /showtimes/:id/seats (Seat map)
- **Tables:** showtime_seats
- **Filter:** showtime_id
- **Index needed:** `idx_ss_showtime_id`
- **Risk if no index:** Scan toàn bộ showtime_seats (nhiều suất × nhiều ghế)
- **Evidence:** Response time < 100ms

### Q4: POST /showtimes/:id/seat-holds (Hold ghế)
- **Tables:** showtime_seats (SELECT FOR UPDATE)
- **Filter:** showtime_id, seat IDs
- **Index needed:** `uq_ss_showtime_seat` unique index
- **Risk if no index:** Lock escalation, slow lock acquisition
- **Evidence:** Race condition test timing

### Q5: POST /bookings (Tạo booking)
- **Tables:** seat_holds, showtime_seats, bookings, booking_seats
- **Filter:** seat_hold_id, user_id
- **Index needed:** Multiple (seat_holds, showtime_seats)
- **Risk:** Transaction quá lâu → lock contention
- **Evidence:** Transaction duration log

### Q6: POST /webhooks/payos (Payment webhook)
- **Tables:** payments, bookings, showtime_seats, tickets
- **Filter:** order_code, payment_link_id
- **Index needed:** `idx_pm_order_code` unique
- **Risk if no index:** Slow webhook processing → payOS timeout → retry flood
- **Evidence:** Webhook processing time < 2s

### Q7: GET /tickets/my (Customer vé)
- **Tables:** tickets JOIN booking_seats JOIN showtime_seats JOIN bookings JOIN showtimes JOIN movies
- **Filter:** booking.user_id
- **Index needed:** `idx_tk_booking_id`, `idx_bk_user_id`
- **Risk:** Multiple JOINs → slow nếu thiếu index
- **Evidence:** Response time < 200ms

### Q8: GET /staff/tickets/:code (Staff tra cứu)
- **Tables:** tickets JOIN booking_seats JOIN showtime_seats JOIN bookings JOIN showtimes JOIN movies JOIN users
- **Filter:** ticket_code
- **Index needed:** `idx_tk_ticket_code` unique
- **Risk:** 7-table JOIN nhưng single row → index quan trọng
- **Evidence:** Response time < 100ms

### Q9: POST /ai/movie-search (Semantic search)
- **Tables:** movie_embedding_documents JOIN movies
- **Filter:** status = READY, vector similarity
- **Index needed:** Vector HNSW index (khi data lớn)
- **Risk:** Exact search chậm khi data > 1000 documents
- **Evidence:** Response time < 3s (acceptable cho AI)

### Q10: GET /admin/audit-logs (Admin query logs)
- **Tables:** audit_logs
- **Filter:** actor_id, resource_type, created_at range
- **Index needed:** `idx_al_created_at`, `idx_al_resource`
- **Risk:** Table log rất lớn, scan chậm nếu thiếu index
- **Evidence:** Response time < 500ms

---

# 16. Database Definition of Done & Evidence

---

## 16.1. Database DoD Checklist

Mỗi khi có thay đổi database, phải check:

- [ ] ERD/schema document updated.
- [ ] Migration file created (`up()` + `down()`).
- [ ] Migration chạy từ clean DB không lỗi.
- [ ] Migration chạy trên DB có data không lỗi.
- [ ] Seed updated nếu cần data mới.
- [ ] Seed chạy idempotent.
- [ ] NOT NULL đúng cho required fields.
- [ ] UNIQUE constraints cho business uniqueness.
- [ ] CHECK constraints cho valid values.
- [ ] Foreign keys cho referential integrity.
- [ ] Indexes cho query patterns chính.
- [ ] Query tested với `EXPLAIN ANALYZE` nếu complex.
- [ ] Transaction behavior tested nếu critical flow.
- [ ] Race-condition tested nếu concurrent access.
- [ ] Evidence attached (migration log, query output, test output).
- [ ] Swagger/API docs updated nếu API bị ảnh hưởng.
- [ ] PR reviewable — reviewer hiểu được lý do thay đổi.

---

## 16.2. Final Database Evidence

Evidence cuối khóa cần có:

| # | Evidence | Mô tả | File khuyến nghị |
|--:|----------|-------|-----------------|
| 1 | **ERD document** | Diagram (hoặc text) toàn bộ schema | `docs/db/erd.md` |
| 2 | **Migration logs** | Output chạy tất cả migrations từ empty DB | `docs/evidence/migration-log.md` |
| 3 | **Seed logs** | Output chạy seed, verify data counts | `docs/evidence/seed-log.md` |
| 4 | **Constraint proof** | Test constraint violations (duplicate email, invalid status) | `docs/evidence/constraint-test.md` |
| 5 | **Index review** | `EXPLAIN ANALYZE` cho 3-5 query quan trọng | `docs/evidence/index-review.md` |
| 6 | **Race condition evidence** | Concurrent seat hold test output | `docs/evidence/seat-race-condition.md` |
| 7 | **Webhook idempotency** | 5x replay webhook, ticket count unchanged | `docs/evidence/webhook-idempotency.md` |
| 8 | **pgvector search** | Semantic search query + results | `docs/evidence/semantic-search.md` |
| 9 | **Docker Compose DB** | `docker compose up` → PostgreSQL + pgvector running | `docs/evidence/docker-db.md` |
| 10 | **State machine test** | Invalid state transitions rejected | `docs/evidence/state-machine-test.md` |
