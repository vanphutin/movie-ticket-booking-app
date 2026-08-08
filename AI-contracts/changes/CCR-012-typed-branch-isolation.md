# CCR-012 — Typed branch naming and isolation policy

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-08-01
- Approved by: Van Phu Tin
- Approved at: 2026-08-01
- Approval evidence: explicit `DUYỆT 12` response after accepting the typed branch list
- Effective baseline before approval: `PC-2026.9`
- Effective baseline after approval: `PC-2026.10`
- Application/runtime change: none

## Problem

CCR-006 separates commit streams, but CCR-007 names every autonomous branch
`codex/<work-unit>` and permits several streams on one work-unit branch. The namespace
describes the tool that created the branch instead of the change being reviewed, and it
does not make feature, fix, migration, documentation and contract work visibly distinct.

The effective Git workflow also mentions `feature/<ticket-id>-slug` and
`fix/<ticket-id>-slug`, creating naming drift with CCR-007.

## Decision

All contributors, including Codex, MUST use the same typed branch convention for new
work units. The `codex/` namespace is removed from the project convention.

| Branch type | Required pattern | Primary purpose |
|---|---|---|
| Feature | `feature/<ticket-id>-<slug>` | New product behavior |
| Fix | `fix/<ticket-id>-<slug>` | Defect or regression correction |
| Refactor | `refactor/<ticket-id>-<slug>` | Behavior-preserving product restructuring |
| Migration | `migration/<ticket-id>-<slug>` | App-owned schema/data migration work |
| Documentation | `docs/<work-unit>-<slug>` | Standalone project or learning documentation |
| Chore | `chore/<work-unit>-<slug>` | Repository tooling, CI or maintenance |
| Contract | `contract/<ccr-id>-<slug>` | Contract or governance policy change |

Identifiers and slugs MUST be lowercase in the branch ref. Ticket-backed product
branches MUST contain the normalized ticket ID. Contract branches MUST contain the
normalized CCR ID. A branch is named for a reviewable work unit, never merely for a
directory.

## Branch isolation

Every branch MUST declare one primary commit stream under CCR-006.

- `feature`, `fix`, `refactor` and `migration` branches have `PRODUCT_CODE` as their
  primary stream.
- `contract` branches have `PRODUCT_CONTRACT` as their primary stream.
- `docs` branches have `PROJECT_DOCS` or `LEARNING` as their primary stream.
- `chore` branches have `REPOSITORY_TOOLING`, `DOCS_TOOLING` or `CONTROL_PLANE` as their
  primary stream.
- A `docs` or `contract` branch MUST NOT contain `apps/**` product implementation.
- A product branch MUST NOT contain an unrelated CCR, curriculum change, viewer refresh,
  repository-tooling change or another ticket's work.

A product branch MAY carry supporting artifacts required to review and hand off the same
ticket, including its tests, app-local documentation, evidence manifest and lifecycle
state/projections. Every supporting path MUST be authorized by the ticket or reviewed
expected-files manifest and committed in its own CCR-006 stream. This exception does not
authorize unrelated documentation or governance work.

## Existing branches and transitions

Branches published before 2026-08-01 under `codex/*` remain valid historical evidence and
MUST NOT be renamed or rewritten merely to satisfy this policy. In-progress
`codex/tkt-w04-d05-auth-vertical-slice` remains the authorized D05 branch through its
handoff. The typed convention applies to the next newly created work-unit branch.

CCR-012 supersedes only the `codex/<work-unit>` naming clauses of CCR-007 and CCR-010.
Their authority and safety controls remain effective: autonomous local commits,
non-force branch push, Draft PR creation, mandatory publication checkpoints, and the
prohibitions on default-branch push, force-push, merge, tag, release, deletion and
published-history rewrite.

## Enforcement

Repository validation MUST reject a new work-unit branch when:

- its prefix is outside the approved typed set;
- a ticket-backed product branch omits its normalized ticket ID;
- a contract branch omits its normalized CCR ID; or
- a branch/changed-path combination violates the primary-stream isolation rules.

Historical checkpoint records and historical documents retain their observed branch
names. Validation MUST distinguish those records from newly created work units.

## Alternatives considered

### Selected: typed branches shared by developer and Codex

The branch communicates the kind of change and uses the same workflow for every
contributor.

### Rejected: keep `codex/` as an outer namespace

`codex/feature/...` identifies the creating tool but adds no product-review information
and makes the repository convention tool-specific.

### Rejected: one branch per commit stream with no supporting-artifact exception

This produces several dependent PRs for one ticket and can separate implementation from
the evidence and handoff required to review it safely.

## Verification

- `npm run check:docs`
- `node tools/control-plane/sync-control-plane.mjs --check`
- `node tools/repository/validate-repository.mjs`
- review the diff to confirm no `apps/**` runtime file changed

## Rollback

Rollback requires a follow-up CCR. Existing typed branches and historical approval
records MUST NOT be rewritten. A replacement policy may change names for future work
units only.

## Verdict

`APPROVED`
