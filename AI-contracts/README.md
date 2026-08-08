# AI control plane — Movie Ticket Booking delivery

Thư mục này là nguồn sự thật chuẩn cho cách AI và học viên điều hành project Movie Ticket Booking từ tuần 4. Tuần 1–3 vẫn theo tài liệu foundation hiện hữu và không được dùng để khởi tạo project thật.

## Trạng thái baseline

<!-- GENERATED:CURRENT-STATUS:START -->
- Baseline đang có hiệu lực: `PC-2026.8` — `APPROVED_FOR_TRAINING`.
- Ticket hiện tại: `TKT-W04-D03`; candidate: `TKT-W04-D04`.
- Stage hiện tại: `HANDOFF`; next action: `PUBLISH_WORK_UNIT_CHECKPOINT`.
- Open change requests: không có.
- Approved change requests: `CCR-001` đến `CCR-010`.
<!-- GENERATED:CURRENT-STATUS:END -->

Foundation Gate `FG-001` đã được reviewer xác minh trước khi `TKT-W04-D01` được hoàn
thành và `TKT-W04-D02` được authorize. Repository chưa có source/module root; mọi topology
filesystem và application tooling command vẫn là quyết định dự kiến.

Draft policy không có hiệu lực chỉ vì file đã tồn tại. Reviewer phải duyệt CCR liên quan và cập
nhật `state/contract-status.yml`; Foundation Gate là gate riêng và vẫn phải được xác minh.

## Thứ tự đọc bắt buộc

1. `00-operating-policy.md`
2. `02-source-of-truth.md`
3. `03-project-contract.md` và `changes/` đang mở
4. `state/README.md`, `state/current-work.yml`, `state/contract-status.yml`
5. `19-learning-first-policy.md`, `20-learning-gate-standard.md`,
   `learning/decision-learning-standard.md`, capability lesson specs, retention map và
   reference profiles
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

Control-plane có validator Node.js không dùng dependency:

```text
node tools/control-plane/sync-control-plane.mjs
node tools/control-plane/sync-control-plane.mjs --check
node tools/control-plane/validate-control-plane.mjs
node tools/repository/validate-repository.mjs
node tools/control-plane/test-consistency.mjs
node tools/repository/install-git-hooks.mjs
```

Đây không phải command format/lint/test của application. Repository vẫn chưa có project
tooling hoặc source module được scaffold. Validator kiểm tra:

- canonical current-work và compatibility projection không drift;
- effective baseline, current/candidate ticket và current stage;
- chỉ có một next action;
- implementation không được mở trước readiness;
- Foundation Gate chưa verified thì không có authorized ticket;
- handoff context trùng canonical state.
- generated projections và vùng Markdown hiện hành trùng canonical state;
- local Markdown/HTML/CSS reference không trỏ tới target hiện hành bị thiếu;
- Git hook và CI chạy lại cùng consistency boundary mà không tự commit thay đổi.

Khi source/module root được scaffold bởi ticket đã đạt DoR, coding guideline và command
format/lint/test mới được tạo tại module root bằng một CCR hoặc design decision được review.
