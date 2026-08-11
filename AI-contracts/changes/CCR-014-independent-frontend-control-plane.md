# CCR-014 — Independent frontend learning control plane

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-08-11
- Approved by: Van Phu Tin
- Approved at: 2026-08-11
- Approval evidence: explicit instruction `oke tiến hành ... MovieTicketBookingApp\clients`
- Effective baseline before approval: `PC-2026.11`
- Effective baseline after approval: `PC-2026.12`
- Application/runtime change: none

## Problem

The repository has a resumable backend control plane but no independent frontend learning
authority. A generic "continue" or "hôm nay làm gì" request can therefore neither resume a
frontend misconception nor choose deterministically between backend and frontend work.

## Decision

1. `AI-contracts/**` remains the canonical backend control plane.
2. `clients/contracts/**` becomes the canonical frontend learning and delivery control plane.
3. `project-control/active-workstream.yml` is the only cross-workstream routing authority. It
   selects one delivery lane but does not own either lane's ticket, learning, design or evidence.
4. Each workstream owns at most one primary ticket and one next action. Only the routed active
   workstream may advance delivery.
5. Frontend may consume only verified public backend interfaces. It must not import backend
   source, persistence models, internal headers or runtime secrets.
6. Frontend learning progresses from web foundations to Senior technical scope. Every learning
   capability must trace through prerequisite, lesson, project application, test, evidence and
   review.
7. React application scaffolding is outside this CCR. The first application ticket requires its
   own learning, analysis, design, expected-files and readiness gates.

## Resume protocol

For a generic status or continuation request, an agent reads:

1. `project-control/active-workstream.yml`;
2. the selected workstream's canonical `current-work.yml`;
3. its authorized ticket and active checkpoint;
4. repository branch, status and relevant diff; and
5. returns exactly one next action and its completion condition.

Claims such as `done`, `fixed` or file existence trigger verification; they do not advance state.

## Independence and integration

Cross-workstream files are read-only references or generated projections. A frontend record cannot
mark backend evidence verified, and a backend record cannot mark frontend learning passed. The
full-stack projection is complete only when both source capabilities and live-boundary evidence are
independently verified.

## Rollout authorization

This approved CCR authorizes only the paths listed in
`AI-contracts/expected-files/2026-08-11-ccr-014-expected-files.yml`. It explicitly excludes
React/Vite scaffolding, UI implementation, backend application changes and rewriting user-owned
Postman/IDE changes.

## Verification

- `npm run check:docs`
- `npm run check:frontend-control`
- `npm run status:work`
- `node tools/repository/validate-repository.mjs`
- review intended and generated diffs together

## Verdict

`APPROVED`
