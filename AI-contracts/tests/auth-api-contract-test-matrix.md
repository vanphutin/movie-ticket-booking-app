# Auth API Contract Test Matrix — TKT-W04-D04

## Boundary

This matrix plans contract verification for `API-AUTH-001` through `API-AUTH-005`.
It does not report runtime test execution. Runtime implementation and NestJS test code
belong to `TKT-W04-D05`.

Contract under test:
`AI-contracts/openapi/auth-api.v1.yaml`.

## Acceptance-criteria map

| Acceptance criterion | Planned proof |
|---|---|
| `AC-W04-D04-1` — complete OpenAPI schemas | `OA-*`, `REG-*`, `LOG-*`, `REF-*`, `OUT-*`, `ME-*`, `ERR-*` |
| `AC-W04-D04-2` — deny matrix | `SEC-*`, neutral authentication/session failures and strict unknown-field cases |
| `AC-W04-D04-3` — contract tests planned | Every row below has a prediction and verification boundary |

## Static OpenAPI checks

| ID | Prediction | Verification boundary |
|---|---|---|
| `OA-001` | The document parses as OpenAPI 3.1 and every local `$ref` resolves. | OpenAPI parser plus reference resolver; non-zero exit on error |
| `OA-002` | Exactly five operations exist with unique IDs `registerCustomer`, `loginCustomer`, `refreshSession`, `logoutSession`, `getMyProfile`. | Inspect parsed paths/operations |
| `OA-003` | Register/login/refresh/logout explicitly use `security: []`; `/me` requires `bearerAuth`. | Parsed operation security declarations |
| `OA-004` | Every request object uses `additionalProperties: false` and contains no role, status, verification, user/session or family assignment field. | Schema inspection assertions |
| `OA-005` | Every documented non-empty error response references `ErrorResponse`; logout `204` has no content. | Response and schema-reference assertions |
| `OA-006` | Register declares required `Idempotency-Key`; `429` declares `Retry-After`; all responses declare `X-Request-Id`. | Parameter/header assertions |
| `OA-007` | All schema examples validate against their referenced schemas. | OpenAPI example/schema validator |

## Register — `API-AUTH-001`

| ID | Fixture/scenario | Predicted result and assertion |
|---|---|---|
| `REG-001` | Valid email, 12–128 character password, trimmed non-empty display name and a new valid idempotency key | `201`; body matches `AuthSessionResponse`; role is `CUSTOMER`; no password/hash/internal session fields |
| `REG-002` | Password length 11 | `400 VALIDATION_FAILED`; safe `TOO_SHORT` violation |
| `REG-003` | Password length 129 | `400 VALIDATION_FAILED`; safe `TOO_LONG` violation |
| `REG-004` | Missing email, password or display name | `400 VALIDATION_FAILED`; deterministic `REQUIRED` violations |
| `REG-005` | Invalid email or email longer than 254 characters | `400 VALIDATION_FAILED`; `INVALID_FORMAT` or `TOO_LONG` |
| `REG-006` | Display name becomes empty after trim or exceeds 100 characters | `400 VALIDATION_FAILED` |
| `REG-007` | Body contains `roles`, `isAdmin`, `status`, `emailVerified` or `userId` | `400 VALIDATION_FAILED`; each dangerous field is `UNKNOWN_FIELD`; no assignment occurs |
| `REG-008` | Missing, too short, too long or invalid-character idempotency key | `400 IDEMPOTENCY_KEY_REQUIRED` when absent; invalid present values map through bounded request validation |
| `REG-009` | Same key and same canonical DTO after email/display-name normalization | Same logical `201` outcome; exactly one user and session effect; original encrypted response is replayed |
| `REG-010` | Same key with a different canonical payload | `409 IDEMPOTENCY_KEY_CONFLICT`; no second effect |
| `REG-011` | Different key with an already registered canonical email | `409 REGISTRATION_CONFLICT`; no field/account detail |
| `REG-012` | Two concurrent requests with the same key/payload | At most one registration effect; both successful observations resolve to the same logical outcome |
| `REG-013` | Commit succeeds but the first response is lost, then the client retries | Retry returns the completed logical outcome without creating another user/session |
| `REG-014` | `text/plain` or another unsupported request media type | `415 UNSUPPORTED_MEDIA_TYPE` |
| `REG-015` | Malformed JSON | `400 MALFORMED_JSON`; no parser/stack detail |
| `REG-016` | Abuse threshold exceeded | `429 RATE_LIMIT_EXCEEDED` with integer `Retry-After` and no account/quota detail |

## Login — `API-AUTH-002`

| ID | Fixture/scenario | Predicted result and assertion |
|---|---|---|
| `LOG-001` | Valid canonical email and correct password | `200 AuthSessionResponse` |
| `LOG-002` | Password length 1 for an existing legacy credential | Request passes schema validation; authentication outcome is decided by credential verification |
| `LOG-003` | Empty or longer-than-128 password | `400 VALIDATION_FAILED` |
| `LOG-004` | Unknown email | `401 INVALID_CREDENTIALS`, without `details` |
| `LOG-005` | Existing email with wrong password | Status, code, message and structural shape equal `LOG-004` |
| `LOG-006` | Body includes actor, role, status or another unknown field | `400 VALIDATION_FAILED`; no mass assignment |
| `LOG-007` | Unsupported media type or malformed JSON | Normalized `415` or `400`, never framework text |
| `LOG-008` | Abuse threshold exceeded | `429` with `Retry-After`; response does not prove account existence |

## Refresh — `API-AUTH-003`

| ID | Fixture/scenario | Predicted result and assertion |
|---|---|---|
| `REF-001` | Active refresh token | `200 AuthSessionResponse`; both credentials are new; old refresh token is consumed |
| `REF-002` | Missing, empty or longer-than-2048 token | `400 VALIDATION_FAILED` |
| `REF-003` | Random/malformed token | `401 INVALID_REFRESH_TOKEN`, no `details` |
| `REF-004` | Expired token | Public response equals the neutral `REF-003` shape |
| `REF-005` | Revoked token | Public response equals the neutral `REF-003` shape |
| `REF-006` | Previously rotated token is replayed | Public response equals `REF-003`; internal family-revocation invariant is asserted at the real integration boundary in D05 |
| `REF-007` | A token from the newly revoked family is presented after `REF-006` | `401 INVALID_REFRESH_TOKEN` |
| `REF-008` | Body includes `userId`, `sessionId`, `familyId` or access token | `400 VALIDATION_FAILED`; caller cannot select actor/session |
| `REF-009` | Unsupported media type, malformed JSON or abuse threshold | Normalized `415`, `400` or `429` with required headers |

## Logout — `API-AUTH-004`

| ID | Fixture/scenario | Predicted result and assertion |
|---|---|---|
| `OUT-001` | Active refresh credential without an access token | Session revoked; `204`; empty body |
| `OUT-002` | Repeat `OUT-001` inside the revocation retention window | Replay-safe `204`; no additional effect; empty body |
| `OUT-003` | Access token is expired or absent but refresh credential is valid | Same `204` outcome; logout has no Bearer dependency |
| `OUT-004` | Random/malformed, expired or unrecognized refresh credential | Neutral `401 INVALID_REFRESH_TOKEN`; no ownership/existence detail |
| `OUT-005` | Missing, empty or oversized refresh credential | `400 VALIDATION_FAILED` |
| `OUT-006` | Body includes actor/session selector fields | `400 VALIDATION_FAILED`; no selected-session revocation |
| `OUT-007` | Successful `204` response | `X-Request-Id` exists; no response `content` or JSON body |
| `OUT-008` | Unsupported content type or malformed JSON | Normalized `415` or `400` |

## Self-profile — `API-AUTH-005`

| ID | Fixture/scenario | Predicted result and assertion |
|---|---|---|
| `ME-001` | Valid Bearer access token | `200 ProfileResponse` for the authenticated actor only |
| `ME-002` | Missing Bearer credential | `401 AUTHENTICATION_REQUIRED` |
| `ME-003` | Expired, otherwise valid access token | `401 ACCESS_TOKEN_EXPIRED` |
| `ME-004` | Malformed or invalid-signature token | `401 INVALID_ACCESS_TOKEN` |
| `ME-005` | Client sends `X-User-Id` or `X-User-Roles` | Spoofed headers do not change the resolved actor |
| `ME-006` | Client supplies query/body actor identity | It cannot select another profile; no alternate actor parameter exists in OpenAPI |
| `ME-007` | Successful profile body | Contains only `id`, `email`, `displayName`, `roles`; no tokens, password material or internal flags |

## Common error and disclosure checks

| ID | Prediction | Verification boundary |
|---|---|---|
| `ERR-001` | Every non-empty error contains only the reviewed envelope and required `code`, `message`, `requestId`. | Schema validation for every error fixture |
| `ERR-002` | `X-Request-Id` equals `error.requestId` for every error response. | HTTP contract assertion at runtime boundary in D05 |
| `ERR-003` | Validation may contain only bounded safe field violations; authentication/session errors have no `details`. | Response-shape assertions |
| `ERR-004` | `500/503` never expose exception, SQL, hostname, IP, stack, secret, password or token data. | Failure fixtures plus forbidden-pattern scan |
| `ERR-005` | Submitted password and refresh token values never appear in errors, headers or logs. | Response scan here; real log-redaction assertion in D05 |
| `ERR-006` | Error codes match uppercase stable-code syntax and documented operation outcomes. | Schema and operation-response assertions |

## Deny-by-default and spoofing checks

| ID | Attempt | Predicted deny |
|---|---|---|
| `SEC-001` | Register an Admin through role/status fields | `400`; public registration remains Customer-only |
| `SEC-002` | Use unknown email versus wrong password to enumerate accounts | Identical public login failure shape |
| `SEC-003` | Distinguish expired/revoked/replayed refresh credentials | Identical public refresh failure shape |
| `SEC-004` | Select another actor through body, query or client headers | No trusted actor change |
| `SEC-005` | Read `/me` without valid authenticated context | `401`; zero profile data |
| `SEC-006` | Infer session ownership from logout failure | Neutral `401`; no session or actor detail |
| `SEC-007` | Leak credential values through validation or infrastructure failures | Forbidden-value scan finds zero matches |

## Verification execution plan

At `VERIFICATION`, evidence must record prediction, exact command, working directory,
environment, exit code, observation, artifact path and limitation. The minimum planned
commands are:

1. Parse and validate the OpenAPI document with a real OpenAPI 3.1-compatible validator.
2. Resolve and inspect every local `$ref`.
3. Run repository documentation validation.
4. Run repository consistency validation.
5. Review the scoped diff against the approved expected-files manifest.

If no OpenAPI 3.1 validator is installed, the result must be recorded as `MISSING`;
successful YAML parsing alone must not be reported as full OpenAPI validation.

## Limitations

- This ticket proves a reviewed static contract and test plan, not live HTTP behavior.
- Concurrency, token-family database state, encrypted idempotency response storage,
  internal actor-header stripping and log redaction require real implementation
  boundaries in `TKT-W04-D05`.
- Rate-limit values and the proposed 24-hour idempotency retention remain bounded
  deployment configuration, not fixed OpenAPI constants.

## Implementation self-review

- **Scope:** The implementation adds only the approved OpenAPI contract and contract-test
  matrix; no `apps/**`, migration or runtime source path is introduced.
- **AC-1:** Five operations, request/response/error components, headers, security and
  documented status outcomes are present.
- **AC-2:** Strict schemas, neutral credential errors, self-only profile context,
  refresh/logout behavior and spoofing denies are explicitly represented.
- **AC-3:** Static, schema, behavioral, concurrency, replay, enumeration and
  disclosure cases have stable IDs and predicted outcomes.
- **Security:** Public examples contain no real secret; credential examples are
  explicitly opaque/placeholders; error examples contain no stack, topology or account
  existence detail.
- **Known limitation:** Static OpenAPI validation cannot prove runtime concurrency,
  persistence, cryptography, header stripping or log redaction. Those claims remain
  planned D05 tests rather than D04 evidence.
- **Self-review verdict:** `READY_FOR_VERIFICATION`.
