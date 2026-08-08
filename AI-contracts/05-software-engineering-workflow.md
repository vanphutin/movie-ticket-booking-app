# Software Engineering workflow

## LE-0 — Inspect & Route

Đọc canonical state, `CODEX-CONTEXT.md` và repository thật; chọn đúng current
ticket/finding/evidence gap. Chọn một learning mode theo `19-learning-first-policy.md`:
`FULL_THEORY_FIRST`, `RECALL_CHECK`, `TARGETED_REMEDIATION_THEORY` hoặc
`NO_NEW_THEORY`.

## LE-1 — Teach

Dạy trực tiếp trong chat bằng tiếng Việt theo current business problem:
problem → what → why → owner/when → flow → failure/security → project application.
Chỉ dùng topic từ capability/ticket learning map và observed gap.

## LE-2 — Check understanding

Hỏi 3–5 câu trong chat rồi chờ người học. Gate kiểm tra mental model, invariant/owner,
failure/security và cách áp dụng; không kiểm tra học thuộc syntax.

## LE-3 — Remediate or Unlock

Trả lời sai thì chỉ rõ misconception, dạy lại phần đó và hỏi lại 1–3 câu tương đương.
Chỉ ghi `PASSED` từ câu trả lời đã quan sát. Learning pass không tự mở DoR, execution
hoặc review.

## SE-1 — Analyze & Clarify

Ghi actor/outcome, problem, scope/non-scope, assumption, invariant, dependency, failure/security case, contract IDs và câu hỏi. Chưa đạt DoR thì `BLOCKED`, không code.

## SE-2 — Design & Contract

Tạo design note; API/data/event delta; service owner và Clean Architecture
layer/port/adapter impact; sequence/state/ERD khi cần; chọn phương án và ít nhất một
phương án loại; trade-off; test matrix; migration/compatibility/rollback; expected
files. Contract delta phải được review trước implementation. Planned path/tooling không
được trình bày như repository fact.

## SE-3 — Implement & Self-review

Feature branch, diff nhỏ đúng scope, commit có chủ đích, dependency direction theo
`ARCH-017..026`, migration và tests theo risk, security/observability, self-review,
docs/traceability. Debug theo hypothesis → prediction → experiment → observation; không sửa ngẫu nhiên.

Self-review MUST include the `CCR-011` code-comment review for every authored or
materially modified application-code unit. Record `COMMENTS_ADDED`,
`COMMENTS_NOT_REQUIRED`, `COMMENTS_UPDATED` or `STALE_COMMENTS_REMOVED` with a concise
reason. Comments preserve non-obvious intent, invariants and safety constraints; they do
not narrate obvious code or replace executable checks and tests.

Nếu người học yêu cầu hỗ trợ bắt đầu code, Codex chỉ tạo skeleton/TODO khi learning
`PASSED`, SE-1 complete, SE-2 reviewed và DoR `READY`; boundary skeleton tuân theo
`19-learning-first-policy.md`.

## SE-4 — Verify, Review & Decide

Ghi prediction trước command, command/exit code/observation thật, positive + negative/failure case, evidence manifest, PR-style review và feedback resolution. Reviewer trả đúng một trạng thái rồi mới chọn một next action.

## OP-0 — Eligibility & Classification

Chỉ bắt đầu sau source module MVP `VERIFIED`. Phân loại gap thành
`CORRECTNESS_OR_SAFETY_REMEDIATION` hoặc `POST_MVP_OPTIMIZATION`. Loại đầu quay lại
remediation bình thường và không được coi MVP đã hoàn tất.

## OP-1 — Budget & Baseline

Khóa workload, environment, dataset, warmup, concurrency/iterations, metric, threshold,
invariant guards và limitations theo `22-performance-baseline-standard.md`; sau đó mới
chạy baseline và lưu evidence thật.

## OP-2 — Review & Decide

Chọn đúng một disposition: `NOT_REQUIRED`, `OPTIMIZATION_REQUIRED`,
`DEFERRED_WITH_BUDGET` hoặc `BLOCKED`. `NOT_REQUIRED` cần evidence; BLOCKER/HIGH không
được defer.

## OP-3 — Optimize

Tạo optimization ticket nhỏ cho đúng một bottleneck hoặc nhóm cùng nguyên nhân. Ghi
selected/rejected option, trade-off, rollback và expected before/after; không thêm feature.

## OP-4 — Regression & Verify

Đo lại trong điều kiện so sánh được và chạy functional/failure/security/invariant
regression. Chỉ `OPTIMIZED_VERIFIED` khi đạt budget/approved outcome và không có
regression bị cấm.
