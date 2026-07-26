# Definition of Ready

`DOR-001`: actor/outcome và problem rõ.  
`DOR-002`: scope/out-of-scope, assumptions và unanswered questions không mâu thuẫn.  
`DOR-003`: prerequisite/gate `VERIFIED`.  
`DOR-004`: contract/capability IDs tồn tại.  
`DOR-005`: invariants, dependencies, security/failure cases được nhận diện.  
`DOR-006`: acceptance criteria testable.  
`DOR-007`: design/test/migration/compatibility/rollback expectation đủ theo risk.  
`DOR-008`: expected files và evidence rõ, ticket vừa một ngày.
`DOR-009`: learning gate tương ứng `PASSED` trước khi mở design/code; learning pass
không thay thế các rule DOR-001..008.

Thiếu bất kỳ rule bắt buộc nào: không code, trạng thái `BLOCKED` hoặc `CHANGES_REQUIRED`.

Optimization ticket chỉ `READY` khi source MVP `VERIFIED` và có workload/environment,
observed baseline, bottleneck + severity, metric/threshold, scoped change, regression
plan và rollback. Các điều kiện này không áp dụng để ép tối ưu ticket MVP chưa eligible.
