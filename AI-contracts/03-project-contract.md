# Project Contract

Contract này khóa MVP và cách delivery tuần 4–10. Chi tiết nằm trong:

- `contracts/product-contract.md`
- `contracts/architecture-contract.md`
- `contracts/api-contracts.md`
- `contracts/data-contracts.md`
- `contracts/event-contracts.md`
- `contracts/security-contract.md`
- `contracts/quality-contract.md`
- `decisions/ADR-001-microservice-clean-architecture.md`
- `18-coding-guidelines-policy.md`
- `19-learning-first-policy.md`
- `20-learning-gate-standard.md`
- `21-post-mvp-optimization-policy.md`
- `22-performance-baseline-standard.md`

Mọi rule normative dùng từ `MUST`, `MUST NOT`, `SHOULD` và có ID. Thay đổi normative phải qua `CCR-*`. Các sơ đồ/backlog cũ giải thích context nhưng không ghi đè ID tại đây.

## Baseline

| Baseline | Trạng thái | Ý nghĩa |
|---|---|---|
| `PC-2026.1` | `SUPERSEDED` | Baseline cũ, được thay thế bởi `PC-2026.2` từ 2026-07-27 |
| `PC-2026.2` | `APPROVED_FOR_TRAINING` | Baseline có hiệu lực: control plane chuẩn hóa + Clean Architecture |

`CCR-001` được `APPROVED` 2026-07-27 nên `PC-2026.2` là baseline có hiệu lực; `ADR-001`
chuyển `ACCEPTED`. `CCR-002` (learning-first) và `CCR-003` (post-MVP optimization gate)
cũng đã `APPROVED` cùng ngày. Effective phase vẫn là `P0`; compatibility là
additive-by-default; project implementation vẫn bị chặn bởi `FG-001`.

`CCR-004` đã được `APPROVED` (2026-07-26): các amendment additive về pricing, endpoint
inventory, cancellation impact, retention và check-in scope đã áp dụng trực tiếp vào
`contracts/` và roadmap ticket liên quan (`TKT-W06-D04`, `TKT-W07-D04`). Chi tiết xem
`changes/CCR-004-pricing-and-endpoint-completeness.md`.
