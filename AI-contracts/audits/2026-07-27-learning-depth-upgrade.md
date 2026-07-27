# Audit — Decision-oriented learning depth upgrade

Date: 2026-07-27
Scope: learning control plane and generated documentation viewers
Application source changes: none

## Approved outcome

Upgrade learning so Codex must teach and assess:

- mental model and protected invariant;
- realistic options and mechanisms;
- selected direction and contract/design basis;
- rejected alternatives and concrete reasons;
- trade-off, limitation and reconsideration conditions;
- happy path, failure/security path and counterexample;
- Movie Ticket Booking application;
- C1–C4 observable learner capability.

Every full learning gate must also provide 1–3 focused external documentation links.

## Decisions

1. Keep the compact capability map as an index; store depth in
   `learning/capability-lesson-specs.md`.
2. Use a mandatory decision-oriented lesson flow rather than relying on free-form
   teaching.
3. Assign every ticket gate one `target_level` and one `reference_profile`.
4. Keep references in reusable profiles so links have title, authority and lesson
   purpose, while each gate remains limited to 1–3 links.
5. External docs support learning but cannot amend effective project contracts or count
   as evidence of understanding.
6. Revisit concepts through an explicit retention map; do not repeat a full lesson when a
   scoped recall check is sufficient.

## Coverage

- Capability lesson specifications: `13/13`.
- Ticket gate depth/reference assignments: `35/35`.
- Reference profiles: `13`.
- Each profile: `1–3` HTTPS links.
- Retention concepts: authority/evidence, session lifecycle, authorization ownership,
  constraints, idempotency, outbox, concurrency, payment, observability and operations.

## Source verification

Documentation was opened on its authoritative site before inclusion. Sources include:

- IETF RFC Editor for normative language, JWT and HTTP semantics;
- OWASP Cheat Sheet Series for authentication, authorization, payment and secure review;
- PostgreSQL current documentation for constraints, isolation, locking and `EXPLAIN`;
- OpenAPI and AsyncAPI specifications/documentation;
- RabbitMQ reliability documentation and the transactional-outbox pattern reference;
- Stripe webhook documentation;
- OpenTelemetry signals/context propagation;
- Kubernetes probes and Google SRE overload guidance;
- GitHub Actions and Docker Compose documentation.

The URLs are intentionally version-neutral where the authority provides a current/latest
route. Version-sensitive implementation behavior must be checked again at implementation
time.

## Verification

Command:

```text
node tools/control-plane/validate-control-plane.mjs
```

Observed:

- Exit code `0`.
- `learning lesson specs: 13/13`.
- `learning gate references: 35/35`.
- `reference profiles: 13`.
- Canonical project state remains at `FOUNDATION_GATE`; no ticket was authorized.

Documentation build commands:

```text
node AI-contracts/viewer/build-data.js
node AI-contracts/viewer/server.js --check
node docs-viewer/build-data.js
node --check docs-viewer/app.js
node --check docs-viewer/build-data.js
```

Observed:

- AI-contracts viewer compiled `73` files.
- AI-contracts server script check passed.
- Unified docs viewer compiled `115` documents.
- JavaScript syntax checks exited `0`.

## Review

Review state: `CONDITIONAL_PASS`.

The learning-control deliverable meets structural coverage and link-count requirements.
Actual learning gates remain `NOT_EVALUATED`: no learner answers were fabricated, and
content quality must still be observed ticket by ticket during real teaching.

## One next action

Review learner-supplied Foundation Gate evidence against the canonical rubric.

Completion condition: `FG-001` has an evidence-backed reviewer verdict.
