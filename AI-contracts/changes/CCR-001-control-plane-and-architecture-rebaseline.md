# CCR-001 — Control-plane and architecture rebaseline

Status: `APPROVED`  
Proposed baseline: `PC-2026.2`  
Requested at: `2026-07-23`  
Approved at: `2026-07-27` by Van Phu Tin (project owner/reviewer)  
Requested scope: documentation/control plane only; no source scaffold

## Reason

- Canonical docs dùng path `AI/*` không tồn tại thay vì `AI-contracts/*`.
- README mô tả validator scripts chưa tồn tại.
- State chưa diễn đạt candidate ticket bị prerequisite gate chặn.
- Architecture contract thiếu enforceable Clean Architecture boundaries.
- Module roots/tooling chưa tồn tại nhưng quality policy cần phân biệt planned và runnable.

## Proposed changes

- Chuẩn hóa source-of-truth paths.
- Bổ sung explicit baseline lifecycle và state schema.
- Adopt `ADR-001` và `ARCH-017..026`.
- Bổ sung coding-guidelines policy không tạo placeholder command.
- Chuẩn hóa roadmap operating model và templates.

## Compatibility and migration

- Product outcome, service ownership, public endpoint/event inventory và 35 ticket IDs
  được giữ ổn định.
- ID `QLT-002` cũ chuyển thành `QLT-005`; mọi reference phải được audit.
- Runtime state không tự đổi sang `VERIFIED`.
- `PC-2026.1` tiếp tục có hiệu lực cho tới khi CCR được reviewer approve.

## Risk and rollback

- Risk: draft và effective baseline bị hiểu nhầm.
- Control: README, project contract và state ghi cả hai baseline.
- Rollback: reject CCR và revert các proposal-specific clauses; không có data/code migration.

## Review checklist

- [x] Product scope và 35 ticket không bị mở rộng ngầm (ticket IDs giữ nguyên; chỉ CCR-004 mở rộng endpoint qua CCR riêng).
- [x] Architecture boundary đủ kiểm chứng (`ARCH-017..026` đã nằm trong architecture contract).
- [x] Không có command/tooling giả (README ghi rõ chưa có validator executable).
- [x] State không claim evidence hoặc verdict chưa quan sát (không mục nào `VERIFIED`; FG-001 vẫn MISSING).
- [x] Tất cả path/reference tồn tại hoặc được ghi rõ là planned (audit `QLT-002`→`QLT-005` sạch, không còn reference cũ).

## Decision

Reviewer: `Van Phu Tin (project owner)`  
Decision: `APPROVED` — 2026-07-27  
Evidence references: `["AI-contracts/state/contract-status.yml", "review session 2026-07-26/27: QLT-002/QLT-005 reference audit, path existence check"]`
