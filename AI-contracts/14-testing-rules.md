# Testing rules

`TEST-001`: unit test domain rule không claim network/database.  
`TEST-002`: integration/database test dùng boundary thật cho constraint, migration, transaction và lock.  
`TEST-003`: API/event contract test dùng schema/version/consumer fixture.  
`TEST-004`: concurrency test có synchronized start, contender count và final-state assertions.  
`TEST-005`: E2E đi qua public boundary và auth context thật trong scope.  
`TEST-006`: failure test bao gồm timeout/retry/replay/duplicate/out-of-order theo contract.  
`TEST-007`: mỗi test/evidence map ticket + AC + contract ID.  
`TEST-008`: flaky/quarantined test không được tính gate; phải có owner/remediation.
`TEST-009`: Domain unit test MUST chạy không cần NestJS container, ORM, network hoặc database.  
`TEST-010`: Architecture/static rule MUST kiểm dependency direction và forbidden
cross-service import sau khi module roots/tooling tồn tại.  
`TEST-011`: Adapter contract test MUST kiểm mapping/error/timeout/idempotency tại port
boundary; mock không claim database/broker/provider behavior thật.  
`TEST-012`: Chưa có project tooling thì test command là `NOT_AVAILABLE`, không phải
`NOT_RUN` hoặc `PASS`.
`TEST-013`: Performance baseline ghi workload/environment/dataset/warmup/metric/threshold
và limitations; mock không claim real database/network/queue/provider behavior.  
`TEST-014`: Optimization before/after dùng điều kiện materially comparable và luôn chạy
functional/failure/security/invariant regression.  
`TEST-015`: Load/concurrency evidence giữ correctness assertions trong lúc đo; latency
tốt hơn nhưng invariant hoặc error budget fail không được pass.
