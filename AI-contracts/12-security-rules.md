# Security rules

Normative security contract nằm ở `contracts/security-contract.md`. Mỗi review bắt buộc kiểm tra authentication/authorization, untrusted input, least privilege, service trust, secret/PII storage/logging, token/session lifecycle, webhook signature, rate/abuse controls và error disclosure.

Security hoặc data-loss blocker luôn thắng thứ tự next action; không được hạ severity để giữ tiến độ.

Optimization không được giảm password-hash/security budget, bỏ validation/authz/signature
verification, cache sensitive data trái policy, log thêm secret/PII để profiling hoặc
đổi security BLOCKER thành performance debt.
