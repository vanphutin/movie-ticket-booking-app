# Runtime state model

State files là machine-readable observation/control records, không phải kế hoạch hoặc
template. Chỉ cập nhật từ evidence, review hoặc explicit decision có nguồn.

## Canonical current work

`current-work.yml` là nguồn điều phối duy nhất cho current stage, authorized/candidate
ticket, blocker, required output và đúng một next action.

- `current-ticket.yml` là projection tương thích cho tracker/tài liệu cũ.
- `next-action.yml` là projection tương thích của `current-work.yml#next_action`.
- Khi projection khác canonical state, delivery work phải dừng để reconcile.
- Chạy `node tools/control-plane/validate-control-plane.mjs` sau khi cập nhật state.

## Independent dimensions

- Definition of Ready: `NOT_EVALUATED | CHANGES_REQUIRED | READY | BLOCKED`
- Execution: `NOT_STARTED | IN_PROGRESS | SUBMITTED | BLOCKED`
- Review: `NOT_REVIEWED | CHANGES_REQUIRED | CONDITIONAL_PASS | VERIFIED | BLOCKED`
- Evidence: `MISSING | PARTIAL | SUBMITTED | OBSERVED | REJECTED`
- Contract: `DRAFT_FOR_REVIEW | IN_REVIEW | APPROVED_FOR_TRAINING | SUPERSEDED | REJECTED`
- Learning: `NOT_EVALUATED | IN_PROGRESS | CHANGES_REQUIRED | PASSED | BLOCKED`
- Optimization:
  `NOT_ELIGIBLE | NOT_EVALUATED | BASELINE_REQUIRED | BASELINE_OBSERVED |
  REVIEW_REQUIRED | OPTIMIZATION_REQUIRED | IN_PROGRESS | SUBMITTED | NOT_REQUIRED |
  DEFERRED_WITH_BUDGET | OPTIMIZED_VERIFIED | BLOCKED`

Learning là dimension độc lập. `PASSED` không suy ra DoR `READY`, execution
`IN_PROGRESS`, evidence `OBSERVED` hoặc review `VERIFIED`.

Optimization là dimension độc lập. Source module MVP chưa `VERIFIED` thì bắt buộc
`NOT_ELIGIBLE`. MVP `VERIFIED` không suy ra `NOT_REQUIRED` hoặc
`OPTIMIZED_VERIFIED`.

Valid main transitions:

```text
FOUNDATION_GATE
  → STARTUP
  → LEARNING
  → ANALYSIS
  → DESIGN
  → READINESS
  → IMPLEMENTATION
  → VERIFICATION
  → REVIEW
  → HANDOFF

NOT_ELIGIBLE → NOT_EVALUATED
NOT_EVALUATED → BASELINE_REQUIRED
BASELINE_REQUIRED → BASELINE_OBSERVED
BASELINE_OBSERVED → REVIEW_REQUIRED
REVIEW_REQUIRED → NOT_REQUIRED | OPTIMIZATION_REQUIRED | DEFERRED_WITH_BUDGET | BLOCKED
OPTIMIZATION_REQUIRED → IN_PROGRESS → SUBMITTED → OPTIMIZED_VERIFIED
```

`BLOCKER/HIGH` không được `DEFERRED_WITH_BUDGET`. MEDIUM chỉ defer khi đủ controls
trong `21-post-mvp-optimization-policy.md`.

## Required artifact gates

| Stage | Artifact/output bắt buộc | Điều kiện chuyển tiếp tối thiểu |
|---|---|---|
| `FOUNDATION_GATE` | Foundation Gate review | `FG-001` có verdict dựa trên evidence |
| `STARTUP` | reconciliation report | state/repository drift đã xử lý hoặc ghi blocker |
| `LEARNING` | learning checkpoint | câu trả lời được quan sát và status `PASSED` |
| `ANALYSIS` | analysis note | không còn requirement conflict chưa xử lý |
| `DESIGN` | design note + expected-files manifest | design được review |
| `READINESS` | readiness verdict | verdict `READY` |
| `IMPLEMENTATION` | scoped diff + self-review | chỉ đổi file được review |
| `VERIFICATION` | evidence manifest | command/output/observation có nguồn |
| `REVIEW` | acceptance review | mọi AC đạt hoặc trả remediation |
| `HANDOFF` | state + context projection | validator pass và có một next action |

## Current versus candidate ticket

- `ticket_id`: ticket đã được authorize và đang là current work.
- `candidate_ticket_id`: next logical ticket chưa đủ prerequisite/DoR.
- Khi Foundation Gate chưa `VERIFIED`, `ticket_id` MUST là `null`; candidate MAY là
  `TKT-W04-D01`.

## Update rules

- Không dùng `DONE`, checkbox hoặc artifact existence để suy ra `VERIFIED`.
- `updated_at/by` chỉ điền khi có update thật; không backfill giả.
- Mỗi blocker/finding/decision có source evidence hoặc ghi rõ `MISSING`.
- Contract draft không tự thay đổi runtime capability/ticket state.
- Không ghi learning `PASSED` nếu không có câu trả lời của người học được quan sát.
- Không ghi optimization `NOT_REQUIRED`/`OPTIMIZED_VERIFIED` nếu thiếu baseline,
  disposition và regression evidence tương ứng.

## Optimization next-action types

Khi post-MVP gate eligible, `state/next-action.yml` MAY dùng:

```text
REVIEW_OPTIMIZATION
RUN_BASELINE
REMEDIATE_OPTIMIZATION
VERIFY_OPTIMIZATION
```

Canonical next action hiện tại không đổi nếu prerequisite cao hơn như contract/Foundation
Gate vẫn đang block.
