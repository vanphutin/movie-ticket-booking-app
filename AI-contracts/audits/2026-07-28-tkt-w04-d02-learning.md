# Learning Checkpoint — LG-TKT-W04-D02

```yaml
ticket_id: TKT-W04-D02
gate_id: LG-TKT-W04-D02
capability_id: CAP-IDN-01
target_level: C3_INTEGRATE
mode: FULL_THEORY_FIRST
status: PASSED
presented_at: "2026-07-28"
answered_at: "2026-07-28"
topics_presented:
  - identity versus credential versus session
  - password hashing versus token hashing
  - refresh session lifecycle and token rotation replay detection
  - duplicate email handling and database unique constraints
decision_comparison:
  selected: bcrypt/Argon2id slow password hash + SHA-256 fast token hash + rotated refresh token with family revocation on replay + DB unique constraint on email
  rejected: plaintext credentials, fixed refresh tokens, application-only uniqueness checks
  trade_off: CPU/memory cost for password verification, database lookup overhead on token refresh, mandatory session cleanup machinery
  limitation: fast hash assumes tokens maintain 256-bit cryptographically secure entropy
  change_condition: reconsider fast token hashing if low-entropy or short human-entered tokens are ever introduced
questions_asked: [Q1_EXPLAIN, Q2_COMPARE, Q3_APPLY, Q4_FAILURE]
answers_observed:
  - Q1: Identified Identity (user existence), Session (cookie/token bounded lifecycle) and Credential security invariant (must not be exposed in HTTP/JWT to prevent credential compromise).
  - Q2: Correctly explained password slow hashing to delay offline cracking if DB leaks vs token high entropy fast hashing to optimize I/O and CPU.
  - Q3: Correctly identified immediate token family/session revocation for all devices upon detecting replay of revoked refresh token.
  - Q4: Correctly selected PostgreSQL Unique Constraint to handle concurrent registration race conditions.
observed_gaps: []
verdict: PASSED
design_unlocked: false
```

## Reviewer observation

All four dimensions met `C3_INTEGRATE`. The learner correctly differentiated password slow hashing vs token fast hashing trade-offs, token rotation family revocation on replay attack, and PostgreSQL unique constraint requirement for concurrent email registration.

Learning `PASSED` unlocks `ANALYSIS` stage for `TKT-W04-D02`; it does not unlock design or implementation until Analysis, Design, and Readiness gates pass.

Reference: OWASP Authentication Cheat Sheet — <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
Reference: OWASP Session Management Cheat Sheet — <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>
