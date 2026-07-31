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
13. Code-comment review theo `CCR-011`: required intent, stale/misleading comments và
    TODO/workaround traceability.
14. Learner explanation: decision, alternative, trade-off, limitation.
15. Review status.
16. Một next best action.

Finding dùng template `templates/code-review.md` và phải có ID, severity, violated contract ID, file:line, observed evidence, risk, expected behavior, directional fix, missing test và resolve condition.

Style-only feedback không được che blocker. Không tự bịa line/output, không tự đổi contract, không giao nhiều ticket, không xác nhận test từ lời kể.

Comment finding chỉ hợp lệ khi intent quan trọng không thể hiện đủ qua naming, types,
structure, validation hoặc tests. Không yêu cầu comment lặp cú pháp và không dùng
comment count/density làm quality gate. Misleading comment được xếp severity theo defect
security, data-integrity, compatibility hoặc concurrency mà nó có thể gây ra.
