# CCR-005 — Backlog-to-contract reconciliation

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Decision direction approved: 2026-07-28
- Concrete CCR approved by: Van Phu Tin
- Concrete approval date: 2026-07-28
- Approval evidence: explicit `APPROVE CCR-005` in the project working session
- Materialized by: Codex
- Effective baseline before approval: `PC-2026.2`
- Application/runtime change: none

The project owner approved the conversion direction and these choices:

```text
all 55 backlog endpoints enter the contract inventory
→ paths reviewed by ownership/resource semantics
→ Staff/check-in is POST_MVP
→ payOS adapter is used behind a provider port; deterministic fake remains required
→ AI endpoints are STRETCH
```

The concrete inventory, identifiers and effects are approved. Amendments become effective
only as the rollout artifacts below are applied and validated; approval itself does not
claim application implementation or runtime evidence.

## Problem

`docs/product-backlog/06-api-backlog-summary.md` contains 55 endpoint rows, while the
effective API contract contains 22. Only 14 rows have an exact normalized method/path
match. The control plane has no canonical `BL-* → API/contract/capability/ticket`
registry.

Four scope conflicts also remain:

1. Staff/check-in is `Must` in backlog but post-MVP in `DATA-SM-006`.
2. AI endpoints are partly `Must` in backlog but semantic/recommendation is out of scope
   in `SCOPE-002`.
3. Backlog assumes direct payOS integration while the core roadmap verifies a payment
   mock/webhook slice.
4. Backlog DoR/DoD uses `Done` and weak evidence semantics that do not equal canonical
   `VERIFIED`.

The backlog summary count is internally inconsistent. Its endpoint rows contain
`46 Must + 6 Should + 3 Could = 55`; the summary table reports
`45 Must + 7 Should + 3 Could`.

## Goals

1. Give all 55 backlog endpoints a unique canonical API contract.
2. Give every endpoint a backlog ID, owner, actor, priority, disposition, authn/authz,
   schema, failure/status and idempotency declaration.
3. Route every Core endpoint to capability and ticket coverage.
4. Contract Staff endpoints without activating them in the week 4–10 core roadmap.
5. Contract AI endpoints without making them core release requirements.
6. Use payOS through an adapter while keeping deterministic provider verification
   reproducible.
7. Validate mapping completeness and projection drift automatically.

## Non-goals

- No application scaffold or implementation.
- No source module/tooling decision.
- No runtime/database migration.
- No ticket, capability, learning or evidence status becomes `VERIFIED`.
- No Staff or AI endpoint is activated.
- No raw provider request/response logging is authorized.

## Disposition model

```text
CORE_REQUIRED
CORE_OPTIONAL
STRETCH
POST_MVP
```

- `CORE_REQUIRED`: required for the relevant weekly and release gate.
- `CORE_OPTIONAL`: contracted and allowed in the owning core module, but not a hard
  release dependency unless a ticket explicitly activates it.
- `STRETCH`: contracted but locked until all core prerequisites and optimization gates
  allow it.
- `POST_MVP`: contracted for traceability only; requires a future approved ticket/change
  before implementation.

Contract existence is not implementation authorization.

## Path policy

1. Canonical API base remains `/api/v1`.
2. Resource ownership and stable semantics decide the path.
3. Customer collection endpoints derive ownership from trusted actor context; `/my`
   suffix is not required.
4. Provider-neutral payment initiation stays provider-neutral.
5. Webhook transport may be provider-specific because raw-body verification is adapter
   specific.
6. Nested Catalog creation paths expose the owning parent where it is required to
   establish the invariant.
7. Backlog projections are updated to canonical paths after approval.

## Target endpoint inventory

All rows inherit `API-COM-001..006`. Retryable mutations also inherit `API-IDN-001`.
Detailed request/response components, filters and status matrices are completed in the
owning design ticket before implementation.

### Public — 8

| # | Backlog | Contract | Method path | Owner | Disposition |
|---:|---|---|---|---|---|
| 1 | BL-001 | API-CAT-001 | `GET /api/v1/movies` | Catalog | CORE_REQUIRED |
| 2 | BL-002 | API-CAT-010 | `GET /api/v1/movies/{id}` | Catalog | CORE_REQUIRED |
| 3 | BL-002 | API-CAT-011 | `GET /api/v1/movies/{id}/trailer` | Catalog | CORE_REQUIRED |
| 4 | BL-003 | API-CAT-012 | `GET /api/v1/cinemas` | Catalog | CORE_REQUIRED |
| 5 | BL-003 | API-CAT-013 | `GET /api/v1/cinemas/{id}` | Catalog | CORE_REQUIRED |
| 6 | BL-004 | API-CAT-014 | `GET /api/v1/showtimes` | Catalog | CORE_REQUIRED |
| 7 | BL-004 | API-CAT-015 | `GET /api/v1/showtimes/{id}` | Catalog | CORE_REQUIRED |
| 8 | BL-005 | API-BKG-004 | `GET /api/v1/showtimes/{id}/seats` | Booking | CORE_REQUIRED |

### Authentication — 4

| # | Backlog | Contract | Method path | Owner | Disposition |
|---:|---|---|---|---|---|
| 9 | BL-012 | API-AUTH-001 | `POST /api/v1/auth/register` | Identity | CORE_REQUIRED |
| 10 | BL-013 | API-AUTH-002 | `POST /api/v1/auth/login` | Identity | CORE_REQUIRED |
| 11 | BL-014 | API-AUTH-003 | `POST /api/v1/auth/refresh` | Identity | CORE_REQUIRED |
| 12 | BL-015 | API-AUTH-004 | `POST /api/v1/auth/logout` | Identity | CORE_REQUIRED |

### Customer — 10

| # | Backlog | Contract | Method path | Owner | Disposition |
|---:|---|---|---|---|---|
| 13 | BL-012 | API-AUTH-005 | `GET /api/v1/me` | Identity | CORE_REQUIRED |
| 14 | S-6 | API-IDN-002 | `PATCH /api/v1/me/preferences` | Identity profile boundary | STRETCH |
| 15 | BL-017 | API-BKG-001 | `POST /api/v1/showtimes/{id}/holds` | Booking | CORE_REQUIRED |
| 16 | BL-018 | API-BKG-005 | `DELETE /api/v1/holds/{id}` | Booking | CORE_REQUIRED |
| 17 | BL-020 | API-BKG-002 | `POST /api/v1/bookings` | Booking | CORE_REQUIRED |
| 18 | BL-021 | API-BKG-006 | `GET /api/v1/bookings` | Booking | CORE_REQUIRED |
| 19 | BL-021 | API-BKG-003 | `GET /api/v1/bookings/{id}` | Booking | CORE_REQUIRED |
| 20 | BL-022 | API-BKG-007 | `POST /api/v1/bookings/{id}/cancel` | Booking | CORE_REQUIRED |
| 21 | BL-024 | API-TKT-002 | `GET /api/v1/tickets` | Booking | CORE_REQUIRED |
| 22 | BL-024 | API-TKT-003 | `GET /api/v1/tickets/{id}` | Booking | CORE_REQUIRED |

### Staff — 3

| # | Backlog | Contract | Method path | Owner | Disposition |
|---:|---|---|---|---|---|
| 23 | BL-025 | API-TKT-004 | `GET /api/v1/staff/tickets/{code}` | Booking | POST_MVP |
| 24 | BL-026 | API-TKT-005 | `POST /api/v1/staff/tickets/{id}/check-in` | Booking | POST_MVP |
| 25 | BL-026 | API-TKT-006 | `GET /api/v1/staff/showtimes/{id}/check-ins` | Booking | POST_MVP |

### Admin — 17

| # | Backlog | Contract | Method path | Owner | Disposition |
|---:|---|---|---|---|---|
| 26 | BL-010 | API-CAT-002 | `POST /api/v1/admin/movies` | Catalog | CORE_REQUIRED |
| 27 | BL-010 | API-CAT-003 | `PATCH /api/v1/admin/movies/{id}` | Catalog | CORE_REQUIRED |
| 28 | BL-011 | API-CAT-016 | `PATCH /api/v1/admin/movies/{id}/trailer` | Catalog | CORE_OPTIONAL |
| 29 | BL-011 | API-CAT-017 | `POST /api/v1/admin/movies/{id}/trailer/publish` | Catalog | CORE_OPTIONAL |
| 30 | BL-011 | API-CAT-018 | `POST /api/v1/admin/movies/{id}/trailer/unpublish` | Catalog | CORE_OPTIONAL |
| 31 | BL-006 | API-CAT-005 | `POST /api/v1/admin/cinemas` | Catalog | CORE_REQUIRED |
| 32 | BL-006 | API-CAT-019 | `PATCH /api/v1/admin/cinemas/{id}` | Catalog | CORE_REQUIRED |
| 33 | BL-007 | API-CAT-008 | `POST /api/v1/admin/cinemas/{id}/screens` | Catalog | CORE_REQUIRED |
| 34 | BL-007 | API-CAT-009 | `POST /api/v1/admin/screens/{id}/seats` | Catalog | CORE_REQUIRED |
| 35 | BL-008 | API-CAT-006 | `POST /api/v1/admin/screens/{id}/showtimes` | Catalog | CORE_REQUIRED |
| 36 | BL-009 | API-CAT-020 | `PATCH /api/v1/admin/showtimes/{id}` | Catalog | CORE_REQUIRED |
| 37 | BL-009 | API-CAT-021 | `POST /api/v1/admin/showtimes/{id}/cancel` | Catalog | CORE_REQUIRED |
| 38 | BL-021 | API-BKG-008 | `GET /api/v1/admin/bookings` | Booking | CORE_REQUIRED |
| 39 | BL-030 | API-PAY-003 | `GET /api/v1/admin/payments` | Booking | CORE_REQUIRED |
| 40 | BL-030 | API-PAY-004 | `POST /api/v1/admin/payments/{id}/reconcile` | Booking | CORE_OPTIONAL |
| 41 | BL-043 | API-OPS-001 | `GET /api/v1/admin/audit-logs` | Operations/audit boundary | CORE_REQUIRED |
| 42 | BL-044 | API-OPS-002 | `GET /api/v1/admin/integration-logs` | Operations/audit boundary | CORE_REQUIRED |

### Payment and webhook — 3

| # | Backlog | Contract | Method path | Owner | Disposition |
|---:|---|---|---|---|---|
| 43 | BL-027 | API-PAY-001 | `POST /api/v1/bookings/{id}/payments` | Booking | CORE_REQUIRED |
| 44 | BL-030 | API-PAY-005 | `GET /api/v1/payments/{id}` | Booking | CORE_REQUIRED |
| 45 | BL-028,BL-029 | API-PAY-002 | `POST /api/v1/webhooks/payments/payos` | Booking payOS adapter | CORE_REQUIRED |

### AI — 10

| # | Backlog | Contract | Method path | Owner | Disposition |
|---:|---|---|---|---|---|
| 46 | BL-034 | API-AI-001 | `POST /api/v1/ai/movie-search` | Catalog AI boundary | STRETCH |
| 47 | S-1 | API-AI-002 | `POST /api/v1/ai/recommendations` | Future personalization owner | STRETCH |
| 48 | S-2 | API-AI-003 | `POST /api/v1/ai/recommendations/feedback` | Future personalization owner | STRETCH |
| 49 | BL-037 | API-AI-004 | `POST /api/v1/admin/movies/{id}/ai/content-drafts` | Catalog | STRETCH |
| 50 | BL-038 | API-AI-005 | `POST /api/v1/admin/movies/{id}/ai/trailer-description-drafts` | Catalog | STRETCH |
| 51 | BL-039 | API-AI-006 | `POST /api/v1/admin/movies/{id}/ai-content/{draftId}/apply` | Catalog | STRETCH |
| 52 | BL-035 | API-AI-007 | `POST /api/v1/admin/movies/{id}/embeddings/rebuild` | Catalog | STRETCH |
| 53 | BL-035 | API-AI-008 | `POST /api/v1/admin/ai/embeddings/rebuild` | Catalog | STRETCH |
| 54 | BL-040 | API-AI-009 | `GET /api/v1/admin/ai/logs` | Catalog/operations projection | STRETCH |
| 55 | BL-040 | API-AI-010 | `GET /api/v1/admin/ai/usage` | Catalog/operations projection | STRETCH |

## Actor and scope changes

- Add `Staff` as a recognized `POST_MVP` actor. It receives no core permission.
- Keep `Operator` distinct from Admin/Staff and least-privileged.
- AI endpoints remain present but `STRETCH`; they do not amend `SCOPE-002` until
  eligibility is met.
- payOS is the selected payment adapter, not a domain dependency.

## payOS contract

1. Application owns a versioned `PaymentProvider` port.
2. payOS adapter handles SDK/HTTP mapping, timeout, safe error mapping and raw signature
   verification.
3. Provider network call is outside business DB transactions.
4. CI and core release use deterministic provider fake/fixtures for success, failure,
   timeout, duplicate and mismatch.
5. payOS sandbox evidence is required for the adapter integration ticket when credentials
   are available, but it cannot be the only release evidence.
6. No payOS secret, signature, raw webhook or full provider request/response enters
   source, evidence or integration logs.

## Audit/integration log contract direction

Before `API-OPS-001/002` implementation, define:

- data owner and storage boundary;
- actor/action/resource/result/correlation metadata;
- redaction and field allowlist;
- append/tamper expectation;
- retention/purge strategy;
- bounded filter/sort/pagination;
- least-privilege query authorization;
- indexes justified by query workload.

“Integration log request/response” is amended to mean redacted allowlisted metadata, not
raw provider payload mirroring.

## Roadmap impact

- Week 4: map `BL-012..016` to `API-AUTH-001..005`.
- Week 5: add public detail/trailer and optional trailer-management contracts.
- Week 6: add cinema/showtime reads and update/cancel contracts.
- Week 7: add booking list/cancel, ticket list/detail and Admin booking query.
- Week 8: add payOS adapter, deterministic fake, payment status/Admin query/reconciliation
  and log emission.
- Week 9: operationalize audit/integration-log query contracts and retention.
- Staff endpoints go to a separate post-MVP ticket catalog.
- AI endpoints go to a separate Stretch capability/ticket catalog.

No week 4–10 ticket is activated by this CCR.

## Learning impact

After approval:

- add payOS provider-port/adapter comparison and sandbox-vs-deterministic evidence;
- add redacted metadata vs raw integration-log counterexample;
- add Staff owner/authorization learning only to post-MVP gates;
- add AI trust/data/cost/failure learning only to Stretch gates;
- retain existing core learning gate status; no observed learner interaction is claimed.

## Required canonical registry

Create after approval:

```text
AI-contracts/traceability/backlog-contract-map.yml
AI-contracts/schemas/backlog-contract-map.schema.json
```

The registry records all 55 endpoint mappings and is validated against the backlog
projection, API inventory, capability map and ticket catalogs.

## Compatibility and migration

- No application consumer or source module exists, so path/schema changes have no runtime
  migration.
- Existing contract IDs are retained where semantics remain the same.
- New rows are additive.
- `API-BKG-001`, `API-PAY-002` method/path text changes before implementation; IDs remain
  stable and the backlog projection is updated in the same approved change.
- No data migration exists; data/security/retention requirements are design inputs.

## Risks and controls

| Risk | Control |
|---|---|
| Contract inventory is mistaken for MVP scope | mandatory disposition and activation condition |
| Staff/AI is implemented early | validator rejects Core routing for POST_MVP/STRETCH |
| payOS sandbox makes CI flaky | deterministic fake/fixtures remain mandatory |
| provider SDK leaks into core | port/adapter and dependency-direction contract |
| log endpoints expose secrets | redacted allowlist, retention and negative tests |
| backlog projection drifts again | machine-readable registry + validator |
| 55 rows exist without delivery ownership | Core rows require capability and ticket |
| endpoint paths break consumers | no consumers exist; future breaking change follows API-COM-006 |

## Validation requirements

The validator must prove:

1. `55/55` endpoint mappings.
2. 55 unique method/path pairs and unique API IDs.
3. Every backlog endpoint resolves to a mapping.
4. Every mapped API/contract/capability/ticket ID exists.
5. Every `CORE_REQUIRED` endpoint has a core ticket.
6. All three Staff endpoints are `POST_MVP`.
7. All ten AI endpoints are `STRETCH`.
8. payOS endpoints carry provider/security/idempotency requirements.
9. Collections carry bounded pagination/filter rules.
10. Mutating retryable endpoints declare idempotency.
11. Backlog priority totals are derived from rows and consistent.
12. Backlog/API/registry drift fails validation.

Negative fixtures must cover missing mapping, duplicate path, invalid disposition,
Core-without-ticket and sensitive raw-log authorization.

## Rollout

```text
CCR-005 approved
→ fix backlog internal scope/count/path projection
→ create 55-row canonical mapping registry/schema
→ amend product/architecture/API/data/event/security/quality contracts
→ update roadmap/capability/learning routing
→ extend validator and negative fixtures
→ rebuild viewers
→ audit evidence
→ update handoff
```

## Rollback

Before application implementation, rollback is document-only:

- mark this CCR `SUPERSEDED` or apply a follow-up CCR;
- restore prior effective contract rows and backlog projection;
- preserve audit/decision history;
- do not delete evidence or fabricate prior state.

## Approval checklist

- [x] Target inventory contains exactly 55 rows.
- [x] Staff disposition is `POST_MVP`.
- [x] AI disposition is `STRETCH`.
- [x] payOS adapter + deterministic fake policy is accepted.
- [x] Canonical paths are accepted.
- [x] Audit/integration log redaction direction is accepted.
- [x] Core roadmap impact is acceptable.
- [x] Registry/validator requirements are accepted.

## Approval verdict

`APPROVED` — apply the documented rollout without authorizing an application ticket or
changing `FG-001`.
