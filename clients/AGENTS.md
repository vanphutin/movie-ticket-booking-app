# Movie Ticket Booking frontend operating rules

Before frontend work:

1. Read `../project-control/active-workstream.yml` and confirm `frontend` is active.
2. Read `contracts/state/current-work.yml`.
3. Read the authorized ticket and only the contracts/capabilities it references.
4. Inspect branch, status, relevant diff and the active learning/coding checkpoint.
5. Return or perform exactly one next action with its completion condition.

Authority order:

`approved FE change → effective FE contracts → authorized FE ticket → verified public API → code → observed evidence`

Use `STARTUP → LEARNING → ANALYSIS → DESIGN → READINESS → IMPLEMENTATION → VERIFICATION → REVIEW → HANDOFF`.

Do not scaffold or code before learning, design and readiness permit it. Do not import
`../apps/**`, backend entities, internal headers or secrets. A backend API dependency must cite a
verified public contract/evidence source. `done` and `fixed` trigger verification only.

After Markdown changes run `npm run check:docs` from the repository root. Before frontend handoff
run `npm run check:frontend-control` and repository validation.
