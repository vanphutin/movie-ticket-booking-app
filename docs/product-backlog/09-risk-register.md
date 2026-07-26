# 9. Risk Register

---

## 9.1. Bảng Risk tổng hợp

| ID | Risk | Type | Impact | Likelihood | Mitigation | Backlog liên quan |
|:--:|------|:----:|:------:|:----------:|------------|:-----------------:|
| R-01 | **Double booking** — hai customer mua cùng ghế | Data | 🔴 Critical | Medium | SELECT FOR UPDATE, unique constraint trên (showtime_id, seat_id, status=HELD), race condition test | BL-017 |
| R-02 | **Webhook spoofing** — kẻ tấn công giả webhook payOS | Security | 🔴 Critical | Medium | Signature verification bắt buộc, checksum key từ env | BL-028 |
| R-03 | **Duplicate tickets** — webhook replay tạo vé trùng | Data | 🔴 Critical | High | Idempotency check (payment status), unique constraint | BL-029 |
| R-04 | **Amount manipulation** — client gửi amount sai | Security | 🔴 Critical | Medium | Backend LUÔN tính amount từ booking, KHÔNG trust client | BL-027 |
| R-05 | **Seat hold "treo"** — ghế bị hold vĩnh viễn | Product | 🟠 High | Medium | BullMQ expire job, fallback cron scan | BL-019 |
| R-06 | **Booking "treo"** — booking PENDING vĩnh viễn | Product | 🟠 High | Medium | BullMQ expire job 15 phút, fallback cron | BL-032 |
| R-07 | **JWT secret leak** — token bị forge | Security | 🔴 Critical | Low | Secret từ env, đủ dài (≥256 bit), không commit vào repo | BL-013 |
| R-08 | **Password plaintext** — lưu mật khẩu không hash | Security | 🔴 Critical | Low | Bcrypt bắt buộc, code review check | BL-012 |
| R-09 | **PII sent to AI** — gửi thông tin nhạy cảm vào prompt | Security | 🟠 High | Medium | Prompt template cố định, không inject user data, code review | BL-037 |
| R-10 | **AI auto-apply** — AI content publish không qua admin | Product | 🟠 High | Low | State machine DRAFT → APPLIED chỉ qua admin endpoint, unit test | BL-039 |
| R-11 | **Transaction partial failure** — state inconsistent | Data | 🔴 Critical | Medium | Tất cả critical flows trong DB transaction, rollback on error | BL-017, BL-028 |
| R-12 | **Redis downtime** — BullMQ jobs không chạy | Technical | 🟠 High | Low | Docker Compose health check, fallback cron, connection retry | BL-019, BL-032 |
| R-13 | **pgvector not installed** — semantic search fail | Technical | 🟡 Medium | Low | Docker image có pgvector, migration check extension, clear error message | BL-034 |
| R-14 | **payOS API change** — integration break | Integration | 🟡 Medium | Low | PaymentProvider abstraction, integration tests, version pin | BL-027 |
| R-15 | **AI provider cost** — embedding/search tốn tiền | Technical | 🟡 Medium | Medium | Mock provider trong test/CI, rate limit, usage logging | BL-033, BL-034 |
| R-16 | **Migration order error** — clean DB migration fail | Technical | 🟡 Medium | Medium | Test migration từ empty DB trong CI, sequential naming | BL-051 |
| R-17 | **Deadlock** — concurrent seat holds deadlock | Technical | 🟠 High | Medium | Order locks theo seat_id ascending, transaction timeout | BL-017 |
| R-18 | **Refresh token reuse attack** | Security | 🟠 High | Low | Token rotation + reuse detection (revoke all on reuse) | BL-014 |
| R-19 | **Sensitive data in logs** — password/token in log | Security | 🟠 High | Medium | Log sanitization, code review, no request body logging for auth | BL-041, BL-042 |
| R-20 | **Race: expire job vs payment webhook** — booking expire ngay khi payment đến | Data | 🟠 High | Medium | Transaction lock, check booking status trước khi expire | BL-032, BL-028 |

---

## 9.2. Risk Matrix

```
                    Low Impact     Medium Impact    High Impact      Critical Impact
                   ┌──────────────┬────────────────┬────────────────┬─────────────────┐
  High Likelihood  │              │                │                │ R-03            │
                   ├──────────────┼────────────────┼────────────────┼─────────────────┤
  Medium           │              │ R-15, R-16     │ R-05, R-06,    │ R-01, R-02,     │
  Likelihood       │              │                │ R-09, R-17,    │ R-04, R-11,     │
                   │              │                │ R-19, R-20     │                 │
                   ├──────────────┼────────────────┼────────────────┼─────────────────┤
  Low Likelihood   │              │ R-13, R-14     │ R-10, R-12,    │ R-07, R-08      │
                   │              │                │ R-18           │                 │
                   └──────────────┴────────────────┴────────────────┴─────────────────┘
```

---

## 9.3. Chiến lược ưu tiên xử lý Risk

1. **Xử lý ở Tuần 7:** R-01, R-11, R-17 — liên quan seat hold transaction sau khi Booking nhận showtime snapshot.
2. **Xử lý ngay (Tuần 4):** R-07, R-08, R-18 — liên quan authentication security.
3. **Xử lý ở Tuần 8:** R-02, R-03, R-04, R-20 — liên quan payment/webhook.
4. **Xử lý ở Tuần 8:** R-05, R-06 — liên quan worker và expiry jobs.
5. **Xử lý (Tuần 7):** R-09, R-10, R-19 — liên quan AI safety và logging.
6. **Monitor liên tục:** R-12, R-13, R-14, R-15, R-16 — technical/integration risks.
