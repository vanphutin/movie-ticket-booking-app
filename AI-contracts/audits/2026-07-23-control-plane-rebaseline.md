# Audit — PC-2026.2 control-plane rebaseline

Status: `SUBMITTED_FOR_REVIEW`  
Scope: `AI-contracts/**` only  
Source code changes: none

## Goal

Phân tích Movie Ticket Booking control plane và đề xuất lại contract, roadmap, state,
template theo microservice Clean Architecture mà không scaffold source hoặc giả tooling.

## Assumptions and constraints

- Logical topology: Gateway, Identity, Catalog, Booking, Worker.
- Filesystem/module roots chưa khóa.
- Planned stack: TypeScript + NestJS; planned quality tools: Prettier, ESLint, Jest.
- `FG-001` và runtime evidence vẫn `MISSING`.
- `PC-2026.1` còn hiệu lực cho tới khi `CCR-001` được approve.

## Research

- Module scanner quan sát `modules: []`; không có project marker hoặc runnable commands.
- `README.md` xác nhận source chưa scaffold.
- `AI-contracts/README.md` trước audit tham chiếu hai validator scripts không tồn tại.
- `02-source-of-truth.md` và `quality-contract.md` dùng path `AI/*` không tồn tại.
- `state/current-ticket.yml` không có current ticket; `CODEX-CONTEXT.md` bên ngoài
  control plane project `TKT-W04-D01` như current work.
- Architecture đã có service/data ownership nhưng thiếu layer/port/adapter rules.

## Analysis and decision

### Considered options

1. Chỉ sửa path/state drift: ít thay đổi nhưng không giải quyết architecture/tooling ambiguity.
2. Rebaseline control plane và giữ roadmap IDs: cải thiện enforceability, hạn chế migration.
3. Thay toàn bộ roadmap/ticket IDs: sạch về hình thức nhưng phá traceability không cần thiết.

Chọn phương án 2 kết hợp yêu cầu redesign: giữ 35 ticket IDs/outcomes, thiết kế lại
operating model, state semantics, architecture rules và templates. Proposal được quản lý
bằng `CCR-001`; không tự approve.

## Q&A results

- Scope: redesign contract, roadmap, state và templates.
- Module roots: chưa khóa; chưa tạo nested `AGENTS.md`.
- Architecture: Clean Architecture chuẩn microservice.
- Tooling: ghi planned TypeScript/NestJS + Prettier/ESLint/Jest, không tạo config/command giả.
- Non-goal: không sửa/scaffold code.

## Files and outcomes

- Baseline/change lifecycle: `README.md`, `03-project-contract.md`, `changes/CCR-001-*`.
- Architecture: `contracts/architecture-contract.md`, `13-architecture-rules.md`,
  `decisions/ADR-001-*`.
- Coding guidelines: `18-coding-guidelines-policy.md`, `contracts/quality-contract.md`.
- Roadmap: `roadmap/operating-model.md`, dependency/phase/milestone clarifications.
- State: `state/README.md`; effective/proposed baseline; current versus candidate ticket.
- Templates: architecture impact, repository facts, tooling availability và gate inputs.

## Risks

- Draft clauses có thể bị hiểu là effective; mitigated bằng effective/proposed fields.
- External `CODEX-CONTEXT.md` vẫn drift; ghi `DRIFT-003`, chưa sửa ngoài scope.
- Không có executable validator; consistency review hiện là manual/static.

## Review required

1. Review và approve/reject `CCR-001`.
2. Nếu approve, promote `PC-2026.2` theo contract-change policy.
3. Thu thập evidence cho `FG-001`.
4. Chỉ sau đó đánh giá DoR của candidate `TKT-W04-D01`.
