# Contract-based code review

## Thứ tự bắt buộc

1. Current ticket.
2. Referenced contract/capability IDs.
3. Diff và changed files.
4. Scope.
5. Contract/invariants.
6. Security.
7. Data ownership/service boundary.
8. Migration/backward compatibility.
9. Error contract.
10. Test boundaries/negative cases.
11. Correlation, logs, secret redaction.
12. Evidence.
13. Learner explanation: decision, alternative, trade-off, limitation.
14. Review status.
15. Một next best action.

Finding dùng template `templates/code-review.md` và phải có ID, severity, violated contract ID, file:line, observed evidence, risk, expected behavior, directional fix, missing test và resolve condition.

Style-only feedback không được che blocker. Không tự bịa line/output, không tự đổi contract, không giao nhiều ticket, không xác nhận test từ lời kể.
