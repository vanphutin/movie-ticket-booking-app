# Source of truth

| Concern | Canonical | Projection/reference |
|---|---|---|
| AI behavior | `AI-contracts/00-18` | prompts hoặc hướng dẫn bên ngoài |
| Product/project contract | `AI-contracts/03-project-contract.md`, `AI-contracts/contracts/*` | product backlog, design/database docs |
| Architecture decisions | `AI-contracts/decisions/*` | sơ đồ hoặc note trong ticket |
| Contract changes | `AI-contracts/changes/*` | thảo luận/review bên ngoài |
| Phase/milestone/capability/tickets | `AI-contracts/roadmap/*` | roadmap tuần, study tickets, tracker curriculum |
| Current stage/ticket/blocker/next action | `AI-contracts/state/current-work.yml` | `current-ticket.yml`, `next-action.yml`, `CODEX-CONTEXT.md` |
| Other runtime dimensions | remaining `AI-contracts/state/*` | tracker legacy statuses |
| Learner notes/progress history | SQLite/`tien-do-hoc-tap/progress.json` hiện hữu | tracker UI |
| Evidence rules/manifest | `AI-contracts/08-*`, `AI-contracts/templates/evidence-manifest.yml` | curriculum evidence standard |
| Traceability | `AI-contracts/16-*` + ticket/evidence IDs | traceability projection nếu có |

## Conflict order

Accepted CCR → effective contract baseline → current ticket → code → test/evidence.
Draft CCR hoặc draft contract không ghi đè baseline đang có hiệu lực. Nếu code khác
effective contract, code là chưa đạt. `DONE`/checkbox/link không thắng evidence review.

## Ownership of synchronization

`tools/control-plane/validate-control-plane.mjs` kiểm tra canonical state và các projection
tương thích. Script chỉ đọc control plane; không tự sửa evidence, review verdict,
capability state hoặc progress history.
