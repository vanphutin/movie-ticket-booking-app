# Learning Checkpoint — LG-TKT-W04-D05

```yaml
ticket_id: TKT-W04-D05
gate_id: LG-TKT-W04-D05
capability_ids:
  - CAP-IDN-01
  - CAP-SEC-01
target_level: C4_DEFEND
mode: FULL_THEORY_FIRST
status: PASSED
presented_at: "2026-07-30"
answered_at: "2026-07-30"
reference_profile: REF-SECURITY
topics_presented:
  - Vertical-slice responsibility and Clean Architecture dependency direction
  - Controller, application use case, domain, port, adapter and composition-root placement
  - PostgreSQL transaction, unique-constraint and refresh-token row-lock boundaries
  - Refresh rotation, concurrent reuse, family revocation and unknown commit outcome
  - Gateway-to-Identity authenticated request context, tamper binding and correlation
  - Clean and upgrade migrations, idempotent seed and evidence at the real boundary
question_dimensions:
  - EXPLAIN
  - COMPARE
  - APPLY
  - FAILURE
  - DEFEND
questions_asked:
  - Q1_CLEAN_BOUNDARY_AND_REGISTRATION_FAILURE_WINDOW
  - Q2_REFRESH_LOCKING_REPLAY_AND_UNKNOWN_COMMIT
  - Q3_GATEWAY_TRUST_CORRELATION_AND_EVIDENCE
  - Q4_MIGRATION_SEED_AND_REAL_BOUNDARY_DEFENSE
observed_gaps: []
remediation_focus: []
verdict: PASSED
design_unlocked: true
skeleton_unlocked: false
```

## Business problem and constraints

`TKT-W04-D05` is the first executable auth vertical slice. The learner must be able to
place framework, application, domain and infrastructure responsibilities correctly,
while proving transaction, replay, migration, trust-boundary and redaction claims at
their real boundaries. Passing unit tests or high coverage cannot substitute for
PostgreSQL, HTTP, cryptographic or captured-log evidence where those mechanisms are the
claim.

Project constraints include:

- Domain/application dependency direction from `ARCH-006`.
- Framework and persistence isolation from the clean-architecture contracts.
- Identity-owned credential/session state and no shared database.
- Strict D04 OpenAPI/error/idempotency behavior.
- D03 refresh-family reuse revocation and authenticated Gateway-to-service propagation.
- `synchronize: false`, reviewed migrations and real PostgreSQL evidence.
- No scaffold unlock before analysis, reviewed design, expected-files and `READY`.

## Material decision record

```yaml
decision:
  name: D05 vertical-slice boundary and verification strategy
project_constraints:
  - Keep NestJS and TypeORM outside domain/application policy.
  - Preserve registration and refresh invariants under concurrency and retry.
  - Authenticate and bind Gateway-to-Identity context before use-case invocation.
  - Match verification evidence to the real mechanism being claimed.
options:
  - name: Framework-coupled controller/service with mocks and synchronize
    mechanism: Controller or god service directly uses TypeORM, Argon2, JWT and HTTP exceptions; tests replace persistence and trust boundaries.
    advantages:
      - Fast initial scaffold.
      - Low apparent file count.
    disadvantages:
      - Framework and persistence coupling.
      - Hidden transaction and failure windows.
      - Mock-only evidence cannot prove PostgreSQL, crypto or Gateway boundaries.
    failure_modes:
      - Duplicate canonical email under race.
      - Partial user/session/idempotency commits.
      - Actor spoofing or detailed credential leakage.
      - Migration drift hidden by synchronize.
    use_when:
      - Disposable demonstration with no production or contract claim.
    avoid_when:
      - Security-sensitive D05 vertical slice with reviewed contracts.
  - name: Clean vertical slice with behavioral ports and real-boundary evidence
    mechanism: Transport maps HTTP; application coordinates use cases; domain owns invariants; infrastructure implements PostgreSQL, crypto and internal-auth ports; tests select the real boundary per claim.
    advantages:
      - Reviewable ownership and dependency direction.
      - Atomic persistence behavior can be tested directly.
      - Contract, trust and redaction claims are reproducible.
    disadvantages:
      - More upfront design and adapter/test work.
      - Requires real PostgreSQL and multi-service test harnesses.
    failure_modes:
      - Excessive port granularity or long transactions if boundaries are designed poorly.
      - Unknown commit outcome still cannot be eliminated.
    use_when:
      - D05 auth implementation and future microservice slices.
    avoid_when:
      - Do not add abstraction without a real boundary or behavior.
selected_direction: Clean vertical slice with behavioral ports and real-boundary evidence.
selection_reason: It preserves the approved architecture/security contracts and makes each acceptance claim testable at its actual owner and failure boundary.
rejected_alternatives:
  - option: Controller/god-service framework coupling
    rejection_reason: Mixes HTTP, policy, persistence and crypto; enables mass assignment, leakage and untestable transaction behavior.
  - option: SQLite/mock-only acceptance evidence
    rejection_reason: Cannot prove PostgreSQL constraints/locks, migration behavior, real signature verification, header stripping or runtime redaction.
  - option: TypeORM synchronize as schema delivery
    rejection_reason: Produces unreviewed schema mutation and no reproducible clean/upgrade migration path.
change_conditions:
  - Reconsider pessimistic refresh locking after a comparable PostgreSQL baseline shows it is a bottleneck and an alternative preserves reuse/family invariants.
  - Reconsider individual ports only when an abstraction lacks an independent behavior, adapter or test seam.
  - Reconsider the service boundary only through an approved architecture/contract change.
```

## Observed learner answers

### Q1 — Clean boundary and registration failure window

The learner:

- Identified nine architectural/security defects in a controller using TypeORM,
  Argon2, JWT, DTO spread and direct entity responses.
- Placed DTO mapping in transport, orchestration in application, Customer/session
  invariants in domain and TypeORM/crypto/JWT in infrastructure adapters.
- Distinguished application pre-check from PostgreSQL canonical-email unique constraint
  as final concurrency authority.
- Explained registration unknown outcome and why retry must not create another user,
  session or token family.
- Defended encrypted short-lived idempotency outcome storage because a stored refresh
  hash cannot reproduce plaintext credential material.

Observation: `C4_DEFEND` met. One public-code correction was incorporated:
same-key/different-payload maps to `IDEMPOTENCY_KEY_CONFLICT`.

### Q2 — Refresh locking, replay and unknown commit

The learner:

- Compared `SELECT ... FOR UPDATE` with conditional
  `UPDATE ... WHERE status = 'ACTIVE' RETURNING`.
- Selected pessimistic row locking for D05 based on clarity and evidence quality, not an
  unsupported performance claim.
- Explained that PostgreSQL conditional updates still lock and may re-evaluate the
  predicate after a competing transaction.
- Predicted one concurrent request rotates successfully, the second observes reuse and
  revokes the family, leaving no active successor.
- Kept expired/revoked/random/replayed public responses neutral while allowing different
  internal security actions.
- Correctly classified connection loss around `COMMIT` as an unknown outcome and
  described honest evidence for both commit and rollback possibilities.

Observation: `C4_DEFEND` met. A state-model correction was incorporated: after family
revocation, effective token status is `REVOKED`; reuse history belongs in audit metadata
or an event rather than a conflicting single status value.

### Q3 — Gateway trust, correlation and evidence

The learner:

- Traced JWT user A plus spoofed user B/Admin headers through stripping, JWT-derived
  context, internal signing, Identity verification and `/me` returning user A.
- Rejected private-network trust using compromised-service, SSRF, debug-tool,
  misconfiguration and direct-call counterexamples.
- Bound signature verification to actual method, path/query, raw forwarded-body digest,
  audience, actor claims, timestamp and request identity before the controller/use case.
- Proposed real crypto integration tests, unsigned direct-call tests, tamper tests and a
  real Client-to-Gateway-to-Identity E2E trace.
- Distinguished mocked invocation evidence from proof of stripping, signing,
  verification and propagation.

Observation: `C4_DEFEND` met. Contract corrections incorporated:
internal headers are `X-Correlation-Id` and `X-Internal-Gateway-Auth`; correlation uses
canonical UUID text; canonical signing also binds nonce and `kid`; an invalid signature
does not make an attacker-provided correlation header trusted.

### Q4 — Migration, seed and real-boundary defense

The learner:

- Rejected 180 mocked unit tests and 98% coverage as proof of PostgreSQL uniqueness,
  atomic rollback, row locks, migrations, Gateway trust, JWT, OpenAPI, correlation or
  redaction.
- Mapped each claim to a suitable boundary: real PostgreSQL, migration CLI, seed twice,
  HTTP contract tests, real Gateway/Identity crypto path and captured runtime logs.
- Defined clean/upgrade equivalence, data preservation, constraint/backfill safety,
  `synchronize: false` and non-zero failure semantics.
- Defined seed idempotency without broad exception swallowing or credential logging.
- Correctly refused `VERIFIED` when negative login logs contain email/raw credential
  body, and proposed scoped remediation, incident handling and re-verification.

Observation: `C4_DEFEND` met.

## Examples, failure path and counterexample

- **Happy path:** Client registers through Gateway; transport maps strict DTO; application
  coordinates domain/ports; PostgreSQL atomically stores user/session/idempotency state;
  response matches D04; correlation connects Gateway and Identity.
- **Failure/security path:** Two concurrent refreshes use one token; PostgreSQL row lock
  permits one rotation, the second detects reuse and revokes the family; public response
  remains neutral.
- **Counterexample:** A NestJS suite with mocked Gateway/JWT/repository, SQLite
  `synchronize: true` and high coverage cannot prove production migrations, PostgreSQL
  locks, authenticated internal context or redacted runtime logs.
- **Limitation:** Strict refresh reuse detection may revoke a legitimate session after a
  concurrent client bug or unknown commit outcome; clients must serialize refresh and
  evidence must state this limitation.

## References

External references support stable terminology; effective project contracts remain
authoritative.

1. **RFC 7519 — JSON Web Token**
   - URL: <https://www.rfc-editor.org/rfc/rfc7519.html>
   - Authority: IETF RFC Editor
   Purpose: JWT claims, validation and token vocabulary.
2. **OWASP Authorization Cheat Sheet**
   - URL: <https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html>
   - Authority: OWASP
   Purpose: deny-by-default, least privilege and trusted authorization boundaries.
3. **OWASP Authentication Cheat Sheet**
   - URL: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
   - Authority: OWASP
   Purpose: neutral authentication failures and credential-handling guidance.

## Verdict

All target dimensions through `C4_DEFEND` were observed across four multi-dimensional
questions. No material misconception remains open.

- **Verdict:** `PASSED`
- **Design unlocked:** yes
- **Skeleton/application implementation unlocked:** no
- **Next lifecycle stage:** `ANALYSIS`
