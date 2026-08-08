# Runtime state model

## Integration state under CCR-013

`integration-state.yml` is the canonical record for the integration base, bootstrap
status and stack-depth policy. While status is `PENDING_BOOTSTRAP`, `develop` creation
and new remote stack layers are prohibited. The existing PR 3 through PR 6 chain is
grandfathered only for the approved merge-first bootstrap and grants no new merge
authority.

A dependent work unit requires its prerequisite to be `VERIFIED`, have all required
checks pass and be squash-merged into `develop`. Independent work units may proceed from
the same fetched `origin/develop`. Missing remote evidence is never treated as success.

State files là machine-readable observation/control records, không phải kế hoạch hoặc
template. Chỉ cập nhật từ evidence, review hoặc explicit decision có nguồn.

## Canonical current work

`current-work.yml` là nguồn điều phối duy nhất cho current stage, authorized/candidate
ticket, blocker, required output và đúng một next action.

- `current-ticket.yml` là projection tương thích cho tracker/tài liệu cũ.
- `next-action.yml` là projection tương thích của `current-work.yml#next_action`.
- `completed_ticket_ids` chỉ ghi ticket có review verdict `VERIFIED` và handoff đã hoàn
  tất; generator dùng danh sách này để đánh dấu tiến độ trực quan, không suy diễn từ
  checkbox hoặc artifact tồn tại.
- Khi projection khác canonical state, delivery work phải dừng để reconcile.
- Chạy `node tools/control-plane/sync-control-plane.mjs` sau khi cập nhật canonical state.
- Chạy `node tools/repository/validate-repository.mjs` sau khi đồng bộ; chế độ kiểm tra
  `node tools/control-plane/sync-control-plane.mjs --check` không ghi file.

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
- Không thêm ticket vào `completed_ticket_ids` nếu thiếu review verdict `VERIFIED` và
  handoff evidence tương ứng.
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

## Coding checkpoint under CCR-012

`current-work.yml#coding_checkpoint` là con trỏ triển khai tùy chọn và phụ thuộc vào
`next_action` cấp ticket. Nó không phải một next action thứ hai và không cấp quyền cho
ticket, file hay hành vi mới.

- Chỉ được có checkpoint khi stage là `IMPLEMENTATION` và `ticket_id` khớp current ticket.
- `allowed_paths` phải là tập con của expected-files manifest đã review của ticket.
- Session làm việc với `apps/**` phải reconcile checkpoint với branch, diff và evidence
  trước khi chọn hoặc thực hiện bước code.
- `done`, `fixed`, checkbox, file tồn tại hoặc chat summary chỉ kích hoạt verification;
  chúng không tự chuyển checkpoint.
- Checkpoint chỉ chuyển từ evidence đã quan sát hoặc explicit reviewer decision.
- Khi checkpoint hợp lệ, session tiếp tục đúng `step_id`; khi drift, dừng code và sửa từ
  authority cao hơn.
- Khi ticket rời implementation, checkpoint phải được xóa. Chỉ một checkpoint được phép
  tồn tại, phù hợp single-active-work rule.

Coding Action Card đầy đủ được dùng khi giao hoặc thay đổi bước; các cập nhật trong cùng
một `step_id` có thể rút gọn. Template chuẩn nằm tại
`AI-contracts/templates/coding-action-card.md`.
