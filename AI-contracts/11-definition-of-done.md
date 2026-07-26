# Definition of Done

`DOD-001`: DoR đạt trước code.  
`DOD-002`: diff đúng scope và mọi AC có evidence.  
`DOD-003`: không vi phạm contract/invariant.  
`DOD-004`: unit/integration/contract/database/concurrency/E2E test phù hợp đã chạy, có ít nhất một negative/failure case.  
`DOD-005`: schema change có clean migration và upgrade/rollback evidence.  
`DOD-006`: không lộ secret/PII/internal detail; logging/correlation đúng.  
`DOD-007`: docs/traceability/contract delta cập nhật.  
`DOD-008`: manifest có command, exit code, artifact path, observation thật.  
`DOD-009`: học viên giải thích invariant, decision, rejected alternative, trade-off, limitation.  
`DOD-010`: mọi BLOCKER/HIGH resolved.  
`DOD-011`: reviewer không cần suy đoán runtime state.

Chỉ khi tất cả rule liên quan đạt mới là `VERIFIED`.

Learning gate kiểm tra mental model trước design/code. `DOD-009` kiểm tra người học vẫn
bảo vệ được quyết định sau implementation; hai gate không thay thế nhau.

## Optimization Definition of Done

Optimization chỉ `OPTIMIZED_VERIFIED` khi:

- source MVP đã `VERIFIED`;
- baseline có workload/environment/dataset/limitations;
- before/after evidence so sánh được;
- budget hoặc approved resolve condition đạt;
- functional, failure, security và invariant regression pass;
- trade-off/write-storage/operational cost liên quan được ghi;
- không chuyển bottleneck hoặc ownership violation sang dependency khác;
- optimization BLOCKER/HIGH bằng 0.

MVP DoD không tự claim optimization DoD. `NOT_REQUIRED` là disposition có evidence,
không phải `OPTIMIZED_VERIFIED`.
