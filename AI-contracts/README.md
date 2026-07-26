# AI control plane — Movie Ticket Booking delivery

Thư mục này là nguồn sự thật chuẩn cho cách AI và học viên điều hành project Movie Ticket Booking từ tuần 4. Tuần 1–3 vẫn theo tài liệu foundation hiện hữu và không được dùng để khởi tạo project thật.

## Trạng thái baseline

- Baseline đang có hiệu lực: `PC-2026.2` — `APPROVED_FOR_TRAINING` (từ 2026-07-27; thay thế `PC-2026.1`).
- Open change requests: không còn.
- Approved change requests:
  - `changes/CCR-001-control-plane-and-architecture-rebaseline.md` — approved 2026-07-27; `PC-2026.2` có hiệu lực, `ADR-001` chuyển `ACCEPTED`.
  - `changes/CCR-002-learning-first-control-plane.md` — approved 2026-07-27; learning-first layer có hiệu lực.
  - `changes/CCR-003-post-mvp-optimization-gate.md` — approved 2026-07-27; optimization gate có hiệu lực, mọi module vẫn `NOT_ELIGIBLE`.
  - `changes/CCR-004-pricing-and-endpoint-completeness.md` — approved 2026-07-26; amendments đã apply vào `contracts/`.
- Foundation Gate `FG-001`: chưa có evidence được reviewer quan sát — tuần 4 vẫn bị chặn.
- Chưa có source/module root; mọi topology và tooling command vẫn là quyết định dự kiến.

Draft policy không có hiệu lực chỉ vì file đã tồn tại. Reviewer phải duyệt CCR liên quan và cập
nhật `state/contract-status.yml`; Foundation Gate là gate riêng và vẫn phải được xác minh.

## Thứ tự đọc bắt buộc

1. `00-operating-policy.md`
2. `02-source-of-truth.md`
3. `03-project-contract.md` và `changes/` đang mở
4. `state/README.md`, `state/contract-status.yml`, `state/current-ticket.yml`
5. `19-learning-first-policy.md`, `20-learning-gate-standard.md` và `learning/`
6. các technical contract IDs trong `contract_ids` và `capability_ids`
7. `21-post-mvp-optimization-policy.md`, `22-performance-baseline-standard.md` và
   `state/optimization-status.yml`
8. ticket tương ứng trong `roadmap/weeks-4-10.md`
9. `05-software-engineering-workflow.md`
10. `07-code-review-policy.md` và `08-evidence-and-verification-policy.md`
11. `09-next-task-decision-policy.md`

Không có `current-ticket`, AI chỉ được chọn ticket đầu tiên có prerequisite `VERIFIED`; không được suy đoán tiến độ từ checkbox, `DONE`, nội dung học viên tự khai hoặc file mẫu.

## Các lớp tài liệu

- `contracts/`: product, architecture, API, data, event, security và quality contract.
- `decisions/`: quyết định kiến trúc đang áp dụng hoặc chờ review.
- `changes/`: CCR thay đổi baseline; chỉ `APPROVED` mới có hiệu lực.
- `roadmap/`: operating model, phase, milestone, capability, dependency và 35 daily ticket.
- `templates/`: artifact học viên/reviewer phải tạo.
- `learning/`: capability concept map và projection learning gate cho 35 ticket.
- `state/`: trạng thái machine-readable; ban đầu không có mục nào `VERIFIED`.
- `00`–`22`: policy điều hành, learning, optimization, review, gate, evidence, security, testing, git và remediation.

## Trạng thái

`NOT_STARTED → IN_PROGRESS → SUBMITTED → CHANGES_REQUIRED | CONDITIONAL_PASS | VERIFIED`

`BLOCKED` có thể xảy ra ở mọi bước. `DONE` cũ trong tracker chỉ là completion signal tương thích ngược, không đồng nghĩa `VERIFIED`. UI có thể hiển thị nhãn `CONDITIONAL`, nhưng canonical review value là `CONDITIONAL_PASS`.

## Validation hiện có

Repository hiện **chưa có validator executable** và chưa có project tooling. Vì vậy,
không được mô tả các lệnh validator giả là runnable. Trước khi validator được triển khai,
reviewer kiểm tra thủ công:

- ID/reference và đường dẫn tồn tại.
- Trạng thái chỉ dùng value trong `state/README.md`.
- Ticket dependency không mở qua `BLOCKED`/`CONDITIONAL_PASS`.
- Mọi claim `OBSERVED` có evidence reference.

Khi source/module root được scaffold bởi ticket đã đạt DoR, coding guideline và command
format/lint/test mới được tạo tại module root bằng một CCR hoặc design decision được review.
