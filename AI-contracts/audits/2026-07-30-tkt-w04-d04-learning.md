# Learning Checkpoint — LG-TKT-W04-D04

```yaml
ticket_id: TKT-W04-D04
gate_id: LG-TKT-W04-D04
capability_id: CAP-IDN-01, CAP-SEC-01
target_level: C4_DEFEND
mode: FULL_THEORY_FIRST
status: PASSED
presented_at: "2026-07-30"
answered_at: "2026-07-30"
topics_presented:
  - OpenAPI 3.0/3.1 REST specification for auth APIs
  - Request and Response DTO schemas and Mass Assignment prevention
  - RBAC Deny Matrix and Enumeration attack mitigations
  - Standard Error Response format (API-COM-001..006)
  - OpenAPI Contract Testing design
decision_comparison:
  selected: Deny-by-Default + Strict Schema DTO (whitelist/forbidNonWhitelisted) + Standard Error Envelope + Neutral Auth Failures (401)
  rejected: Allow-by-Default, unvalidated dynamic payloads, detailed login failure messages revealing account existence
  trade_off: Slightly reduced UX specificity on login failure to eliminate User Enumeration risk; upfront OpenAPI/DTO design effort
  limitation: Contract tests must validate negative cases (forbidden fields, missing headers) alongside happy path
  change_condition: Reconsider schema validation if switching to gRPC/Protobuf internal contracts
questions_asked: [Q1_EXPLAIN, Q2_COMPARE, Q3_APPLY, Q4_FAILURE, Q5_DEFEND]
answers_observed:
  - Q1: Correctly explained Deny-by-Default concept and why centralized Gateway/Framework Guards prevent forgotten/inconsistent access checks across routes.
  - Q2: Correctly evaluated UX vs Security trade-off between detailed error messages (Account Enumeration vulnerability) vs generic HTTP 401 response.
  - Q3: Demonstrated correct status code selection for missing token (401), unauthorized resource ownership access (403), and missing/hidden resource (404).
  - Q4: Identified NestJS DTO validation mechanisms (`whitelist: true`, `forbidNonWhitelisted: true`) to prevent Mass Assignment attacks.
  - Q5: Correctly rejected Frontend request to return 404 on invalid login email, upholding security policy and HTTP semantics.
observed_gaps: []
verdict: PASSED
design_unlocked: false
```

## Reviewer observation

All five dimensions met `C4_DEFEND`. The learner demonstrated clear understanding of Deny-by-Default authorization, Mass Assignment prevention via strict DTO validation, HTTP 401/403/404 semantics, and User Enumeration mitigation.

Learning `PASSED` unlocks `ANALYSIS` stage for `TKT-W04-D04`.

Reference: RFC 7519 — JSON Web Token — <https://www.rfc-editor.org/rfc/rfc7519.html>
Reference: OWASP Authorization Cheat Sheet — <https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html>
Reference: OWASP Authentication Cheat Sheet — <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
