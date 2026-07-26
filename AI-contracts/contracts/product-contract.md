# Product contract

## Vision and problem

`PRD-001`: Cho Guest/Customer tìm suất chiếu, giữ ghế, thanh toán và nhận ticket; cho Admin quản lý catalog/schedule; cho Operator quan sát và phục hồi failure mà không phá invariant.

`PRD-002`: Hệ thống giải quyết oversell ghế, state drift giữa catalog/booking/payment, duplicate delivery và thiếu audit/evidence.

## Actors and outcomes

| ID | Actor | Permission/outcome |
|---|---|---|
| ACT-001 | Guest | đọc published catalog/showtime; register/login |
| ACT-002 | Customer | quản lý profile/session; hold/book/pay; xem ticket của mình |
| ACT-003 | Admin | quản lý movie/cinema/screen/seat/showtime; không đọc credential/payment secret |
| ACT-004 | Service identity | gọi boundary nội bộ tối thiểu, authenticated và auditable |
| ACT-005 | Operator | health/metrics/DLQ/reconciliation theo least privilege; không đổi business state trực tiếp |

## MVP

`SCOPE-001`: Identity/Gateway, Catalog, Showtime publication, Booking/seat hold, payment mock/webhook, ticket/worker, observability/recovery và E2E release.  
`SCOPE-002`: Core luôn ưu tiên stretch; semantic/recommendation, real payment settlement, multi-region, loyalty, promotion, refund automation và mobile UI là out of scope.  
`SCOPE-003`: Tuần 10 feature freeze; không domain mới.

## Business rules

`BUS-001`: Chỉ published movie/showtime hợp lệ mới xuất hiện public.  
`BUS-002`: Screen seat label unique trong screen; showtime không overlap theo approved scheduling policy.  
`BUS-003`: Một seat/showtime chỉ có tối đa một active hold/confirmed booking; hold hết hạn không thể confirm. Hold expiry duration là một named configuration parameter có đúng một source of truth; default chọn tại Booking design ticket; cấm hardcode TTL literal rải rác.  
`BUS-004`: Booking chỉ thuộc actor đã xác thực; actor thường chỉ đọc/thao tác booking của mình.  
`BUS-005`: Payment success chỉ từ provider result/webhook đã verify amount, currency, reference và signature; amount/currency được verify với booking total tính từ price snapshot theo `BUS-009`.  
`BUS-006`: Một paid booking phát hành tối đa một ticket; duplicate/replay không lặp effect.  
`BUS-007`: State transition phải tuân state machine và audit được.  
`BUS-008`: Admin không được bypass invariant bằng endpoint đặc quyền.  
`BUS-009`: Giá xuất phát từ Catalog: mỗi showtime có `base_price` integer minor unit (VND đồng, > 0); per-seat override chỉ được thêm qua reviewed design decision. Booking snapshot giá khi tiêu thụ published snapshot và snapshot lại per seat tại thời điểm booking; payment amount phải bằng tổng price snapshot của các ghế đã book. MVP dùng một currency (VND). Monetary value dùng integer minor unit; cấm floating point.  
`BUS-010`: Khi nhận verified `catalog.showtime.cancelled.v1`: active hold → `RELEASED`; booking `PENDING_PAYMENT` → `CANCELLED`; booking `CONFIRMED` giữ nguyên nhưng được flag cho operator reconciliation vì refund automation out of scope theo `SCOPE-002`. Mọi transition idempotent dưới duplicate delivery và audit được.

## Assumptions, constraints and NFR

`ASM-001`: PostgreSQL là authoritative store per service; delivery async là at-least-once.  
`CON-001`: Một học viên, 7 tuần project, local Compose; topology giảm trước khi giảm correctness/security/test.  
`NFR-001`: Public API versioned, deterministic error envelope, bounded pagination và compatibility additive.  
`NFR-002`: Mọi outbound call có timeout; retry bounded chỉ cho operation safe/idempotent.  
`NFR-003`: Core request/event có correlation; logs structured/redacted.  
`NFR-004`: Clean install/migrate/seed/test và documented recovery phải reproducible.  
`OPS-001`: Liveness, readiness, graceful shutdown, backup/restore, DLQ/replay và runbook có evidence.  
`RISK-001`: oversell, token theft, duplicate webhook/event, schema drift, retry storm, secret leakage và false evidence là known high risks.
