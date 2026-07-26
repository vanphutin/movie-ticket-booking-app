# Remediation policy

Remediation ID: `REM-<source-ticket>-NN`. Chỉ sửa một blocker/finding/AC gap, giữ cùng phase/capability và contract IDs, tối đa một ngày; không thêm feature. Ticket ghi failure evidence, expected correction, focused test và resolve condition.

Sau submit, chạy lại phần verification liên quan và regression tối thiểu. Source ticket chỉ `VERIFIED` khi remediation và mọi dependency blocking đã `VERIFIED`; conditional evidence không mở downstream core ticket.

Optimization remediation ID: `OPT-<week>-<capability>-NNN`. Chỉ tạo từ observed
`OPTIMIZATION_REQUIRED`; sửa một bottleneck hoặc nhóm cùng nguyên nhân, không thêm
feature. Ticket phải liên kết source baseline, severity, metric/resolve condition,
selected/rejected option, rollback và regression. BLOCKER/HIGH phải resolved trước
dependency; MEDIUM chỉ defer theo đủ controls trong policy `21`.
