# Movie Ticket Booking frontend operating rules

Before frontend work:

1. Read `../project-control/active-workstream.yml` and confirm `frontend` is active.
2. Read `contracts/state/current-work.yml`.
3. Read the authorized ticket and only the contracts/capabilities it references.
4. For successor selection, read `contracts/05-backend-first-delivery-policy.md`,
   `contracts/roadmap/ticket-catalog.yml` and
   `contracts/integration/backend-capability-map.yml`.
5. Inspect branch, status, relevant diff and the active learning/coding checkpoint.
6. Return or perform exactly one next action with its completion condition.

Authority order:

`approved FE change → effective FE contracts → authorized FE ticket → verified public API → code → observed evidence`

Use `STARTUP → LEARNING → ANALYSIS → DESIGN → READINESS → IMPLEMENTATION → VERIFICATION → REVIEW → HANDOFF`.

Backend-first rules:

- Foundation tickets may proceed only through their declared verified prerequisites.
- A product ticket requires both its frontend prerequisites and matching backend gate to
  be `VERIFIED`.
- `FE-WNN-VERIFIED` returns control to backend Week N+1. Do not open backend Week N+1
  early or infer a backend verdict from frontend evidence.
- Planned catalog rows are not implementation authority. Materialize and review only the
  current or candidate ticket before authorization.
- Functional UI behavior precedes visual/UX refinement within every product slice.

Do not scaffold or code before learning, design and readiness permit it. Do not import
`../apps/**`, backend entities, internal headers or secrets. A backend API dependency
must cite a verified public contract/evidence source. `done` and `fixed` trigger
verification only.

After Markdown changes run `npm run check:docs` from the repository root. Before frontend
handoff run `npm run check:frontend-roadmap`, `npm run check:frontend-control` and
`node tools/repository/validate-repository.mjs`.
