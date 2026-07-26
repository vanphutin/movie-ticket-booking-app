# 7. Entity Detail — AI & Semantic Search

---

## Entity: `movie_embedding_documents`

### Purpose
Chứa text profile của phim và vector embeddings tương ứng — phục vụ AI semantic search bằng pgvector.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `movie_id` | UUID | No | FK → movies | — |
| `document_type` | VARCHAR(50) | No | Loại document | `MOVIE_PROFILE` |
| `content` | TEXT | No | Text profile để tạo embedding | `Title: Avengers...` |
| `content_hash` | VARCHAR(64) | No | SHA-256 hash content — skip rebuild nếu không đổi | — |
| `embedding` | vector(1536) | Yes | Vector embedding (null khi PENDING) | — |
| `embedding_provider` | VARCHAR(50) | No | Provider tạo embedding | `openai`, `mock` |
| `embedding_model` | VARCHAR(100) | No | Model sử dụng | `text-embedding-3-small` |
| `embedding_dimensions` | INTEGER | No | Số chiều vector | `1536` |
| `status` | VARCHAR(20) | No | Trạng thái | `PENDING`, `READY`, `FAILED` |
| `error_message` | TEXT | Yes | Lỗi nếu FAILED | — |
| `embedded_at` | TIMESTAMPTZ | Yes | Thời điểm tạo embedding thành công | — |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Prerequisites
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Foreign Keys
- `movie_id → movies(id)` ON DELETE CASCADE

### Constraints
- `chk_embedding_docs_status` — CHECK(status IN ('PENDING', 'READY', 'FAILED')).
- `chk_embedding_docs_type` — CHECK(document_type IN ('MOVIE_PROFILE', 'TRAILER_METADATA', 'REVIEW_SUMMARY')).
- `chk_embedding_docs_dimensions` — CHECK(embedding_dimensions > 0).

### Indexes
- `idx_embedding_docs_movie_id` — INDEX(movie_id). Lookup embeddings cho phim.
- `idx_embedding_docs_status` — INDEX(status). Tìm documents cần process.
- **Vector Index (khi data đủ lớn):**
```sql
CREATE INDEX idx_embedding_docs_vector
ON movie_embedding_documents
USING hnsw (embedding vector_cosine_ops)
WHERE status = 'READY';
```
- MVP với dữ liệu nhỏ (<1000 phim): dùng exact search, không cần HNSW index.
- Khi tập dữ liệu lớn: thêm HNSW index cho approximate nearest neighbor search.

### Common Queries
```sql
-- Semantic search (cosine similarity)
SELECT med.movie_id, med.content,
       1 - (med.embedding <=> $1::vector) AS similarity_score
FROM movie_embedding_documents med
JOIN movies m ON med.movie_id = m.id
WHERE med.status = 'READY'
  AND med.document_type = 'MOVIE_PROFILE'
  AND m.status IN ('NOW_SHOWING', 'COMING_SOON')
ORDER BY med.embedding <=> $1::vector
LIMIT $2;
```

### Design Notes
- **content_hash** cho phép skip rebuild khi phim cập nhật nhưng content thực tế không thay đổi (ví dụ: chỉ sửa poster_url → hash content không đổi).
- **Mỗi phim có thể nhiều embedding documents** — MOVIE_PROFILE (chính), TRAILER_METADATA (bổ sung), REVIEW_SUMMARY (stretch).
- **Lỗi cần tránh:** Quên check pgvector extension → migration fail.

---

## Entity: `ai_request_logs`

### Purpose
Log chi tiết mọi request gửi đến AI/embedding provider — phục vụ monitor chi phí, debug, audit.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `provider` | VARCHAR(50) | No | AI provider | `openai`, `mock` |
| `model` | VARCHAR(100) | No | Model sử dụng | `gpt-4o-mini` |
| `request_type` | VARCHAR(50) | No | Loại request | `CONTENT_DRAFT`, `EMBEDDING`, `SEARCH` |
| `prompt` | TEXT | Yes | Prompt gửi (truncated, sanitized) | — |
| `response` | TEXT | Yes | Response nhận (truncated) | — |
| `tokens_input` | INTEGER | Yes | Tokens đầu vào | `150` |
| `tokens_output` | INTEGER | Yes | Tokens đầu ra | `300` |
| `latency_ms` | INTEGER | Yes | Thời gian xử lý (ms) | `1200` |
| `status` | VARCHAR(20) | No | Kết quả | `SUCCESS`, `FAILED`, `TIMEOUT` |
| `error_message` | TEXT | Yes | Lỗi nếu có | — |
| `movie_id` | UUID | Yes | Phim liên quan (nếu có) | — |
| `user_id` | UUID | Yes | User trigger (nếu có) | — |
| `request_id` | UUID | Yes | Correlation ID | — |
| `created_at` | TIMESTAMPTZ | No | — | — |

### Indexes
- `idx_ai_request_logs_provider` — INDEX. Filter theo provider.
- `idx_ai_request_logs_type` — INDEX. Filter theo request type.
- `idx_ai_request_logs_created_at` — INDEX. Query theo thời gian.

### Business Rules
- **Append-only.**
- **KHÔNG log PII** trong prompt (email, password, card info).
- Prompt có thể truncate nếu quá dài (> 5KB).

---

## Entity: `movie_ai_content_drafts`

### Purpose
Bản nháp nội dung do AI tạo cho phim — chờ Admin review và apply. Human-in-the-loop bắt buộc.

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `movie_id` | UUID | No | FK → movies | — |
| `draft_type` | VARCHAR(50) | No | Loại nội dung | `SYNOPSIS`, `TRAILER_DESCRIPTION`, `TAGS` |
| `content` | JSONB | No | Nội dung AI đề xuất | `{"synopsis": "...", "tags": [...]}` |
| `status` | VARCHAR(20) | No | Trạng thái | `DRAFT` |
| `applied_at` | TIMESTAMPTZ | Yes | Thời điểm admin apply | — |
| `applied_by` | UUID | Yes | FK → users (admin) | — |
| `rejected_at` | TIMESTAMPTZ | Yes | Thời điểm reject | — |
| `rejected_by` | UUID | Yes | FK → users (admin) | — |
| `reject_reason` | TEXT | Yes | Lý do reject | — |
| `ai_request_log_id` | UUID | Yes | FK → ai_request_logs (truy vết) | — |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Foreign Keys
- `movie_id → movies(id)` ON DELETE CASCADE

### Constraints
- `chk_ai_drafts_status` — CHECK(status IN ('DRAFT', 'APPLIED', 'REJECTED')).
- `chk_ai_drafts_type` — CHECK(draft_type IN ('SYNOPSIS', 'TRAILER_DESCRIPTION', 'TAGS', 'FULL_CONTENT')).

### Business Rules
- **AI content LUÔN ở trạng thái DRAFT khi mới tạo.** Không có path nào auto-apply.
- **Chỉ Admin mới được Apply/Reject.**
- Khi Apply → content được copy vào bảng `movies` (cập nhật synopsis/tags/description).
- Khi Apply → trigger embedding rebuild (nếu content thay đổi).

---

## Entity: `user_movie_preferences`

### Purpose
Lưu sở thích xem phim của customer — phục vụ AI recommendations (stretch goal).

### Important Fields

| Field | Type | Nullable | Description | Example |
|-------|------|:--------:|-------------|---------|
| `id` | UUID | No | Primary key | — |
| `user_id` | UUID | No | FK → users | — |
| `preferred_genres` | VARCHAR(255) | Yes | Thể loại ưa thích | `Action, Comedy` |
| `preferred_moods` | VARCHAR(255) | Yes | Mood ưa thích | `light, fun` |
| `disliked_genres` | VARCHAR(255) | Yes | Thể loại không thích | `Horror` |
| `created_at` | TIMESTAMPTZ | No | — | — |
| `updated_at` | TIMESTAMPTZ | No | — | — |

### Constraints
- `uq_user_preferences_user_id` — UNIQUE(user_id). Mỗi user 1 preference record.

---

## Entity: `ai_recommendation_feedback`

### Purpose
Feedback của user cho AI recommendations — cải thiện chất lượng gợi ý.

### Important Fields

| Field | Type | Nullable | Description |
|-------|------|:--------:|-------------|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → users |
| `movie_id` | UUID | No | FK → movies (phim được gợi ý) |
| `feedback_type` | VARCHAR(20) | No | `LIKED`, `DISLIKED`, `IRRELEVANT` |
| `created_at` | TIMESTAMPTZ | No | — |

### Business Rules
- Feedback là stretch goal, chỉ implement nếu recommendations hoạt động.
- Append-only.
