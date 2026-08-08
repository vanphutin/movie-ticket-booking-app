# CCR-013 — Develop integration, merge cadence and stacked PR policy

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-08-01
- Approved by: Van Phu Tin
- Approved at: 2026-08-01
- Approval evidence: explicit `DUYỆT CCR-013` after selecting `develop`, squash merge,
  one-parent/one-child stacks and autonomous Codex merge for `develop` and `main`
- Effective baseline before approval: `PC-2026.10`
- Effective baseline after approval: `PC-2026.11`
- Application/runtime change: none

## Problem

CCR-010 requires a published Draft PR before transition but does not require a dependent
work unit's prerequisite to be merged. The repository consequently accumulated the open
stack `#3 -> #4 -> #5 -> #6`. New work inherited every earlier unmerged commit and the
Git graph became a growing delivery chain instead of independently integrated changes.

## Decision

### Integration branches

- `develop` is the daily integration branch.
- `main` is the milestone/release branch.
- New `feature/*`, `fix/*`, `refactor/*`, `migration/*`, `docs/*`, `chore/*` and
  `contract/*` work units MUST start from the fetched `origin/develop` and normally open
  a PR to `develop`.
- `release/<milestone>-<slug>` starts from `develop` and opens a PR to `main`.
- Direct pushes to `develop` and `main` remain prohibited.
- Hotfix automation is outside this CCR and requires separate authority.

### Merge cadence

A dependent work unit MUST NOT start merely because its prerequisite has a pushed branch
or Draft PR. The prerequisite MUST be `VERIFIED`, have all required checks pass, and be
squash-merged into `develop`. Independent work units MAY proceed in parallel from the
same fetched `origin/develop` base.

The normal lifecycle is:

`branch -> Draft PR -> verification -> review -> VERIFIED -> ready -> squash merge -> remote verification -> handoff`

### Autonomous squash merge

Codex MAY squash-merge a work-unit PR into `develop`, and MAY squash-merge a milestone
release PR from `develop` into `main`, without asking again only when all applicable
gates below are observed:

1. the PR is open, non-Draft, conflict-free and targets the required base;
2. authorization, lifecycle, expected-files and contract scope are valid;
3. acceptance review is `VERIFIED` and evidence is reproducible;
4. every required CI/check is successful;
5. no blocking finding, change request or unresolved blocking review thread remains;
6. source branch contains the current integration base and its final diff is reviewed;
7. canonical state/projections are synchronized and repository validation passes; and
8. GitHub branch protection permits the merge without an administrative bypass.

Missing or unreadable evidence is not success. Codex MUST NOT dismiss reviews, override
protection, push directly, force-push, infer `VERIFIED`, tag, deploy, publish a release,
delete a branch or rewrite published history under this authority.

### Stacked PR exception

The maximum default stack is one parent PR plus one child PR. A child is permitted only
for a concrete code/type/schema dependency or a reviewed decomposition that cannot yet
target `develop`. Its PR and machine-readable state MUST record parent PR/branch, base
commit, dependency reason, merge order and unstack condition.

The child MUST NOT merge first. After the parent is squash-merged, the child MUST be
retargeted to `develop`, updated against fetched `origin/develop`, reduced to its own
scope, reverified and reviewed again. A third PR layer is rejected unless a later CCR
grants a specific exception.

### Milestone release

A release PR may be created when every core ticket in the milestone/week is `VERIFIED`
and integrated into `develop`. Codex may squash-merge it to `main` only when milestone
integration/E2E evidence, migration and rollback review, repository checks and remote
branch protection all pass. Merge authority does not authorize tagging or deployment.

## Bootstrap and current stack

The selected bootstrap is merge-first, not history rewrite:

1. remediate and review the existing PR chain in dependency order;
2. squash-merge eligible prerequisite PRs into `main` under their observed gates;
3. complete and merge D05;
4. retarget and verify CCR-012 PR `#6` against `main`, then merge it;
5. create `develop` from fetched `origin/main` and verify equal starting SHAs; and
6. activate the new base for the next work unit.

Until this sequence completes, integration status is `PENDING_BOOTSTRAP`. No new remote
stack layer or `develop` branch may be created. Historical branches and PRs remain valid
evidence and MUST NOT be rewritten merely to improve the graph.

At approval time PRs `#3` through `#6` are Draft with failing consistency checks, D05 is
`IMPLEMENTATION`, and its evidence is `MISSING`. Therefore no current PR satisfies the
autonomous merge gate and no merge is authorized by inference from this approval.

## Amendments

- CCR-013 extends CCR-007 with gated autonomous squash merge authority.
- CCR-013 strengthens CCR-010: a dependent transition requires prerequisite integration,
  not only publication.
- CCR-013 sets `origin/develop` as the post-bootstrap base for CCR-012 typed branches.
- CCR-006 commit-stream separation remains unchanged.

## Verification and rollout

- synchronize canonical projections;
- validate branch/base, stack depth and integration-state records locally where
  mechanically observable;
- use GitHub checks/review/mergeability as remote merge evidence;
- run `npm run check:docs` and `node tools/repository/validate-repository.mjs`;
- confirm no `apps/**` runtime path changed.

## Rollback

Rollback requires a follow-up CCR. Existing merge commits, squash commits, PR evidence
and historical branch refs MUST NOT be rewritten. Until bootstrap completes, rollback
does not require deleting an integration branch because `develop` does not yet exist.

## Verdict

`APPROVED`
