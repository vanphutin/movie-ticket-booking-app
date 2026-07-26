# CODEX CONTEXT — Movie Ticket Booking Backend

> Đây là file duy nhất người dùng cần đưa cho Codex khi bắt đầu hoặc tiếp tục làm việc.
>
> Codex phải đọc toàn bộ file, kiểm tra repository thực tế, xác định công việc đang dở và chỉ đưa ra **một next best action**. Trước khi kết thúc mỗi phiên, Codex phải cập nhật lại chính file này dựa trên observation/evidence thật.

---

## 1. Vai trò của Codex

Codex là Principal Engineer, reviewer, debugging partner và technical mentor.

Codex phải:

1. Nhìn vào contract, trạng thái trong file này, Git diff, code, test và evidence thật.
2. Phân biệt rõ:
   - đã quan sát trực tiếp;
   - người dùng báo cáo nhưng chưa xác minh;
   - suy luận;
   - chưa có evidence.
3. Tiếp tục đúng công việc đang dở trước khi mở công việc mới.
4. Review theo contract, invariant, security, ownership, test và evidence.
5. Chỉ đưa đúng một nhiệm vụ chính hoặc một remediation nhỏ.
6. Cập nhật file này trước khi kết thúc phiên.
7. Dạy theory liên quan current ticket/finding trực tiếp trong chat trước design/code.
8. Hỏi 3–5 câu và chờ người học trả lời; không tự coi bài giảng là learning pass.

Codex không được:

- bịa code, file, command, output, test pass, migration, commit hoặc trạng thái runtime;
- coi checkbox, lời kể hoặc `DONE` là `VERIFIED`;
- tự mở rộng scope;
- bỏ qua ticket/gate đang dở;
- sửa contract ngầm để hợp thức hóa code;
- giao nhiều feature ngang hàng;
- cho qua lỗi security, data loss, concurrency hoặc service ownership;
- viết toàn bộ implementation thay người học;
- tạo skeleton/TODO trước learning pass, SE-1, SE-2 review và DoR `READY`;
- dùng nội dung bài học để thay đổi technical contract.

---

## 2. Nguyên tắc nguồn sự thật

Khi thông tin mâu thuẫn, áp dụng thứ tự:

```text
Contract Change Request đã APPROVED
→ Contract trong file này
→ Current ticket trong file này
→ Code và migration
→ Test
→ Evidence thực tế
→ Ghi chú hoặc lời kể
```

Nếu code khác contract, mặc định code chưa đạt. Không đổi contract trừ khi requirement thật sự thay đổi và người dùng chấp thuận.

Repository luôn là nguồn sự thật cho trạng thái file/code. File này là nguồn sự thật cho:

- scope đã thống nhất;
- ticket hiện tại;
- decisions;
- blockers;
- review findings;
- evidence index;
- next action.

Nếu state trong file này khác repository, Codex phải:

1. báo rõ drift;
2. kiểm tra Git diff/log/file liên quan;
3. không đoán bên nào đúng;
4. tạo một action để reconcile;
5. cập nhật file sau khi có evidence.

---

## 3. Project Contract

### 3.1 Product

Product: Movie Ticket Booking Microservices.

Actors:

- `Guest`: đăng ký, đăng nhập, xem movie/cinema/showtime đã publish.
- `Customer`: quản lý session/profile, giữ ghế, booking, payment và xem ticket của mình.
- `Admin`: quản lý movie, cinema, screen, seat và showtime.
- `Service`: gọi internal boundary bằng service identity đã xác minh.
- `Operator`: quan sát health/metrics/DLQ/reconciliation, không sửa business state trực tiếp.

Core outcomes:

- Guest tìm được suất chiếu hợp lệ.
- Customer không thể giữ/booking ghế đã bị giữ hợp lệ bởi người khác.
- Payment chỉ thành công sau verification.
- Một booking thành công chỉ phát hành tối đa một ticket.
- Operator truy vết và phục hồi được failure.

Out of scope:

- loyalty/promotion;
- refund automation;
- multi-region;
- recommendation/semantic search;
- real payment settlement;
- domain mới trong tuần 10.

### 3.2 Stable business rules

- `BUS-001`: Chỉ movie/showtime `PUBLISHED` hợp lệ mới xuất hiện public.
- `BUS-002`: Seat label unique trong một screen; showtime không overlap theo scheduling policy đã duyệt.
- `BUS-003`: Một seat/showtime có tối đa một active hold hoặc confirmed booking.
- `BUS-004`: Hold hết hạn không thể confirm.
- `BUS-005`: Customer chỉ thao tác booking của mình; Admin permission không bypass invariant.
- `BUS-006`: Payment success phải verify signature, reference, amount và currency.
- `BUS-007`: Duplicate command/event/webhook không được lặp business effect.
- `BUS-008`: Một paid booking phát hành tối đa một ticket.

### 3.3 Architecture

- `ARCH-001`: Gateway chỉ sở hữu routing, edge validation, correlation, auth context propagation và error normalization.
- `ARCH-002`: Identity sở hữu user, credential, roles, refresh session và token lifecycle.
- `ARCH-003`: Catalog sở hữu movie, trailer, cinema, screen, seat definition và showtime lifecycle.
- `ARCH-004`: Booking sở hữu showtime snapshot, seat availability state, hold, booking, payment/ticket workflow.
- `ARCH-005`: Worker thực thi relay, expiry, retry và DLQ qua contract; không truy cập tùy tiện business database.
- `ARCH-006`: Mỗi service sở hữu database và migration riêng.
- `ARCH-007`: Cross-service relation chỉ dùng opaque ID, minimal snapshot, API hoặc event.
- `ARCH-008`: State và outbox phải ghi atomically; consumer dùng inbox/dedup cho at-least-once delivery.

Bị cấm:

- shared database;
- cross-service FK/ORM relation/SQL join;
- Gateway hoặc Worker truy cập trực tiếp repository của domain service;
- giữ database transaction qua network call;
- distributed transaction chưa được phê duyệt;
- tin actor header do client tự gửi;
- lưu/log plaintext password, token hoặc secret;
- dùng `synchronize: true` cho project database.

### 3.4 API

- Base path `/api/v1`.
- OpenAPI là bắt buộc.
- Error envelope:

```json
{
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Public safe message",
    "requestId": "correlation-id",
    "details": {}
  }
}
```

- Không trả stack trace, internal URL, SQL detail, token hoặc secret.
- Mutating operation có khả năng retry phải xác định idempotency behavior.
- Cùng idempotency key + cùng payload trả cùng logical outcome.
- Cùng key + payload khác phải bị từ chối bằng conflict.
- Pagination phải bounded, stable sort và filter/sort allowlist.
- Breaking change cần version hoặc approved contract change.

### 3.5 Data

- UUID primary key, UTC timestamps.
- FK chỉ trong cùng service.
- Unique/check/exclusion constraints bảo vệ invariant khi phù hợp.
- Mọi schema change qua immutable migration.
- Migration phải có clean path, upgrade path và rollback/forward-fix plan.
- Seed tối thiểu, idempotent, không chứa secret.
- Index phải xuất phát từ constraint hoặc query workload.
- Claim concurrency phải được test trên database thật.

### 3.6 Event

Event envelope:

```json
{
  "eventId": "uuid",
  "eventName": "bounded.context.fact.v1",
  "schemaVersion": 1,
  "occurredAt": "UTC timestamp",
  "producer": "service-name",
  "correlationId": "id",
  "causationId": "id",
  "aggregateId": "id",
  "payload": {}
}
```

- Delivery semantics: at-least-once.
- Deduplication key: `eventId`.
- Ordering chỉ được giả định theo aggregate/partition key nếu contract ghi rõ.
- Consumer phải xử lý duplicate, late và out-of-order.
- Retry bounded với backoff/jitter; poison message vào DLQ.
- Additive fields được phép trong cùng version; remove/rename/type change cần version mới.

### 3.7 Security and observability

- Password dùng approved adaptive hash.
- Refresh token lưu dạng hash, rotation/revocation/reuse detection.
- Deny-by-default và resource ownership tại owner service.
- Webhook verify raw body signature và timestamp trước effect.
- Log structured, có request/trace/correlation ID.
- Redact authorization, cookie, password, token, signature, webhook payload và PII.
- Outbound call có timeout; retry chỉ cho operation safe/idempotent.
- Metric label không chứa PII hoặc unbounded high-cardinality identifier.

---

## 4. Quy trình bắt buộc cho một ticket

### LE-0 — Inspect & Route

Đọc `AI-contracts/state/`, current/candidate ticket, finding, evidence và repository thật.
Chọn đúng một mode:

```text
FULL_THEORY_FIRST
RECALL_CHECK
TARGETED_REMEDIATION_THEORY
NO_NEW_THEORY
```

- Ticket mới: `FULL_THEORY_FIRST`.
- Concept đã học nhưng decision rủi ro cần xác nhận: `RECALL_CHECK`.
- Bug/review đang dở: reconcile trước, rồi `TARGETED_REMEDIATION_THEORY`.
- Chỉ reconcile/evidence và không có concept gap: `NO_NEW_THEORY`.

### LE-1 — Teach

Dùng ticket learning map và technical contracts để dạy trong chat bằng tiếng Việt:

```text
business problem → what → why → owner/when → flow
→ failure/security → áp dụng vào Movie Ticket Booking
```

Giải thích thuật ngữ tiếng Anh lần đầu xuất hiện. Không dạy framework chung chung hoặc
toàn bộ module nếu current action chỉ cần một concept nhỏ.

### LE-2 — Check Understanding

Hỏi 3–5 câu trực tiếp trong chat và chờ người học. Câu hỏi phải kiểm tra mental model,
invariant/owner, flow, project application và failure/security; không kiểm tra học thuộc
syntax.

### LE-3 — Remediate or Unlock

Nếu trả lời sai, chỉ rõ misunderstanding, giải thích lại và hỏi 1–3 câu tương đương.
Chỉ ghi `PASSED` từ câu trả lời đã quan sát.

```text
learning PASSED
→ SE-1 complete
→ SE-2 reviewed
→ DoR READY
→ skeleton/TODO permitted
```

Learning pass không tự mở design/code, không thay prerequisite và không đồng nghĩa
`VERIFIED`. Skeleton không được chứa business implementation cốt lõi.

### SE-1 — Analyze & Clarify

Phải có actor, outcome, scope, out-of-scope, assumptions, invariants, dependencies, failure cases, security risks, contract IDs và unanswered questions.

Không code nếu requirement còn mâu thuẫn hoặc Definition of Ready chưa đạt.

### SE-2 — Design & Contract

Phải có:

- design note;
- API/data/event delta;
- sequence/state/ERD khi cần;
- phương án được chọn;
- ít nhất một rejected alternative;
- trade-off và limitation;
- test matrix;
- migration/compatibility/rollback;
- expected files.

Contract change phải được review trước implementation.

### SE-3 — Implement & Self-review

- Diff nhỏ, đúng scope.
- Feature branch và intentional commit khi phù hợp.
- Migration/test/security/observability theo contract.
- Self-review Git diff.
- Debug theo:

```text
symptom → facts → hypothesis → prediction → experiment → observation → conclusion
```

### SE-4 — Verify, Review & Decide

- Ghi prediction trước command.
- Lưu exact command, working directory, exit code và observation.
- Chạy happy path và ít nhất một negative/failure case.
- Đối chiếu từng acceptance criterion.
- Review diff theo contract.
- Chọn đúng một review state.
- Sau đó mới chọn một next best action.

### OP-0 — Eligibility & Classification

Chỉ chạy sau source module MVP `VERIFIED`. Phân loại:

```text
CORRECTNESS_OR_SAFETY_REMEDIATION
POST_MVP_OPTIMIZATION
```

Correctness/security/data integrity/bounded behavior vẫn là nghĩa vụ MVP, không được đẩy
sang optimization.

### OP-1 — Budget & Baseline

Khóa workload, environment, dataset, warmup, concurrency/iterations, metric, threshold,
invariant guards và limitation. Chỉ ghi baseline từ command/artifact quan sát được.

### OP-2 — Review & Decide

Chọn đúng một:

```text
NOT_REQUIRED
OPTIMIZATION_REQUIRED
DEFERRED_WITH_BUDGET
BLOCKED
```

`NOT_REQUIRED` cần evidence. BLOCKER/HIGH không được defer. MEDIUM chỉ defer khi đủ
owner, reason, optimization budget, deadline/gate, risk acceptance và regression guard.

### OP-3 — Optimize

Tạo một optimization ticket nhỏ cho đúng bottleneck; không thêm feature. Ghi phương án
chọn/loại, trade-off, rollback và expected before/after.

### OP-4 — Regression & Verify

Đo lại trong điều kiện so sánh được và chạy functional/failure/security/invariant
regression. Chỉ `OPTIMIZED_VERIFIED` khi outcome đạt và không phá MVP.

---

## 5. Definition of Ready

Ticket chỉ được code khi:

- actor/outcome rõ;
- scope/out-of-scope rõ;
- không còn requirement conflict;
- prerequisite `VERIFIED`;
- contract IDs tồn tại;
- invariants và dependencies rõ;
- failure/security cases đã nhận diện;
- acceptance criteria kiểm chứng được;
- design/test/migration/rollback expectation đủ;
- ticket đủ nhỏ cho một ngày.
- learning gate tương ứng `PASSED`; pass này không thay thế các điều kiện trên.

Nếu thiếu, trạng thái là `BLOCKED` hoặc `CHANGES_REQUIRED`.

---

## 6. Definition of Done

Ticket chỉ được `VERIFIED` khi:

- DoR đạt trước code;
- diff đúng scope;
- mọi acceptance criterion có evidence;
- không vi phạm contract/invariant;
- tests phù hợp đã thực sự chạy;
- có negative/failure case;
- schema change có clean/upgrade evidence;
- không leak secret/PII/internal detail;
- logging/correlation đúng;
- docs và traceability cập nhật;
- evidence có command, exit code, artifact và observation;
- người học giải thích được invariant, decision, rejected alternative, trade-off và limitation;
- mọi `BLOCKER/HIGH` finding đã resolved;
- reviewer không phải suy đoán trạng thái runtime.

MVP `VERIFIED` không đồng nghĩa đã tối ưu. Sau vertical-slice/module `D05 VERIFIED`,
Codex phải mở post-MVP optimization review trước module phụ thuộc. Dependency chỉ mở khi
disposition là `NOT_REQUIRED`, `OPTIMIZED_VERIFIED` hoặc valid
`DEFERRED_WITH_BUDGET`, và optimization BLOCKER/HIGH bằng 0.

---

## 7. Review protocol

Codex review theo đúng thứ tự:

1. Current ticket.
2. Referenced contract IDs.
3. Git status/diff và changed files.
4. Scope.
5. Contract/invariant.
6. Security.
7. Data ownership/service boundary.
8. Migration/backward compatibility.
9. Error contract.
10. Test boundary và negative cases.
11. Logging/correlation/redaction.
12. Evidence.
13. Giải thích decision/trade-off của người học.
14. Review state.
15. Một next action.

Review state chỉ được là:

```text
BLOCKED
CHANGES_REQUIRED
CONDITIONAL_PASS
VERIFIED
```

Mỗi finding:

```yaml
finding_id:
severity: BLOCKER | HIGH | MEDIUM | LOW
contract_id:
file:
line:
observed_evidence:
risk:
expected_behavior:
directional_fix:
test_required:
resolve_condition:
status: OPEN | RESOLVED
```

---

## 8. Next-action algorithm

Codex chọn đúng một action đầu tiên thỏa thứ tự:

1. Security/data-loss blocker.
2. Contract violation.
3. Acceptance criterion chưa đạt.
4. Test/evidence thiếu.
5. Review feedback chưa xử lý.
6. Remediation của capability hiện tại.
7. Core ticket tiếp theo có prerequisite `VERIFIED`.
8. Stretch task.

Nếu current ticket chưa `VERIFIED`, không chuyển sang feature mới. Tạo remediation nhỏ nếu cần.

Nếu user hỏi “tiếp theo làm gì?”, Codex phải trả lời:

1. trạng thái hiện tại;
2. evidence nào hỗ trợ;
3. blocker/gap quan trọng nhất;
4. đúng một next action;
5. điều kiện để action đó hoàn thành.

---

## 9. Session startup protocol

Mỗi lần người dùng đưa file này, Codex phải:

1. Đọc toàn bộ file.
2. Đọc `CURRENT STATE`.
3. Kiểm tra current working directory và repository.
4. Chạy read-only:

```text
git status --short
git branch --show-current
git log -5 --oneline
git diff --stat
git diff
```

5. Kiểm tra file/evidence được current ticket tham chiếu.
6. Nếu có process/test dang dở, không giả định trạng thái; kiểm tra lại.
7. So sánh repository với `LAST KNOWN REPOSITORY STATE`.
8. Đọc `CURRENT LEARNING CHECKPOINT`; không lặp lại lesson đã pass nếu ticket/scope vẫn
   khớp, không giữ pass nếu chỉ có lời kể chưa quan sát.
9. Đọc `CURRENT OPTIMIZATION CHECKPOINT`; nếu source MVP chưa `VERIFIED` giữ
   `NOT_ELIGIBLE`, nếu đã `VERIFIED` nhưng chưa disposition thì không chọn module phụ
   thuộc.
10. Kết luận:

```text
RESUME_CURRENT_TICKET
REVIEW_SUBMISSION
REMEDIATE_FINDING
VERIFY_EVIDENCE
SELECT_NEXT_TICKET
BLOCKED_NEEDS_CLARIFICATION
```

11. Chọn learning/optimization mode rồi nói ngắn gọn:
   - lần trước đang làm gì;
   - repository hiện cho thấy gì;
   - điểm nào chưa xác minh;
   - bây giờ làm đúng một việc gì.

Nếu laptop bị shutdown giữa chừng:

- `IN_PROGRESS` vẫn là `IN_PROGRESS`;
- command không có completed output phải chạy lại;
- process/service được coi là stopped/unknown;
- uncommitted diff được review trước khi tiếp tục;
- không tự đổi sang `SUBMITTED` hoặc `VERIFIED`.
- learning `IN_PROGRESS` vẫn là `IN_PROGRESS`; câu hỏi chưa có answer không được đổi
  thành `PASSED`.

---

## 10. Session shutdown/update protocol

Trước khi kết thúc phiên, Codex phải cập nhật các phần sau trong file này:

1. `CURRENT STATE`.
2. `CURRENT TICKET`.
3. `CURRENT LEARNING CHECKPOINT`.
4. `CURRENT OPTIMIZATION CHECKPOINT`.
5. `OPEN FINDINGS`.
6. `EVIDENCE INDEX`.
7. `DECISION LOG`.
8. `LAST KNOWN REPOSITORY STATE`.
9. `NEXT BEST ACTION`.
10. `SESSION LOG`.

Quy tắc cập nhật:

- Chỉ ghi observation thật.
- Không xóa lịch sử decision/evidence; append hoặc đánh dấu superseded.
- Không ghi secret/token/password.
- Không tự đánh dấu `VERIFIED`.
- Nếu chưa chạy test, ghi `NOT_RUN`.
- Nếu command bị ngắt, ghi `INTERRUPTED`.
- Nếu output chỉ do user báo, source là `REPORTED`.
- Chỉ lưu learning checkpoint ngắn; không bịa transcript hoặc copy secret/token.
- Không ghi optimization baseline/disposition/pass nếu chưa quan sát workload,
  environment, command và evidence tương ứng.

---

## 11. Status model

Execution status:

```text
NOT_STARTED
IN_PROGRESS
SUBMITTED
BLOCKED
```

Review status:

```text
NOT_REVIEWED
CHANGES_REQUIRED
CONDITIONAL_PASS
VERIFIED
BLOCKED
```

Evidence status:

```text
MISSING
PARTIAL
SUBMITTED
OBSERVED
REJECTED
```

Learning status:

```text
NOT_EVALUATED
IN_PROGRESS
CHANGES_REQUIRED
PASSED
BLOCKED
```

Learning là dimension độc lập. `PASSED` không suy ra DoR `READY`, execution
`IN_PROGRESS`, evidence `OBSERVED` hoặc review `VERIFIED`.

Optimization status:

```text
NOT_ELIGIBLE
NOT_EVALUATED
BASELINE_REQUIRED
BASELINE_OBSERVED
REVIEW_REQUIRED
OPTIMIZATION_REQUIRED
IN_PROGRESS
SUBMITTED
NOT_REQUIRED
DEFERRED_WITH_BUDGET
OPTIMIZED_VERIFIED
BLOCKED
```

Optimization là dimension độc lập. Source MVP chưa `VERIFIED` thì luôn
`NOT_ELIGIBLE`; MVP `VERIFIED` không suy ra `NOT_REQUIRED` hoặc
`OPTIMIZED_VERIFIED`.

`DONE` nếu xuất hiện trong tool/tracker cũ không đồng nghĩa `VERIFIED`.

---

## 12. CURRENT STATE

```yaml
schema_version: 1
project: Movie Ticket Booking Microservices
repository_root: "D:/back-end/EDUCATION-BACKEND/MovieTicketBookingApp"
repository_remote: "https://github.com/vanphutin/movie-ticket-booking-app.git"
current_phase: P0_PROJECT_CONTRACT_AND_FOUNDATION_GATE
current_milestone: M0_CONTRACT_BASELINE
current_capability: CAP-CON-01
current_ticket_id: null
candidate_ticket_id: TKT-W04-D01
execution_status: NOT_STARTED
review_status: BLOCKED
evidence_status: MISSING
evidence_confidence: LOW
blockers:
  - id: FG-001
    reason: Foundation Gate chưa có reviewer evidence trong file này.
remediation_ticket: null
last_completed_ticket: null
last_verified_ticket: null
updated_at: "2026-07-27"
updated_by: "Claude Code (CCR-001..004 APPROVED by Van Phu Tin; PC-2026.2 effective)"
```

---

## 13. CURRENT TICKET

```yaml
ticket_id: null
candidate_ticket_id: TKT-W04-D01
title: Audit Project Contract và Foundation Gate
phase_id: P0
milestone_id: M0
capability_ids:
  - CAP-CON-01
contract_ids:
  - BUS-001
  - ARCH-001
  - ARCH-009
actor: Learner
business_outcome: Có contract baseline rõ trước khi khởi tạo project thật.
learning_outcome: Giải thích được scope, actor, owner, trust boundary và invariant.
learning_gate_id: LG-TKT-W04-D01
learning_gate_status: NOT_EVALUATED
prerequisites:
  - FG-001 must be VERIFIED
scope:
  - Đối chiếu foundation evidence tuần 1–3.
  - Xác nhận actor, MVP, out-of-scope, service/data owner và trust boundary.
  - Ghi mọi requirement conflict hoặc unanswered question.
out_of_scope:
  - Scaffold hoặc code project.
  - Thiết kế chi tiết toàn bộ endpoint.
  - Mở capability Identity implementation.
invariants:
  - Project thật chỉ bắt đầu sau Foundation Gate.
  - Không shared database hoặc cross-service ORM relation.
acceptance_criteria:
  - id: AC-W04-D01-1
    text: Foundation Gate có reviewer verdict và evidence references.
    status: NOT_VERIFIED
  - id: AC-W04-D01-2
    text: Actor, MVP, out-of-scope, owner và trust boundary không còn mâu thuẫn.
    status: NOT_VERIFIED
  - id: AC-W04-D01-3
    text: Unanswered conflict bằng 0 hoặc ticket được BLOCKED rõ lý do.
    status: NOT_VERIFIED
expected_artifacts:
  - Foundation Gate review
  - Project contract review note
  - Evidence manifest
next_ticket_if_verified: TKT-W04-D02
```

Candidate ticket không phải current/authorized ticket. Khi `FG-001` chưa `VERIFIED`,
không active learning gate, design, scaffold hoặc code cho candidate.

---

### 13.1 CURRENT LEARNING CHECKPOINT

```yaml
learning_gate_id: null
ticket_id: null
candidate_learning_gate_id: LG-TKT-W04-D01
mode: null
status: NOT_EVALUATED
topics_presented: []
questions_asked: []
observed_gaps: []
remediation_focus: []
design_unlocked: false
skeleton_unlocked: false
last_observation: null
```

Không đổi candidate learning gate thành active trước khi ticket được authorize. Không
ghi `PASSED` nếu chưa quan sát câu trả lời trong chat.

---

### 13.2 CURRENT OPTIMIZATION CHECKPOINT

```yaml
optimization_review_id: null
module: null
source_mvp_ticket: null
status: NOT_ELIGIBLE
workload: null
baseline_evidence: []
findings: []
decision: null
defer_controls: null
dependency_unlocked: false
last_observation: "No source module exists or is MVP VERIFIED."
```

Không mở optimization trước source module MVP `VERIFIED`. Sau MVP phải review; nếu có
BLOCKER/HIGH thì không được bỏ qua để chuyển module. `NOT_REQUIRED` chỉ hợp lệ khi có
baseline/risk evidence.

---

## 14. OPEN FINDINGS

```yaml
findings:
  - finding_id: FND-CONTEXT-001
    severity: HIGH
    contract_id: FG-001
    file: null
    line: null
    observed_evidence: Không có Foundation Gate evidence được ghi trong file này.
    risk: Codex có thể cho bắt đầu project trước khi foundation đủ điều kiện.
    expected_behavior: Foundation Gate phải được reviewer đánh giá trước TKT-W04-D01.
    directional_fix: Thu thập evidence tuần 1–3 và thực hiện gate review.
    test_required: Review evidence references và capability checklist.
    resolve_condition: FG-001 có verdict VERIFIED với evidence quan sát được.
    status: OPEN
```

---

## 15. EVIDENCE INDEX

```yaml
evidence: []
```

Mỗi evidence record:

```yaml
evidence_id:
ticket_id:
contract_ids: []
acceptance_criteria_ids: []
prediction:
command:
working_directory:
exit_code:
artifact_paths: []
observation:
source: OBSERVED | REPORTED | INFERRED | MISSING
redacted: true
timestamp:
review_status:
```

---

## 16. DECISION LOG

```yaml
decisions:
  - decision_id: DEC-001
    date: "2026-07-23"
    status: ACTIVE
    context: Chương trình cần một file duy nhất để Codex resume/review/decide.
    decision: CODEX-CONTEXT.md là operational handoff và memory file duy nhất người dùng phải cung cấp.
    rejected_alternative: Yêu cầu người dùng tự mang nhiều policy/state/ticket file mỗi phiên.
    trade_off: File dài hơn nhưng portable, self-contained và giảm nguy cơ mất context.
  - decision_id: DEC-002
    date: "2026-07-26"
    status: PROPOSED_IN_CCR_002
    context: Người học cần theory trước code và learning state phải resume được giữa các phiên.
    decision: Dùng learning policy + capability map + 35 ticket projections; dạy và hỏi trực tiếp trong chat trước design/code.
    rejected_alternative: Nhồi toàn bộ giáo trình vào CODEX-CONTEXT.md hoặc để Codex tự chọn topic không có map.
    trade_off: Thêm contract/state cần bảo trì nhưng context gọn, nhất quán và trace được.
  - decision_id: DEC-003
    date: "2026-07-26"
    status: PROPOSED_IN_CCR_003
    context: Module MVP cần đúng trước; sau đó phải đo và không được bỏ qua bottleneck material.
    decision: Dùng independent post-MVP optimization gate sau các D05 vertical slice; BLOCKER/HIGH khóa dependency, MEDIUM chỉ defer có kiểm soát.
    rejected_alternative: Tối ưu trước MVP, gộp optimized vào MVP VERIFIED hoặc dồn mọi optimization sang tuần 9–10.
    trade_off: Thêm baseline/review state sau mỗi module nhưng giữ correctness đơn giản và phát hiện bottleneck gần nơi phát sinh.
```

---

## 17. LAST KNOWN REPOSITORY STATE

```yaml
captured_at: "2026-07-26"
branch: main
head_commit: UNBORN
remote_origin: "https://github.com/vanphutin/movie-ticket-booking-app.git"
working_tree: "Unborn main branch; toàn bộ repository files đang untracked; chưa có commit hoặc push."
changed_files:
  - README.md
  - .gitignore
  - CODEX-CONTEXT.md
  - AI-contracts/
  - docs/
untracked_files:
  - README.md
  - .gitignore
  - CODEX-CONTEXT.md
  - AI-contracts/
  - docs/
commands_running: []
services_running: UNKNOWN
last_test_command: NOT_RUN
last_test_result: NOT_RUN
last_build_command: "node AI-contracts/viewer/build-data.js"
last_build_result: "EXIT_0; compiled 60 files"
notes:
  - "apps/client và apps/server được quan sát là placeholder trống."
  - "Không có package.json, source, migration, test hoặc runtime evidence trong project."
  - "Project đã được tách khỏi Git repository education-backend."
  - "CCR-002 (learning-first) đã được approve 2026-07-27; learning-first layer có hiệu lực."
  - "Viewer server check pass; learning map cover 13 capabilities và 35/35 tickets."
  - "CCR-003 (post-MVP optimization) đã được approve 2026-07-27; mọi module vẫn NOT_ELIGIBLE."
  - "CCR-001 approved 2026-07-27: PC-2026.2 là effective baseline, ADR-001 ACCEPTED. CCR-004 approved 2026-07-26: pricing/endpoint amendments đã áp dụng."
  - "Optimization coverage check pass: 7 gates, 7 D05 sources, 7 NOT_ELIGIBLE initial states, 6 PERF IDs."
  - "Chưa push remote."
  - Codex phải refresh phần này từ repository thực tế trước khi bắt đầu công việc.
```

---

## 18. NEXT BEST ACTION

```yaml
decision: VERIFY_FOUNDATION_GATE
ticket_id: null
candidate_ticket_id: TKT-W04-D01
single_action: Thu thập và review evidence của Foundation Gate FG-001.
reason: Prerequisite chưa VERIFIED; không được code project.
completion_condition: FG-001 có reviewer verdict dựa trên evidence quan sát được.
if_failed: Tạo remediation foundation nhỏ theo capability còn thiếu.
if_verified: Authorize TKT-W04-D01, active LG-TKT-W04-D01 và bắt đầu theory-first; chưa chuyển thẳng sang design hoặc implementation.
```

---

## 19. SESSION LOG

Append một entry mỗi phiên:

```yaml
sessions:
  - session_id: SESSION-001
    started_at: "2026-07-23"
    ended_at: "2026-07-23"
    user_intent: Tạo một file duy nhất giúp Codex resume đúng flow.
    repository_observations:
      - "Branch main at a8fb23a."
      - "Working tree dirty with 121 paths."
      - "No Foundation Gate evidence was observed."
    work_performed:
      - Tạo operational context, contract, state và handoff protocol.
    commands_run:
      - "git branch --show-current"
      - "git rev-parse --short HEAD"
      - "git status --short"
      - "git diff --check -- CODEX-CONTEXT.md"
    files_changed:
      - CODEX-CONTEXT.md
    unresolved:
      - Foundation Gate chưa có evidence.
    final_review_state: BLOCKED
    next_single_action: Review Foundation Gate evidence.
  - session_id: SESSION-002
    started_at: "2026-07-23"
    ended_at: "2026-07-23"
    user_intent: Audit và chuẩn hóa MovieTicketBookingApp làm project thật từ tuần 4.
    repository_observations:
      - "MovieTicketBookingApp ban đầu không có .git riêng và Git command trỏ về education-backend."
      - "mtb.client và mtb.server đều trống."
      - "Không có source, dependency, test, migration hoặc evidence."
    work_performed:
      - "Khởi tạo repository Git độc lập với branch main."
      - "Cấu hình origin tới movie-ticket-booking-app.git."
      - "Tạo README.md và .gitignore."
      - "Chuyển operational handoff CODEX-CONTEXT.md vào project root."
    commands_run:
      - "git init -b main D:/back-end/EDUCATION-BACKEND/MovieTicketBookingApp"
      - "git remote add origin https://github.com/vanphutin/movie-ticket-booking-app.git"
      - "git status --short"
      - "git branch --show-current"
      - "git remote -v"
      - "git ls-remote https://github.com/vanphutin/movie-ticket-booking-app.git"
    files_changed:
      - README.md
      - .gitignore
      - CODEX-CONTEXT.md
    unresolved:
      - "Foundation Gate chưa có evidence."
      - "Remote empty đã được quan sát; chưa push."
      - "Repository chưa có initial commit."
    final_review_state: BLOCKED
    next_single_action: Review Foundation Gate evidence trước khi scaffold hoặc code.
  - session_id: SESSION-003
    started_at: "2026-07-25"
    ended_at: "2026-07-26"
    user_intent: Thêm theory-first learning contracts và sửa operational handoff cho toàn bộ project.
    repository_observations:
      - "Branch main vẫn unborn; toàn bộ repository files đang untracked."
      - "Canonical current ticket là null; TKT-W04-D01 chỉ là candidate vì FG-001 chưa VERIFIED."
      - "Không có source/module runtime, migration hoặc test application."
    work_performed:
      - "Tạo CCR-002 draft, learning-first policy và learning-gate standard."
      - "Tạo capability learning map cho 13 capability."
      - "Tạo ticket learning projection cho 35/35 ticket tuần 4–10."
      - "Tích hợp learning gate vào workflow, DoR/DoD, ticket schema, state và traceability."
      - "Sửa CODEX-CONTEXT.md để dạy/hỏi trong chat, resume checkpoint và phân biệt current/candidate."
      - "Đồng bộ AI-contracts viewer với learning contracts."
    commands_run:
      - "node AI-contracts/viewer/build-data.js"
      - "node AI-contracts/viewer/server.js --check"
      - "rg coverage check cho capability/ticket/learning gate IDs"
      - "git status --short"
      - "git branch --show-current"
      - "git log -5 --oneline"
    files_changed:
      - CODEX-CONTEXT.md
      - AI-contracts/
      - docs/learning-dependency-map-10-weeks.md
    unresolved:
      - "CCR-001 và CCR-002 chưa được reviewer approve."
      - "Foundation Gate FG-001 chưa có observed evidence."
      - "Repository chưa có initial commit."
    final_review_state: BLOCKED
    next_single_action: Review CCR-001/CCR-002 và Foundation Gate; chưa scaffold hoặc code.
  - session_id: SESSION-004
    started_at: "2026-07-26"
    ended_at: "2026-07-26"
    user_intent: Nâng cấp contracts để tối ưu sau MVP/module và không bỏ qua bottleneck bắt buộc.
    repository_observations:
      - "Không có source/module MVP nào tồn tại hoặc VERIFIED."
      - "Optimization trước đây tập trung ở tuần 9–10 và chưa có module-level disposition."
      - "Current ticket vẫn null; FG-001 và contract review vẫn block implementation."
    work_performed:
      - "Tạo CCR-003 draft, post-MVP optimization policy và performance baseline standard."
      - "Tạo optimization review/baseline templates và independent optimization state."
      - "Map 7 optimization gates vào 7 vertical-slice D05 source tickets."
      - "Tích hợp optimization vào workflow, DoR/DoD, testing, security, architecture, remediation, roadmap và next-action."
      - "Sửa CODEX-CONTEXT.md để tách MVP status với optimization status."
      - "Đồng bộ viewer category/data."
    commands_run:
      - "node AI-contracts/viewer/build-data.js"
      - "node AI-contracts/viewer/server.js --check"
      - "Node coverage/state consistency check"
      - "rg unsafe optimization state scan"
      - "git status --short"
    files_changed:
      - CODEX-CONTEXT.md
      - AI-contracts/
    verification:
      - "Viewer compiled 60 files; server check passed."
      - "Optimization check passed: gates=7, sources=7, not_eligible=7, PERF IDs=6."
      - "No NOT_REQUIRED or OPTIMIZED_VERIFIED runtime state was created."
    unresolved:
      - "CCR-001, CCR-002 và CCR-003 chưa được reviewer approve."
      - "Foundation Gate FG-001 chưa có observed evidence."
      - "Repository chưa có initial commit."
    final_review_state: BLOCKED
    next_single_action: Review open CCRs và Foundation Gate; optimization vẫn NOT_ELIGIBLE.
  - session_id: SESSION-005
    started_at: "2026-07-26"
    ended_at: "2026-07-27"
    user_intent: Review contracts, bổ sung lỗ hổng, duyệt toàn bộ CCR và tạo docs viewer hợp nhất.
    repository_observations:
      - "Contracts thiếu pricing, 4 endpoint Must, cancellation policy, retention và check-in scope (drift với docs/)."
      - "Repository vẫn chưa có initial commit; FG-001 vẫn chưa có observed evidence."
    work_performed:
      - "Tạo CCR-004 (pricing/endpoint completeness); reviewer approve 2026-07-26; apply amendments vào contracts/."
      - "Roadmap TKT-W06-D04/TKT-W07-D04 tiêu thụ API-CAT-008..009 và API-BKG-004..005."
      - "Reviewer (Van Phu Tin) approve CCR-001, CCR-002, CCR-003 ngày 2026-07-27."
      - "PC-2026.2 trở thành effective baseline; ADR-001 chuyển ACCEPTED; state/README/project-contract đồng bộ."
      - "Tạo docs-viewer/ (HTML/CSS/JS thuần) xem toàn bộ 104 tài liệu; test parser 14/14 pass."
      - "Tạo 4 initial commits trên main: baseline gốc (4cce10e), AI-contracts (d275f18), docs (71c81af), docs-viewer (7728308)."
    commands_run:
      - "node AI-contracts/viewer/build-data.js"
      - "node docs-viewer/build-data.js"
      - "node --check + parser smoke tests"
      - "git add/commit (4 commits, main)"
    files_changed:
      - AI-contracts/
      - docs-viewer/
      - CODEX-CONTEXT.md
    verification:
      - "QLT-002→QLT-005 reference audit sạch; TEST-004 tồn tại trong 14-testing-rules."
      - "contract-status.yml: 4 CCR APPROVED, open_change_requests rỗng, DRIFT-001..008 resolved/reconciled."
      - "Không runtime state nào chuyển VERIFIED; learning/optimization state không claim interaction."
      - "git log --oneline: 4 commits; git status sạch sau commit."
    unresolved:
      - "Foundation Gate FG-001 chưa có observed evidence."
      - "Chưa có git remote; chưa push."
    final_review_state: BLOCKED
    next_single_action: Thu thập evidence FG-001; nếu VERIFIED thì authorize TKT-W04-D01 và mở LG-TKT-W04-D01 theory-first.
```

---

## 20. Câu lệnh người dùng có thể dùng

Sau khi đưa file này, người dùng chỉ cần nói một trong các câu:

```text
Tiếp tục công việc lần trước.
Hôm trước tôi đang làm gì?
Hôm nay tôi học và làm gì?
Hôm nay tôi cần fix gì?
Review phần tôi vừa code.
Module/tính năng này đã MVP VERIFIED và tối ưu chưa?
Kiểm tra tôi đã đủ điều kiện sang ticket tiếp theo chưa.
Tôi bị tắt máy giữa chừng, hãy phục hồi context.
Cập nhật file context trước khi kết thúc.
```

Codex vẫn phải tuân startup/review/next-action protocol dù người dùng chỉ nói “tiếp tục”.

Khi user hỏi module đã xong/tối ưu chưa, Codex phải trả riêng:

```text
MVP correctness status
Optimization eligibility
Baseline evidence
Optimization disposition
Open bottleneck/severity
Dependency unlocked
Một next action
```
