# Roadmap operating model

Roadmap tuần 4–10 là dependency-driven delivery map, không phải lịch tự động mở ticket.
Ngày/tuần biểu thị learning cadence; gate và evidence quyết định ticket có được bắt đầu.

## Planning levels

`Phase → Milestone → Capability → Daily ticket → Module MVP gate → Optimization review
→ Optimization remediation/defer → Weekly/Release gate`

- Phase gom một business/engineering outcome.
- Milestone là outcome có thể review, không chỉ danh sách artifact.
- Capability có state machine riêng trong `state/capability-status.yml`.
- Daily ticket là đơn vị core work duy nhất được active.
- Remediation sửa đúng một blocker/finding/AC gap, không thêm feature.
- Module optimization review chỉ mở sau source MVP `VERIFIED`; review có thể kết luận
  evidence-backed `NOT_REQUIRED` mà không tạo code ticket.
- Optimization BLOCKER/HIGH khóa dependency; MEDIUM chỉ defer có kiểm soát.
- Gate đánh giá dependency và evidence; không suy từ checkbox.

## Ticket selection

Một ticket chỉ trở thành `current_ticket` khi:

1. Contract baseline liên quan có hiệu lực hoặc ticket chỉ làm contract review.
2. Mọi prerequisite/gate là `VERIFIED`.
3. DoR có đủ actor/outcome/scope/invariant/failure/security/AC/test/evidence.
4. Không có active core ticket khác.
5. Không vi phạm phase/week freeze.
6. Module dependency optimization gate trước đó đã `NOT_REQUIRED`,
   `OPTIMIZED_VERIFIED` hoặc valid `DEFERRED_WITH_BUDGET`, unresolved optimization
   BLOCKER/HIGH bằng 0.

Ticket chưa đủ điều kiện MAY xuất hiện ở `candidate_ticket_id`, nhưng `ticket_id` phải
giữ `null`; candidate không trao quyền implementation.

## Stable sequence

W4 contract/Foundation và Identity/Security; W5 Catalog; W6 scheduling/events; W7
Booking/concurrency; W8 payment/ticket/worker; W9 operations; W10 release.

35 ticket IDs trong `weeks-4-10.md` được giữ ổn định trong proposal `PC-2026.2`. Thay
ID, dependency, business outcome hoặc public contract cần CCR.

## Gate semantics

- `VERIFIED`: mọi AC/evidence/DoD liên quan đạt và BLOCKER/HIGH bằng 0.
- `CONDITIONAL_PASS`: ghi nhận phần đạt nhưng không mở dependency.
- `CHANGES_REQUIRED`: có finding cần sửa.
- `BLOCKED`: thiếu authority/input/prerequisite hoặc có conflict.
