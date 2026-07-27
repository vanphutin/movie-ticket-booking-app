# Quality contract

`QLT-001`: TypeScript strict, clear module boundary, domain rule không nằm controller/Gateway/ORM hook.  
`QLT-002`: Planned application stack là TypeScript + NestJS; đây là architecture
assumption cho design, không phải evidence rằng dependency/tooling đã được cài.  
`QLT-003`: Khi module được scaffold, formatter/linter/test baseline SHOULD là Prettier,
ESLint và Jest, trừ khi approved ADR/CCR chọn lựa khác.  
`QLT-004`: Mỗi module root MUST có nested `AGENTS.md` với command format/lint/test chạy
được và `codex-guidelines` block; không tạo command placeholder trong module chưa tồn tại.  
`QLT-005`: Error map deterministic theo `API-COM-003`; unknown/internal error không leak detail.  
`OBS-001`: Structured log có timestamp, service, level, event/action, request/trace/correlation ID và redaction.  
`OBS-002`: Request/trace context propagate qua HTTP/event; metric labels bounded, không PII/high-cardinality ID.  
`TEST-001`: Testing pyramid/risk rules theo `AI-contracts/14-testing-rules.md`; boundary thật cho claim thật.  
`MIG-001`: Immutable migration, clean+upgrade smoke, compatibility và rollback/forward-fix evidence.  
`CI-001`: CI typecheck/lint/unit/integration/contract/build; DB-dependent gate dùng clean isolated DB.  
`EVD-001`: Evidence manifest theo `AI-contracts/08-evidence-and-verification-policy.md`, không synthetic output.  
`PR-001`: PR link ticket/contracts, scope, tests, migration, security, observability, evidence và rollback.  
`DOR-001`: Tất cả DoR liên quan đạt trước implementation.  
`DOD-001`: Tất cả DoD liên quan đạt trước `VERIFIED`.  
`GATE-001`: Weekly gate yêu cầu mọi core capability/ticket và unresolved BLOCKER/HIGH = 0; conditional không mở dependency.  
`REL-001`: Release gate yêu cầu feature freeze, clean setup/migration, core E2E/race/replay/failure/security/restore evidence, runbook, known risks và traceability complete.
`PERF-001`: Performance claim MUST có workload, environment, dataset, baseline, metric,
threshold và limitations theo `22-performance-baseline-standard.md`.  
`PERF-002`: Optimization claim MUST có materially comparable before/after evidence.  
`PERF-003`: Optimization MUST NOT trade away correctness, security, data invariant hoặc
service ownership.  
`PERF-004`: `NOT_REQUIRED` MUST có baseline/risk evidence; code change không bắt buộc.  
`PERF-005`: Optimization BLOCKER/HIGH MUST block dependent module.  
`PERF-006`: MEDIUM chỉ `DEFERRED_WITH_BUDGET` khi có owner, reason, budget,
deadline/gate, risk acceptance và regression guard.
`TRC-001`: Backlog API inventory phải map 1:1 tới đúng 55 row trong
`traceability/backlog-contract-map.yml`; endpoint ID và method+canonical path phải unique.
`TRC-002`: Mọi `CORE_REQUIRED` row phải map ít nhất một capability và delivery ticket;
`STRETCH`/`POST_MVP` không được map active MVP ticket.
`TRC-003`: Control-plane validation phải fail khi thiếu/thừa mapping, duplicate endpoint
hoặc method+path, disposition không hợp lệ, core row thiếu ticket, hay operational log
contract cho phép raw sensitive payload.
