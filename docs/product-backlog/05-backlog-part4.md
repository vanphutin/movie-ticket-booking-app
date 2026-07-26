# 5. Detailed Product Backlog — Phần 4 (Epic 9–10: AI Features)

---

## BL-033: System generate movie embeddings

- **Epic:** Epic 8 + Epic 9
- **Priority:** Must
- **Actor:** System
- **User story:** Là System, khi phim được tạo/cập nhật, tôi cần tự động tạo vector embedding để phục vụ semantic search.
- **Business value:** Embeddings là nền tảng cho AI search — không có embeddings, không có semantic search.
- **Functional requirements:**
  - Tạo movie embedding document từ template text (title, genre, synopsis, cast, director...).
  - Content hash để skip nếu nội dung không thay đổi.
  - BullMQ job gọi embedding provider.
  - Lưu vector vào `movie_embedding_documents`.
  - Status: PENDING → READY (hoặc FAILED).
- **Acceptance criteria:**
  - [ ] Phim mới tạo → embedding document PENDING → job chạy → READY.
  - [ ] Phim cập nhật (content thay đổi) → status reset PENDING → regenerate.
  - [ ] Content không đổi (same hash) → skip.
  - [ ] Mock provider trả fixed vector trong test.
  - [ ] Real provider (OpenAI) hoạt động trong demo.
  - [ ] Provider failure → status FAILED, error_message ghi.
- **API endpoints:** Không (background job). Admin trigger: `POST /admin/movies/:id/embeddings/rebuild`.
- **Database impact:** INSERT/UPDATE `movie_embedding_documents`.
- **Edge cases:**
  - Phim không có synopsis → vẫn tạo embedding từ title + genre.
  - Embedding provider rate limit → retry với backoff.
  - Vector dimension mismatch → validate trước khi lưu.
- **Failure cases:** Provider timeout → FAILED + retry. Provider trả vector sai dimension → FAILED.
- **Security/data consistency risks:** KHÔNG gửi PII/token/payment info vào embedding prompt.
- **Evidence required:** DB embedding record, vector dimension, mock vs real provider output.
- **Definition of Done:**
  - [ ] Embedding generation hoạt động.
  - [ ] Mock + real provider.
  - [ ] Content hash dedup.
  - [ ] Error handling.
  - [ ] Unit test.

---

## BL-034: AI semantic movie search

- **Epic:** Epic 9 — AI Semantic Movie Search
- **Priority:** Must
- **Actor:** Guest, Customer
- **User story:** Là Customer, tôi muốn tìm phim bằng câu hỏi tự nhiên như "phim nhẹ nhàng để đi date tối nay" thay vì filter keyword.
- **Business value:** **Differentiator.** Trải nghiệm tìm kiếm thông minh, tăng conversion.
- **Functional requirements:**
  - Input: message (text), optional: city, date, limit.
  - Tạo query embedding từ message.
  - Query pgvector cosine similarity (`<=>` operator).
  - Kết hợp SQL filters: genre, date, available seats.
  - Trả kết quả sorted by relevance score.
  - Mỗi kết quả kèm reason (giải thích vì sao phù hợp).
  - Log vào ai_request_logs.
- **Acceptance criteria:**
  - [ ] POST `/ai/movie-search` → kết quả với relevance score.
  - [ ] Message rỗng → 400.
  - [ ] Không có phim phù hợp → trả `results: []`.
  - [ ] Mock provider hoạt động trong test.
  - [ ] Response time < 3 giây (acceptable cho AI).
  - [ ] AI request log ghi đủ.
- **API endpoints:** `POST /ai/movie-search`
- **Database impact:** SELECT `movie_embedding_documents` với pgvector query. JOIN `movies`, `showtimes`.
- **Edge cases:**
  - Không có embedding nào READY → trả `results: []` + warning.
  - Query quá ngắn ("phim") → vẫn search, kết quả ít relevant.
  - Provider timeout → 504.
- **Failure cases:** pgvector extension chưa install → 500 + log setup error.
- **Security/data consistency risks:**
  - Không gửi user info vào embedding query.
  - Rate limit AI search endpoint.
- **Evidence required:** Curl search với query tự nhiên, response với scores, AI request log.
- **Definition of Done:**
  - [ ] Search hoạt động với mock provider.
  - [ ] pgvector query đúng.
  - [ ] Provider abstraction.
  - [ ] AI request logging.
  - [ ] Unit test.

---

## BL-035: Admin rebuild embeddings

- **Epic:** Epic 9
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn rebuild embeddings cho một phim hoặc tất cả phim khi cần.
- **Acceptance criteria:**
  - [ ] POST `/admin/movies/:id/embeddings/rebuild` → enqueue job cho 1 phim.
  - [ ] POST `/admin/ai/embeddings/rebuild` → enqueue jobs cho tất cả phim.
  - [ ] Trả 202 Accepted (async processing).
  - [ ] RBAC Admin only.
- **API endpoints:** `POST /admin/movies/:id/embeddings/rebuild`, `POST /admin/ai/embeddings/rebuild`
- **Database impact:** UPDATE `movie_embedding_documents` status PENDING. Enqueue BullMQ jobs.
- **Edge cases:** Rebuild khi job đang chạy → queue thêm job, job cũ skip nếu hash same.
- **Failure cases:** Quá nhiều phim → queue overwhelm → need batch/throttle.
- **Security/data consistency risks:** Admin only. Rate limit batch rebuild.
- **Evidence required:** Curl trigger rebuild, BullMQ job log.
- **Definition of Done:** API hoạt động, async, audit log, unit test.

---

## BL-036: Auto-generate embeddings khi phim tạo/cập nhật

- **Epic:** Epic 9
- **Priority:** Should
- **Actor:** System
- **User story:** Là System, khi Admin tạo/cập nhật phim, tôi tự động enqueue embedding generation job.
- **Acceptance criteria:**
  - [ ] POST `/admin/movies` → auto enqueue embedding job.
  - [ ] PATCH `/admin/movies/:id` (content changed) → auto enqueue.
  - [ ] Content không đổi → skip (content hash check).
- **API endpoints:** Không (event-driven).
- **Database impact:** INSERT/UPDATE `movie_embedding_documents`, enqueue job.
- **Edge cases:** Phim tạo với rất ít info → vẫn generate, quality thấp acceptable.
- **Definition of Done:** Auto-trigger hoạt động, content hash dedup, unit test.

---

## BL-037: Admin tạo AI content draft cho phim

- **Epic:** Epic 10 — Admin AI Content Workflow
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn dùng AI để gợi ý synopsis, short description, tags cho phim mới.
- **Business value:** Giảm thời gian tạo nội dung, đảm bảo chất lượng mô tả phim.
- **Functional requirements:**
  - Input: movie_id (phim đã tạo với basic info).
  - AI generate: synopsis, short_description, tags, mood_tags.
  - Lưu vào `movie_ai_content_drafts` với status DRAFT.
  - Validate AI output qua DTO schema.
  - AI KHÔNG tự apply vào phim.
- **Acceptance criteria:**
  - [ ] POST `/admin/movies/:id/ai/content-draft` → 201, trả draft content.
  - [ ] Draft status = DRAFT.
  - [ ] AI output validate qua schema (required fields, max length).
  - [ ] AI output invalid → trả 502 + log.
  - [ ] Phim không tồn tại → 404.
  - [ ] AI request log ghi prompt + response.
- **API endpoints:** `POST /admin/movies/:id/ai/content-draft`
- **Database impact:** INSERT `movie_ai_content_drafts`, INSERT `ai_request_logs`.
- **Edge cases:**
  - Phim đã có draft PENDING → tạo draft mới (versioning).
  - AI trả content quá dài → truncate hoặc reject.
  - AI trả content không phù hợp → Admin reject ở bước apply.
- **Failure cases:** AI provider timeout → 504. AI provider trả garbage → schema validation catch → 502.
- **Security/data consistency risks:**
  - KHÔNG gửi PII vào prompt.
  - AI output PHẢI qua schema validation.
  - KHÔNG auto-apply.
- **Evidence required:** Curl tạo draft, draft content, AI request log.
- **Definition of Done:**
  - [ ] API hoạt động.
  - [ ] Schema validation.
  - [ ] AI request logging.
  - [ ] Mock provider trong test.
  - [ ] Unit test.

---

## BL-038: Admin tạo AI trailer description draft

- **Epic:** Epic 10
- **Priority:** Should
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn AI gợi ý mô tả trailer từ metadata trailer.
- **Acceptance criteria:**
  - [ ] POST `/admin/movies/:id/ai/trailer-description` → 201, trả trailer description draft.
  - [ ] Draft liên kết với trailer record.
  - [ ] Schema validation.
- **API endpoints:** `POST /admin/movies/:id/ai/trailer-description`
- **Database impact:** INSERT `movie_ai_content_drafts`, INSERT `ai_request_logs`.
- **Edge cases:** Phim chưa có trailer → 400.
- **Definition of Done:** API hoạt động, schema validation, logging, unit test.

---

## BL-039: Admin duyệt/từ chối AI content draft

- **Epic:** Epic 10
- **Priority:** Must
- **Actor:** Admin
- **User story:** Là Admin, tôi muốn review AI draft và quyết định apply vào phim hoặc reject.
- **Business value:** **Human-in-the-loop.** AI chỉ gợi ý, con người quyết định.
- **Functional requirements:**
  - Apply: cập nhật nội dung phim từ draft, draft status → APPLIED.
  - Reject: draft status → REJECTED (có thể kèm reason).
  - Khi apply content phim thay đổi → trigger embedding rebuild.
- **Acceptance criteria:**
  - [ ] POST `/admin/movies/:id/ai-content/apply` → 200, phim cập nhật.
  - [ ] Draft status → APPLIED.
  - [ ] Reject → draft status REJECTED.
  - [ ] Draft không tồn tại → 404.
  - [ ] Draft đã APPLIED/REJECTED → 400.
  - [ ] Apply → embedding rebuild trigger.
- **API endpoints:** `POST /admin/movies/:id/ai-content/apply`
- **Database impact:** UPDATE `movie_ai_content_drafts`, UPDATE `movies`, enqueue embedding job.
- **Edge cases:** Apply draft cho phim đã có content → overwrite (Admin chọn apply = đồng ý overwrite).
- **Security/data consistency risks:** Chỉ Admin. Audit log bắt buộc.
- **Evidence required:** Curl apply, verify phim updated, embedding rebuild triggered.
- **Definition of Done:**
  - [ ] Apply/reject hoạt động.
  - [ ] State machine enforced.
  - [ ] Embedding rebuild trigger.
  - [ ] Audit log.
  - [ ] Unit test.

---

## BL-040: AI request logging

- **Epic:** Epic 10
- **Priority:** Must
- **Actor:** System, Admin
- **User story:** Là Admin, tôi muốn xem log các request gửi tới AI provider để monitor chi phí và debug.
- **Acceptance criteria:**
  - [ ] Mọi AI provider call → ghi `ai_request_logs`: prompt, response, latency, provider, model, tokens.
  - [ ] GET `/admin/ai/logs` → danh sách logs (pagination, filter by date).
  - [ ] GET `/admin/ai/usage` → thống kê usage (tổng requests, tổng tokens).
- **API endpoints:** `GET /admin/ai/logs`, `GET /admin/ai/usage`
- **Database impact:** SELECT `ai_request_logs`.
- **Edge cases:** Rất nhiều logs → pagination bắt buộc.
- **Security/data consistency risks:** Prompt log KHÔNG chứa PII. Truncate nếu quá dài.
- **Evidence required:** Curl xem logs, log entries.
- **Definition of Done:** Logging đầy đủ, Admin query API, unit test.
