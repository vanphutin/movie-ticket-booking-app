# Analysis — TKT-W04-D04

- **Actor and business outcome:** Guest, Customer, API consumer and contract reviewer.
  Analyze the reviewed OpenAPI/RBAC boundary for `API-AUTH-001` through
  `API-AUTH-005` before application code exists, so register, login, refresh, logout
  and self-profile behavior can be designed without ambiguity.
- **Scope:**
  - Request, response and common error DTO boundaries.
  - Status, idempotency and deny matrices for the five auth endpoints.
  - Enumeration, mass-assignment and untrusted actor-header threats.
  - Positive and negative contract-test boundaries required by `TKT-W04-D04`.
- **Out of scope:**
  - OpenAPI document creation, controllers, services, guards or application scaffold.
  - Database or token-lifecycle redesign already owned by `TKT-W04-D02` and
    `TKT-W04-D03`.
  - Changing an effective API, security or architecture contract.

## Repository and authority facts

- Effective baseline: `PC-2026.8`.
- Authorized ticket: `TKT-W04-D04`; stage at analysis start: `ANALYSIS`.
- Prerequisite `TKT-W04-D03`: verified and published before D04 authorization.
- Learning gate `LG-TKT-W04-D04`: `PASSED` at `C4_DEFEND`.
- Applicable capability: `CAP-IDN-01`.
- Applicable contracts: `API-AUTH-001` through `API-AUTH-005`,
  `API-COM-001` through `API-COM-006`, `SEC-003`, `ARCH-008`,
  `CCR-006` through `CCR-010`.

## Boundary decisions

1. Every request DTO is a strict allowlist. Unknown fields are rejected rather than
   silently removed. In particular, public callers cannot supply `role`, `roles`,
   `isAdmin`, `status`, `emailVerified`, `userId`, session ownership or token-family
   identity.
2. Request, session response and profile response DTOs are separate types. No
   persistence entity crosses the API boundary.
3. External clients cannot provide trusted actor identity through headers, query or
   body fields. `/me` resolves its actor only from the authenticated context established
   across the client-to-Gateway and Gateway-to-Identity trust boundaries.
4. Password values are never trimmed, lowercased, echoed or included in error details.
   Email comparison may use a normalized representation while responses preserve the
   reviewed public representation.
5. Refresh tokens are opaque to clients. The selected MVP contract carries them in
   request/response JSON because the effective profiles define `RefreshRequest`,
   `LogoutRequest` and `AuthSessionResponse`. A cookie-based contract would require a
   separate CSRF, CORS, cookie-lifecycle and consumer review.
6. Authentication and credential/session failures use neutral public errors.
   Internal detection may distinguish missing accounts, invalid passwords, expired or
   replayed refresh tokens, but the public response must not reveal those distinctions.
7. Register retains the contracted `409` outcome. Its message remains neutral, while
   rate limiting mitigates—but cannot eliminate—the residual enumeration signal from
   the status itself.
8. Logout is replay-safe: repeating logout for an already revoked owned session returns
   `204`. A credential that cannot safely prove the requested session is mapped to a
   neutral `401`, not a response confirming that another actor owns the session.

## Proposed DTO components

### Requests

| Component | Required fields | Validation boundary |
|---|---|---|
| `RegisterRequest` | `email`, `password`, `displayName` | email format and maximum 254 characters; password bounded to 12–128 characters; trimmed display name 1–100 characters; unknown fields rejected |
| `LoginRequest` | `email`, `password` | email format and maximum 254 characters; password non-empty and at most 128 characters; registration minimum is not re-applied to existing credentials |
| `RefreshRequest` | `refreshToken` | opaque non-empty string with bounded size; no actor/session fields |
| `LogoutRequest` | `refreshToken` | opaque non-empty string with bounded size; access-token actor and refresh-session ownership are checked internally |
| `/me` request | none | no body or caller-supplied actor identifier |

The proposed registration minimum of 12 characters is an analysis-level recommendation,
not yet an effective-contract requirement. Design review may select a different minimum
only if it records the usability/security trade-off and keeps an explicit upper bound.

### Responses

`AuthSessionResponse`, used by successful register, login and refresh, contains:

- `accessToken: string`
- `refreshToken: string`
- `tokenType: "Bearer"`
- `expiresIn: integer` in seconds
- `user: SessionUserResponse`

`SessionUserResponse` and `ProfileResponse` expose only:

- `id: uuid`
- `email: string`
- `displayName: string`
- `roles: enum[]`

They never expose password material, token hashes, session-family identifiers, internal
status flags or security implementation details. Successful logout returns `204` with
no response body.

## Common error contract

All errors use the `API-COM-003` envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request is invalid.",
    "requestId": "request-correlation-id",
    "details": {
      "fields": [
        {
          "field": "email",
          "code": "INVALID_FORMAT",
          "message": "Email must be a valid email address."
        }
      ]
    }
  }
}
```

- `details` is optional and is used only where disclosure is safe, principally
  validation failures.
- Field-level codes are bounded to `REQUIRED`, `INVALID_TYPE`, `INVALID_FORMAT`,
  `TOO_SHORT`, `TOO_LONG` and `UNKNOWN_FIELD`.
- Error mapping does not publish framework exception text, submitted password/token
  values, stack traces, SQL errors, internal URLs or secrets.
- Authentication errors do not include field details.

## Status and error matrix

| Endpoint | Success | Validation / request | Authentication / authorization | Conflict | Abuse |
|---|---:|---|---|---|---|
| `POST /auth/register` | `201` | `400 VALIDATION_FAILED`; `400 IDEMPOTENCY_KEY_REQUIRED` | not applicable | `409 REGISTRATION_CONFLICT`; `409 IDEMPOTENCY_KEY_CONFLICT` | `429 RATE_LIMIT_EXCEEDED` |
| `POST /auth/login` | `200` | `400 VALIDATION_FAILED` | `401 INVALID_CREDENTIALS` for every public credential failure | not applicable | `429 RATE_LIMIT_EXCEEDED` |
| `POST /auth/refresh` | `200` | `400 VALIDATION_FAILED` | `401 INVALID_REFRESH_TOKEN` for invalid, expired, revoked or replayed credentials | not applicable | `429 RATE_LIMIT_EXCEEDED` where the reviewed rate policy applies |
| `POST /auth/logout` | `204` | `400 VALIDATION_FAILED` | neutral `401` when credentials cannot prove the owned session; never confirm another actor's session | not applicable | policy-defined |
| `GET /me` | `200` | not applicable | `401 AUTHENTICATION_REQUIRED`, `ACCESS_TOKEN_EXPIRED` or `INVALID_ACCESS_TOKEN` | not applicable | policy-defined |

Unexpected internal failures are normalized to `500 INTERNAL_ERROR`; a temporary
dependency failure may use `503 SERVICE_UNAVAILABLE`. Neither response discloses the
failing dependency or internal topology.

## Idempotency analysis

- Register requires `Idempotency-Key`.
- Same key and same canonical request payload returns the same logical outcome without
  creating a second user or session.
- Same key with a different payload returns `409 IDEMPOTENCY_KEY_CONFLICT`.
- Login has no retry guarantee; a retried login may create a new session.
- Refresh uses the token-rotation boundary established by D03 and must reject reuse.
- Logout is replay-safe and `/me` is a safe read.

The exact persistence model, retention period and concurrency algorithm for idempotency
belong to design/implementation; the externally observable behavior above is the
contract boundary.

## Deny-by-default matrix

| Case | Public result | Required invariant |
|---|---|---|
| Client sends `roles: ["ADMIN"]` during registration | `400 VALIDATION_FAILED` | Unknown/dangerous field rejected |
| Missing, malformed or invalid access token on `/me` | `401` | No profile data returned |
| Client supplies `userId` or `X-User-Id` for `/me` | field/header is never trusted | Actor comes only from authenticated internal context |
| Valid Customer access token asks for another session logout | neutral `401` | No session existence or ownership disclosure |
| Replayed refresh token | neutral `401` | Token family revocation still occurs internally |
| Unknown email versus wrong password at login | identical public `401` shape | No account enumeration through code/message/details |
| Public registration attempts to create Admin | `400` | Public register can create only the allowed Customer role |

## Contract-test plan

1. Validate every success status and response schema, including no body for logout.
2. Validate missing required fields, wrong types, length/format bounds and every
   dangerous unknown field.
3. Assert passwords, token hashes, internal session IDs and stack/internal URLs never
   appear in success or error bodies.
4. Compare nonexistent-email and wrong-password login responses for identical public
   status, code and structural shape.
5. Verify missing, invalid and expired access-token outcomes on `/me`.
6. Verify invalid, expired, revoked and replayed refresh tokens share the neutral public
   error while replay triggers the D03 family-revocation invariant.
7. Verify register idempotency for same-key/same-payload and same-key/different-payload.
8. Verify repeated logout is `204` and cross-actor session attempts disclose no
   ownership information.
9. Send spoofed actor headers and body/query actor identifiers and prove they do not
   change the resolved actor.
10. Validate `requestId` on every error, optional safe validation details and
    normalization of unexpected failures.

The tests above are planned contract cases, not observed runtime evidence. No runnable
application or OpenAPI contract exists in this analysis stage.

## Risks, limitations and design inputs

- Contracted `409` for registration remains an account-enumeration signal even with a
  neutral body; rate limiting and abuse monitoring are required residual controls.
- A JSON-delivered refresh token requires secure client storage. Moving it to an
  `HttpOnly` cookie is a contract change requiring explicit web-client, CSRF, CORS and
  compatibility analysis.
- `ACCESS_TOKEN_EXPIRED` is safe enough to support deterministic refresh behavior
  because it does not reveal account existence; malformed or invalid-signature tokens
  remain `INVALID_ACCESS_TOKEN`.
- Password minimum, exact refresh-token maximum length, rate-limit values and detailed
  OpenAPI examples remain design parameters. They must be fixed before readiness.
- Error codes are stable machine-facing contract values; changing or removing them is a
  compatibility concern under `API-COM-006`.

## Review outcome

- Requirement conflicts: none unresolved.
- Analysis review: accepted by the learner/reviewer in the working session on
  `2026-07-30`.
- Acceptance-criteria coverage:
  - `AC-1`: inputs required to define complete OpenAPI schemas are identified.
  - `AC-2`: authentication, ownership and deny cases are mapped.
  - `AC-3`: positive, negative, spoofing, enumeration and idempotency contract tests are
    planned.
- **Status:** `COMPLETE`.
- **Next lifecycle stage:** `DESIGN`, where the reviewed OpenAPI component definitions,
  design note and expected-files manifest must be created.
