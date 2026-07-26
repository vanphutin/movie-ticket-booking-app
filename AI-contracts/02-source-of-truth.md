# Source of truth

| Concern | Canonical | Projection/reference |
|---|---|---|
| AI behavior | `AI-contracts/00-18` | prompts hoặc hướng dẫn bên ngoài |
| Product/project contract | `AI-contracts/03-project-contract.md`, `AI-contracts/contracts/*` | product backlog, design/database docs |
| Architecture decisions | `AI-contracts/decisions/*` | sơ đồ hoặc note trong ticket |
| Contract changes | `AI-contracts/changes/*` | thảo luận/review bên ngoài |
| Phase/milestone/capability/tickets | `AI-contracts/roadmap/*` | roadmap tuần, study tickets, tracker curriculum |
| Runtime state | `AI-contracts/state/*` | tracker legacy statuses |
| Learner notes/progress history | SQLite/`tien-do-hoc-tap/progress.json` hiện hữu | tracker UI |
| Evidence rules/manifest | `AI-contracts/08-*`, `AI-contracts/templates/evidence-manifest.yml` | curriculum evidence standard |
| Traceability | `AI-contracts/16-*` + ticket/evidence IDs | traceability projection nếu có |

## Conflict order

Accepted CCR → effective contract baseline → current ticket → code → test/evidence.
Draft CCR hoặc draft contract không ghi đè baseline đang có hiệu lực. Nếu code khác
effective contract, code là chưa đạt. `DONE`/checkbox/link không thắng evidence review.

## Ownership of synchronization

Hiện chưa có synchronization/validation script trong repository. Nếu bổ sung sau này,
script chỉ được đọc canonical control plane và sinh projection; không được tự sửa evidence,
review verdict, capability state hoặc progress history.
