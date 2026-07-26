# Security contract

`SEC-001`: Password dùng approved adaptive hash + per-password salt; không encryption/fast hash/plaintext.  
`SEC-002`: Access token short-lived; refresh token stored hashed, rotated, revocable; reuse revokes family.  
`SEC-003`: Authentication failure generic; authorization deny-by-default; resource ownership enforced tại owner service.  
`SEC-004`: Client-supplied actor/service headers untrusted; internal identity authenticated and minimal claims propagated.  
`SEC-005`: DTO allowlist, size/range/format validation và parameterized query; reject unknown dangerous fields.  
`SEC-006`: Secret qua environment/secret store, never repository/evidence/log; rotate on exposure.  
`SEC-007`: Logs/errors redact authorization, cookie, password, token, signature, raw webhook/PII và internal stack/URL.  
`SEC-008`: Webhook verify raw body signature, timestamp tolerance, endpoint secret, event/reference/amount/currency trước transition.  
`SEC-009`: Rate/abuse protection cho login/register/refresh/webhook/expensive search; bounded payload/pagination.  
`SEC-010`: TLS outside local-only boundary; CORS explicit allowlist; secure cookie flags khi cookie dùng.  
`SEC-011`: Dependency/secret scan là release evidence nhưng không thay threat model/manual review.  
`SEC-012`: Security finding BLOCKER/HIGH phải resolved trước dependent ticket/release.
