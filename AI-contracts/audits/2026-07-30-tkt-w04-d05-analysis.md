# Analysis — TKT-W04-D05

## Outcome and authority

- **Actor/outcome:** Customer uses register, login, refresh, logout and `/me` through
  Gateway; reviewer receives reproducible migration, negative/replay, correlation and
  real-boundary evidence.
- **Ticket:** `TKT-W04-D05`
- **Capabilities:** `CAP-IDN-01`, `CAP-SEC-01`
- **Effective baseline:** `PC-2026.8`
- **Prerequisite:** `TKT-W04-D04 VERIFIED` and published
- **Learning:** `LG-TKT-W04-D05 PASSED` at `C4_DEFEND`
- **Applicable contracts:** `ARCH-001` through `ARCH-016`, `DATA-IDN-001`,
  `TEST-001`, `DOD-001`, `CCR-006` through `CCR-010`
- **Inherited reviewed inputs:**
  - D02 Identity/session PostgreSQL design
  - D03 token lifecycle and authenticated Gateway-to-service design
  - D04 OpenAPI/error/idempotency contract and contract-test matrix

## Scope

### In scope

- Establish the first runnable NestJS vertical slice for Gateway and Identity.
- Implement the five D04 operations without changing their public contract.
- Implement Identity-owned user, role, refresh-session and required operation-security
  persistence through PostgreSQL 16 and TypeORM infrastructure adapters.
- Deliver immutable migration and minimal idempotent local/test seed behavior.
- Implement access-token verification at Gateway and authenticated, tamper-bound
  Gateway-to-Identity context verification at Identity.
- Implement strict DTO validation, neutral error normalization, request correlation and
  sensitive-log redaction.
- Verify domain rules, use cases, adapters, PostgreSQL constraints/transactions/locks,
  OpenAPI behavior and the real Gateway-to-Identity public path at the appropriate
  boundaries.

### Out of scope

- Catalog, Booking, Payment, Worker or later-week application capabilities.
- Password reset, email verification, MFA, OAuth/social login or Staff permissions.
- Browser cookie/CSRF refresh-token delivery; D04 selects JSON credential delivery.
- Shared database/schema/credential between services.
- Production deployment, release, load/optimization claims or a complete platform
  monorepo beyond the D05 slice.
- Any route absent from the endpoint registry and reviewed D04 OpenAPI.

## Observed repository facts

- Branch: `codex/tkt-w04-d05-auth-vertical-slice`.
- D05 startup and learning checkpoints are committed and published through Draft PR
  `#5`.
- `apps/` currently contains no files.
- No Nest CLI/workspace configuration exists.
- Root `package.json` is repository documentation tooling only; no application build,
  lint, test or migration command exists.
- Application tooling is `NOT_AVAILABLE`, not `PASS` or `NOT_RUN`.
- The reviewed OpenAPI contract exists at
  `AI-contracts/openapi/auth-api.v1.yaml`.
- No application target path is authorized before reviewed D05 design and
  expected-files manifest.

## Service and data ownership

| Concern | Owner | Must not own |
|---|---|---|
| Public routing, access-token verification, edge validation, correlation, actor-header stripping, internal request signing | Gateway | User/session database or identity domain rules |
| User credential, role, refresh-session lifecycle, registration idempotency behavior, `/me` profile | Identity | Gateway routing or another service's data |
| User/session relational invariants and transaction state | Identity PostgreSQL schema | Cross-service FK or shared schema |
| Password hashing, JWT signing, token hashing/generation, internal-auth signing/verification | Infrastructure adapters behind reviewed ports | Domain entity or controller implementation detail |

Identity is the only service permitted to read/write its relational state. Gateway must
not import an Identity repository/entity or connect to the Identity database.

## Required vertical-slice boundaries

```text
External client
  → Gateway transport/security pipeline
  → authenticated internal HTTP boundary
  → Identity transport/security pipeline
  → application use case
  → domain behavior
  → application port
  → TypeORM/crypto/JWT infrastructure adapter
  → PostgreSQL 16
```

Dependency direction must remain:

```text
transport/adapters → application → domain
infrastructure → application ports
bootstrap/composition root → concrete wiring
```

Domain and application must not import NestJS, TypeORM, persistence entities,
`Repository`, `EntityManager`, `QueryRunner` or provider SDK types.

## Use-case analysis

### Register

1. Gateway enforces public/rate-limited edge policy and required idempotency header.
2. Identity transport validates strict `RegisterRequest`.
3. Application canonicalizes email/display name without changing password bytes.
4. Registration checks/reserves the idempotency operation by key plus canonical
   fingerprint.
5. Password hashing and response credential material are prepared outside a long-lived
   database transaction where safe.
6. One Identity-owned transaction persists user, Customer role assignment, refresh
   session and durable idempotency completion/outcome state.
7. PostgreSQL canonical-email uniqueness remains the final concurrency authority.
8. Same key/same payload replays the original logical response; same key/different
   payload maps to `409 IDEMPOTENCY_KEY_CONFLICT`.

Failure windows that design/verification must address:

- concurrent same-email registration;
- concurrent same-idempotency-key registration;
- refresh-session or idempotency write failure after user insert;
- response loss after commit;
- encryption/outcome-retention failure;
- database commit acknowledgement loss.

### Login

1. Identity performs a minimal credential lookup that may access `password_hash`; public
   profile reads must not select/serialize it.
2. Password verification uses the approved adaptive-hash adapter.
3. Unknown email, wrong password and disabled/non-authenticatable account remain one
   neutral public `401 INVALID_CREDENTIALS`.
4. Successful login atomically persists a refresh session before returning a signed
   access token and opaque refresh token.

Comparable public shape is required; implementation must avoid raw credential or account
state in logs/errors. Timing differences remain a test/review concern but no unsupported
constant-time system claim is inferred.

### Refresh

1. Hash the presented opaque refresh token and prepare successor token material.
2. Within one PostgreSQL transaction, lock the matching session row using the reviewed
   D05 direction (`SELECT ... FOR UPDATE`), read current effective state and act on the
   latest row.
3. Active/unexpired token: revoke/mark the old token with rotation reason and insert
   exactly one successor in the same family.
4. Previously consumed/revoked token used again: revoke all effective sessions in that
   family and create no successor.
5. Random, expired, revoked and replayed credentials share public
   `401 INVALID_REFRESH_TOKEN`; internal action/audit may differ.

The physical D02 model derives effective status from `revoked_at`, `expires_at` and
revocation reason. D05 must not introduce a conflicting second status authority merely
to mirror conceptual `ACTIVE/ROTATED/REVOKED` vocabulary.

Unknown outcome around commit remains a limitation: connection loss cannot prove commit
or rollback. Evidence must not report it as confirmed no-effect.

### Logout

- Requires only the refresh credential, not a live access token.
- Active recognized session/family is revoked atomically.
- A recognized already-revoked credential within the retained replay-safe boundary
  returns `204` with no body.
- Malformed, expired or unrecognized credentials return neutral
  `401 INVALID_REFRESH_TOKEN`.
- Retention/tombstone behavior must preserve replay safety without storing plaintext
  refresh tokens.

### `/me`

- Gateway verifies the access token and replaces every client actor/internal-auth
  header with verified minimal context.
- Identity authenticates the internal request before creating `TrustedRequestContext`.
- The application use case receives only the trusted actor ID and returns an allowlisted
  profile projection without password/session/internal fields.
- A client JWT for user A plus spoofed user B/Admin headers must still return user A.

## Gateway-to-Identity trust boundary

The authenticated internal request must preserve the approved D03 binding:

- uppercase method;
- canonical path and allowlisted/sorted query;
- Identity target audience;
- minimal verified actor claims;
- canonical UUID correlation ID;
- SHA-256 digest of exact forwarded body bytes;
- issued-at timestamp;
- cryptographically random nonce;
- key version (`kid`);
- `X-Internal-Gateway-Auth` verification using the reviewed canonical input.

Identity must verify signature, audience, freshness, body/path/method binding, key version
and atomically claim the nonce before controller/use-case invocation. Missing/invalid
authentication, replay-store failure or tampering fails closed with no business/database
effect.

Internal propagation uses `X-Correlation-Id`; the public response uses `X-Request-Id`;
`error.requestId` carries the same trusted correlation identity where applicable.
Untrusted direct calls may require a locally generated failure ID rather than reflecting
an unsigned attacker value.

## Data and migration analysis

The D02 physical authority includes:

- `users`;
- `roles`;
- `user_roles`;
- `refresh_sessions`;
- UUID/UTC/local FK/unique/check/index requirements;
- canonical email uniqueness;
- password and refresh-token hashes only;
- per-issued-token refresh-session rows and family history;
- `synchronize: false`.

D05 additionally requires durable mechanisms not fully named by the reduced
`DATA-IDN-001` row:

1. registration idempotency key/fingerprint/completion and encrypted response outcome;
2. internal-request nonce replay claiming/retention for Identity verification.

These are not optional behaviors because D04 idempotency and D03 replay protection are
reviewed inputs. Their precise table ownership, constraints, encryption/key boundary,
retention and purge behavior must be decided in D05 design before any migration is
written. The reviewed solution must remain Identity-owned and must not create shared
state or weaken the D02 schema.

Migration verification must cover:

- clean PostgreSQL 16 database → all migrations → seed → smoke;
- previous D02-compatible checkpoint/data → D05 migrations → preserved data → smoke;
- clean and upgrade paths reaching the same logical schema;
- no `synchronize: true`;
- failure/forward-fix or rollback strategy;
- seed twice with the same logical state and non-zero exit for unexpected errors.

## Security and failure matrix

| Case | Required effect | Public boundary |
|---|---|---|
| Unknown registration field/role escalation | Reject before persistence | `400 VALIDATION_FAILED` |
| Concurrent duplicate canonical email | One user only | neutral `409 REGISTRATION_CONFLICT` for loser |
| Same idempotency key/different payload | No second effect | `409 IDEMPOTENCY_KEY_CONFLICT` |
| Unknown email vs wrong password | No account disclosure | identical `401 INVALID_CREDENTIALS` shape |
| Concurrent refresh with one token | One initial rotation; reuse revokes family; no active successor remains | one `200`, one neutral `401` |
| Expired/random/revoked/replayed refresh token | No new credential; replay may revoke family internally | neutral `401 INVALID_REFRESH_TOKEN` |
| Repeated recognized logout | No extra effect | replay-safe `204`, empty body |
| Spoofed actor headers | Strip/replace; actor derives from verified JWT | `/me` returns authenticated actor |
| Missing/tampered/replayed internal auth | Reject before controller/use case | normalized failure; no side effect |
| Identity timeout or commit ambiguity | Do not invent success/no-effect | normalized `503`/Gateway timeout policy with honest limitation |
| Negative auth log contains password/token/raw body | Security failure | blocks verification |

## Verification-boundary analysis

| Claim | Minimum adequate evidence |
|---|---|
| Domain lifecycle and Customer-only factory | Domain unit tests without NestJS/ORM/database |
| Use-case orchestration/error mapping | Application tests with controlled ports; no database claim |
| PostgreSQL unique/transaction/lock/family behavior | PostgreSQL 16 integration/database tests with synchronized contenders and final state |
| Migration/seed | Real migration/seed commands on clean and previous-baseline PostgreSQL databases |
| OpenAPI compatibility | Live HTTP request/response contract tests against the reviewed schema |
| JWT/internal request signing | Real crypto adapter tests; tamper/audience/nonce/`kid` negatives |
| Actor spoofing and correlation | E2E Client → Gateway → Identity → PostgreSQL plus captured response/log correlation |
| Redaction | Captured runtime logs from success and negative flows scanned for marker credentials/PII |
| Timeout/unknown outcome | Failure injection with honest observation and database final-state evidence where observable |

Test count and coverage are supporting metrics only. SQLite, mocked repositories, mocked
Gateway/JWT verifiers or direct trusted-context injection cannot prove the corresponding
real-boundary claims.

## Required design decisions before readiness

The following are design inputs, not unresolved contract conflicts:

1. Logical application workspace topology and exact Gateway/Identity module roots.
2. Package manager and NestJS/TypeScript/tooling baseline.
3. Concrete clean-architecture folder/dependency rules and nested `AGENTS.md` commands.
4. Behavioral port shapes and composition-root wiring.
5. PostgreSQL migration ownership, idempotency/replay storage schema and retention.
6. Transaction demarcation for register/login/refresh/logout.
7. Argon2id, JWT and internal-auth adapter configuration boundaries without committed
   secrets.
8. Gateway/Identity local test harness, PostgreSQL environment and synchronized
   concurrency controls.
9. Evidence artifact paths and exact clean/upgrade/E2E/redaction verification commands.
10. Rollback/forward-fix behavior that never restores unsigned actor trust or permissive
    DTO/error leakage.

## Alternatives rejected at analysis

- **One NestJS `AuthService` using TypeORM/JWT/Argon2 directly:** rejects clean dependency
  direction and makes transaction/security boundaries implicit.
- **Shared user entity/repository package between Gateway and Identity:** violates
  service ownership and forbidden cross-service dependency rules.
- **SQLite or `synchronize: true` as database evidence:** cannot prove PostgreSQL
  constraints, locks or migration paths.
- **Primitive repository calls composed by refresh use case:** allows atomic rotation to
  be split accidentally; use a behavioral transaction port/adapter.
- **Trust Gateway headers because the network is private:** does not authenticate origin
  or bind request integrity.
- **Mock-only E2E with injected trusted actor:** tests controller behavior but not the
  Gateway-to-Identity trust boundary.

## Risks and limitations

- D05 scope is large because no application workspace exists; design must keep the first
  slice minimal without omitting an acceptance boundary.
- Strict refresh reuse detection may revoke a legitimate family after a client sends
  concurrent refreshes or retries an unknown commit outcome.
- Encrypted registration outcome storage adds sensitive key-management and retention
  responsibility.
- PostgreSQL nonce replay storage may add a write per authenticated internal request;
  no performance claim is made before a real baseline.
- Multi-service E2E and fault injection may require tooling not currently installed;
  readiness must record `NOT_AVAILABLE` until reviewed tooling exists.
- Static contract validity cannot prove runtime redaction, correlation, concurrency or
  migration behavior.

## Requirement-conflict verdict

- Effective-contract conflicts: `0`
- Unanswered requirement conflicts: `0`
- Design decisions still required: `10` listed above
- Analysis status: `COMPLETE`
- Next lifecycle stage: `DESIGN`
