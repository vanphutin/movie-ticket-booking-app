# Next-task decision policy

Chọn đúng một action đầu tiên thỏa thứ tự:

1. Security/data-loss blocker.
2. Contract violation.
3. Learning remediation đang active cho current ticket/finding.
4. Acceptance criterion chưa đạt.
5. Test/evidence thiếu.
6. Review feedback chưa xử lý.
7. Post-MVP optimization review chưa có disposition.
8. Optimization `BLOCKER/HIGH` hoặc MEDIUM thiếu defer controls.
9. Remediation capability hiện tại.
10. Core ticket tiếp theo có mọi prerequisite và optimization dependency gate hợp lệ.
11. Stretch task.

Nếu chưa `VERIFIED`, tạo một remediation ticket nhỏ theo `17-remediation-policy.md`; không mở feature mới. Nếu đã `VERIFIED`, đọc dependency graph và chọn node cùng phase/capability sequence, trong week scope, không qua freeze, có outcome/evidence rõ.

Ghi quyết định vào `state/next-action.yml` với reason, blocking IDs và source evidence. Không có candidate hợp lệ thì `BLOCKED`, không tự mở scope.

Learning pass không đủ để chọn ticket mới. Nếu chỉ thiếu evidence và không quan sát thấy
concept gap, tiếp tục verification bằng `NO_NEW_THEORY`.

Source module MVP chưa `VERIFIED` thì optimization là `NOT_ELIGIBLE`. Sau MVP
`VERIFIED`, không chọn module phụ thuộc trước khi disposition là `NOT_REQUIRED`,
`OPTIMIZED_VERIFIED` hoặc valid `DEFERRED_WITH_BUDGET`, với unresolved optimization
BLOCKER/HIGH bằng 0.
