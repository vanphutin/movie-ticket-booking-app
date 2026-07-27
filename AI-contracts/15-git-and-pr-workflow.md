# Git and PR workflow

## Branch and history

1. Branch theo ticket: `feature/<ticket-id>-slug` hoặc `fix/<ticket-id>-slug`.
2. Commit nhỏ, imperative, dùng Conventional Commits và ghi ticket/contract/evidence
   trong body khi liên quan.
3. Không trộn refactor ngoài scope; không rewrite published evidence/history.
4. Merge/release chỉ sau gate tương ứng.

## Repository commit streams

Mỗi path phải thuộc đúng một stream trước khi stage:

| Stream | Paths |
|---|---|
| `PRODUCT_CODE` | `apps/**`, gồm app source, app config, app test và app migration |
| `PRODUCT_CONTRACT` | effective contracts, approved CCR, contract schema/traceability |
| `CONTROL_PLANE` | policies, state, roadmap, audit, templates, root `AGENTS.md`, `CODEX-CONTEXT.md` |
| `LEARNING` | learning contracts, lab/learning evidence và curriculum |
| `PROJECT_DOCS` | `docs/**`, root README và tài liệu diễn giải |
| `DOCS_TOOLING` | `docs-viewer/**`, `AI-contracts/viewer/**` |
| `REPOSITORY_TOOLING` | root tooling/config và `tools/**` không thuộc app |
| `LOCAL_ONLY` | secret, cache, runtime output, file tạm/machine-specific; không commit |

Path ownership quan trọng hơn extension. File Markdown nằm trong app vẫn là
`PRODUCT_CODE`; generated JavaScript của viewer là `DOCS_TOOLING`.

## Autonomous local commits

Theo CCR-006, Codex được tự quyết định thời điểm tạo **local commit** mà không hỏi lại
từng commit khi tất cả điều kiện sau đạt:

- đúng một outcome và một commit stream;
- mọi staged path được authorized bởi ticket hoặc approved CCR;
- app path nằm trong reviewed expected-files manifest;
- kiểm tra phù hợp đã pass hoặc được báo thật là `NOT_AVAILABLE`/`NOT_RUN` khi contract cho phép;
- staged diff đã review, không secret, conflict marker hay thay đổi user ngoài scope;
- canonical state/projection đã đồng bộ khi bị ảnh hưởng;
- checkpoint có thể hiểu và revert độc lập.

Theo CCR-007, Codex được tự tạo/switch branch `codex/<work-unit>`, non-force push branch
đã verify và tạo/cập nhật Draft PR. Codex không được push trực tiếp `main`, force-push,
auto-merge/merge, tag, release, xóa branch hoặc rewrite published history.

## Autonomous branch and publish

- Branch theo ticket, approved CCR hoặc coherent remediation; không tạo branch theo tên
  thư mục.
- Tạo branch trước khi có product/contract work mới khi đang ở default branch.
- Chỉ push khi branch không phải default, remote đã verify, diff/commits rõ ownership,
  secret review sạch và checks phù hợp pass hoặc limitation được ghi thật.
- Push chỉ fast-forward/non-force và đặt upstream cho branch mới.
- Tạo Draft PR với scope, non-scope, contracts, evidence, limitations và rollback.
- Draft chỉ chuyển ready khi lifecycle gate cho phép; merge luôn cần reviewer quyết định.
- Không dùng quyền publish để mở rộng ticket scope hay vượt learning/design/readiness gate.

## Split and checkpoint rules

- Không trộn `PRODUCT_CODE` với learning/docs/viewer/control-plane không liên quan.
- Một approved CCR có thể commit contract cùng registry/schema tạo thành một atomic change.
- Canonical state, compatibility projections và `CODEX-CONTEXT.md` của cùng transition
  phải nằm cùng `CONTROL_PLANE` commit.
- Generated viewer data đi cùng source docs khi cần artifact dùng ngay; nếu không, dùng
  commit `DOCS_TOOLING` kế tiếp tham chiếu source commit.
- Mixed worktree phải stage bằng explicit path/hunk; không dùng `git add .`.
- Commit tại approved contract rollout, completed stage artifact, verified vertical
  slice/fix hoặc handoff boundary; không commit chỉ vì session kết thúc hoặc file nhiều.

## Stop conditions

Không commit khi contract chưa có approved CCR, path ngoài scope/manifest, verification
product code fail, source/generated drift, có secret/suspicious artifact, ownership thay
đổi user không rõ, hoặc cần discard/rewrite history mới tạo được commit sạch.

## Commit message

```text
<type>(<scope>): <imperative outcome>

Ticket: <ticket-id hoặc none>
Contracts: <contract IDs hoặc approved CCR>
Evidence: <command/artifact hoặc NOT_RUN với lý do>
```

## Pull request

PR dùng template, nêu scope/non-scope, contracts, design, tests, migrations, rollback,
risk và evidence. Self-review staged/final diff trước submit; feedback resolution trỏ
finding/test/commit.
