# Data contracts

## Global

`DATA-001`: UUID primary keys; timestamps UTC; FK chỉ trong cùng service; unique/check/exclusion constraint bảo vệ invariant.  
`DATA-002`: `synchronize: true` bị cấm cho project databases; mọi schema change qua immutable migration.  
`DATA-003`: Migration test từ clean DB và previous baseline; additive/expand-migrate-contract; rollback hoặc forward-fix documented.  
`DATA-004`: Seed tối thiểu, idempotent, không chứa production secret/PII.  
`DATA-005`: Index xuất phát từ uniqueness/FK/query workload; query-plan evidence cho performance claim.  
`DATA-006`: Sensitive values hashed/encrypted/tokenized theo security contract; retention/deletion được ghi rõ.
`DATA-007`: Index/query optimization cần before/after plan phù hợp workload, kiểm
write/storage cost và regression; dataset quá nhỏ hoặc không đại diện không được dùng để
claim optimized.
`DATA-008`: Các data class sau phải có documented retention/purge-archival strategy
trước MVP verification của module sở hữu: expired/revoked `refresh_sessions`, processed
`inbox_events`/`outbox_events`, `idempotency_records`, `payment_webhook_events` payload,
DLQ entries. Webhook payload lưu trữ theo redaction `SEC-007`. Duration cụ thể chọn tại
design ticket qua reviewed decision; contract này yêu cầu strategy tồn tại, không áp đặt
con số.

## Ownership and invariants

| ID | Owner | Entities/keys/constraints | Transaction/concurrency |
|---|---|---|---|
| DATA-IDN-001 | Identity | `users(id,email_normalized UNIQUE,password_hash,status)`, `roles`, `user_roles UNIQUE(user_id,role_id)`, `refresh_sessions(token_hash UNIQUE,family_id,expires_at,revoked_at)` | rotate/revoke family atomically; optimistic status/version where needed |
| DATA-CAT-001 | Catalog | `movies`, `movie_trailers`, `cinemas`, `screens`, `seats UNIQUE(screen_id,label)`, `showtimes(base_price INTEGER CHECK(base_price>0))`, `outbox_events` | showtime state+outbox same transaction; overlap protected by approved DB/application strategy |
| DATA-BKG-001 | Booking | `showtime_snapshots`, `showtime_seats(price)`, `seat_holds`, `bookings`, `booking_seats(price snapshot tại booking time)`, `inbox_events`, `outbox_events`, `idempotency_records` | row lock/constraint gives exactly one winner; inbox+snapshot atomic; booking total derive từ `booking_seats`, không re-read live seat state |
| DATA-PAY-001 | Booking | `payments(provider_reference UNIQUE)`, `payment_webhook_events(provider,event_id UNIQUE)`, `tickets(booking_id UNIQUE)`, job/DLQ records | verified webhook transition+outbox atomic; ticket issuance idempotent |
| DATA-AUD-001 | Operational read model (owner fixed in design) | allowlisted audit/integration metadata, actor/action/outcome/correlation/time; no secret/raw sensitive payload | append-only ingestion or derived projection; bounded query; no cross-service SQL |
| DATA-AI-001 | Future AI owner (stretch) | prompt/output metadata, usage and embedding version only after future design/retention review | no MVP table/migration; activation requires future ticket/CCR if ownership changes |

## State machines

`DATA-SM-001`: Movie `DRAFT → PUBLISHED → ARCHIVED`; no implicit reverse without contract.  
`DATA-SM-002`: Showtime `DRAFT → PUBLISHED → CANCELLED`; published/cancelled produces event.  
`DATA-SM-003`: Hold `ACTIVE → CONFIRMED | EXPIRED | RELEASED`; terminal states immutable.  
`DATA-SM-004`: Booking `PENDING_PAYMENT → CONFIRMED | CANCELLED | EXPIRED`; payment reconciliation controls confirm.  
`DATA-SM-005`: Payment `PENDING → SUCCEEDED | FAILED | UNKNOWN`; unknown requires reconciliation.  
`DATA-SM-006`: Ticket `ISSUED → CHECKED_IN | VOID`; one active issuance per booking. Transition sau `ISSUED` là post-MVP: MVP không có endpoint/actor nào exercise chúng; thêm check-in yêu cầu CCR tương lai định nghĩa acting role và authorization.

`DATA-PAY-002`: Provider-neutral payment state is authoritative; payOS-specific IDs and
verified webhook metadata remain adapter data. Raw webhook retention/redaction follows
`DATA-008` and `SEC-007`; deterministic fake data must be visibly marked test-only.
