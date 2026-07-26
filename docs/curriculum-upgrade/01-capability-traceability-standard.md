# Capability Traceability Standard

## 1. Mục đích

Mỗi nội dung học phải dẫn tới một hành vi nghề nghiệp có thể quan sát. Một capability chỉ hoàn thành khi người học hiểu, thực hành và chứng minh được nó ở đúng boundary.

## 2. Chuỗi traceability bắt buộc

```text
Learning Outcome
→ Required Reading
→ Mental Model / Design Artifact
→ Precursor Lab
→ Capstone Task (chỉ từ tuần 4)
→ Verification
→ Learner Explanation
→ Mentor Review
```

| Thành phần | Câu hỏi bắt buộc |
|---|---|
| Learning outcome | Sau bài này người học làm được hành vi gì? |
| Reading | Tài liệu nào cung cấp problem, standard và implementation mechanism? |
| Design | Invariant, state, boundary và failure nào phải được mô hình hóa? |
| Precursor lab | Thí nghiệm nhỏ nào cô lập primitive cần học? |
| Capstone task | Capability được tích hợp ở service/module nào? |
| Verification | Test/command nào bác bỏ được implementation sai? |
| Explanation | Người học giải thích decision và trade-off ra sao? |

## 3. Bốn mức trưởng thành của capability

| Mức | Tên | Điều kiện |
|---:|---|---|
| C1 | Explain | Giải thích bằng lời riêng, có example và counterexample. |
| C2 | Verify primitive | Chạy precursor lab, có prediction, observation và failure case. |
| C3 | Integrate | Tích hợp vào capstone ở đúng owner/boundary và có automated test. |
| C4 | Operate & defend | Có failure/operational evidence và bảo vệ được trade-off khi review. |

Tuần 1-3 chỉ yêu cầu C1-C2. Tuần 4-8 đưa capability core lên C3. Tuần 9-10 đưa capability quan trọng lên C4.

## 4. Capability map cốt lõi

| ID | Tuần | Capability | Design artifact | Precursor lab | Capstone output | Evidence bắt buộc |
|---|---:|---|---|---|---|---|
| NET-01 | 1 | Request lifecycle và failure classification | Sequence diagram | curl timeout/header/CORS lab | N/A | command + observation + failure classification |
| API-01 | 1 | HTTP/API contract | OpenAPI/error table | contract test | Gateway contracts từ W4 | positive/negative contract tests |
| DOM-01 | 2 | Model invariant ngoài framework | state/invariant table | OOP domain lab | core domain rules | unit tests chặn invalid state |
| ARC-01 | 2 | Dependency direction và test seam | dependency diagram | Nest provider override | service module boundary | unit test không cần infrastructure |
| DB-01 | 3 | Constraint/index/transaction | ERD + access pattern | PostgreSQL lab | migrations từ W4 | DB integration test + EXPLAIN khi liên quan |
| SEC-01 | 3-4 | AuthN/AuthZ và token lifecycle | threat/deny matrix | security lab | Identity/Gateway | deny tests, rotation/revocation, redacted log |
| CAT-01 | 5 | Catalog lifecycle/query | ERD + API contract | pagination/index lab | Movie/Trailer API | migration, e2e, query plan |
| EVT-01 | 6 | Atomic state + outbox | sequence/failure matrix | crash-gap lab | Catalog outbox | transaction test + event fixture |
| CON-01 | 7 | Seat concurrency | state/transaction diagram | real PostgreSQL race lab | Booking hold | parallel test, exactly one winner |
| IDEM-01 | 7 | Idempotency/replay | decision table | replay lab | Booking commands/inbox | same-key replay + conflicting payload test |
| WRK-01 | 8 | Reliable worker | retry/DLQ state diagram | crash/restart harness | outbox relay/expiry | duplicate, retry exhaustion, restart recovery |
| PAY-01 | 8 | Safe webhook/payment | state/reconciliation table | signature fixture | payment mock/adapter | invalid signature, duplicate, amount/reference mismatch |
| OPS-01 | 9 | Observability/resilience | signal/timeout budget | failure injection | all core services | correlation, readiness, shutdown, timeout evidence |
| REL-01 | 10 | Reproducible release | release checklist | clean environment drill | capstone release | clean checkout, regression, demo, known limitations |

## 5. Quy tắc boundary của evidence

- Pure function test chỉ chứng minh business rule của pure function.
- In-memory repository test không chứng minh SQL constraint, isolation hoặc locking.
- Mock HTTP test không chứng minh timeout/DNS/TLS thật.
- Calling a handler twice không chứng minh crash recovery nếu state không bền vững.
- Screenshot không chứng minh repeatability; phải đi cùng command/script hoặc artifact text.
- E2E không thay thế mọi unit/integration test; mỗi loại test trả lời một câu hỏi khác nhau.

## 6. Template capability record

```yaml
id: CON-01
title: Exactly-one-winner seat hold
week: 7
level_required: C3
prerequisites: [DB-01, EVT-01]
owner: Booking Service
invariant: One seat occurrence has at most one active hold
design_artifacts:
  - state-diagram
  - transaction-boundary
precursor_lab: postgres-concurrent-hold
capstone_paths: []
verification:
  - integration
  - concurrency
  - replay
failure_cases:
  - simultaneous-requests
  - duplicate-idempotency-key
  - transaction-timeout
stretch: false
```

`capstone_paths` để trống trước tuần 4 là hợp lệ. Khi học viên implement, tracker mới yêu cầu đường dẫn code/commit.

