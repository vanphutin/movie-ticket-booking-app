# CCR-010 — Mandatory Git checkpoint before work-unit transition

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-07-29
- Approved by: Van Phu Tin
- Approved at: 2026-07-29
- Approval evidence: explicit approval to create CCR-010 and repair the current Git state
- Effective baseline before approval: `PC-2026.7`
- Effective baseline after approval: `PC-2026.8`
- Application/runtime change: none

## Problem

CCR-006 authorizes autonomous commits and CCR-007 authorizes non-force publishing, but
neither contract makes publication a transition condition. The repository therefore
advanced canonical state from `TKT-W04-D03` to `TKT-W04-D04` while the D03 branch was
eight commits ahead of its upstream and the D03/D04 handoff changes remained dirty.

That state mixes work-unit ownership, makes a handoff unavailable to the remote reviewer
and allows a new ticket to start before the previous checkpoint is recoverable.

## Decision

Before canonical state changes from one ticket or coherent work unit to another, Codex
MUST complete the outgoing work-unit publication gate:

1. classify every outgoing changed path under CCR-006;
2. preserve ambiguous or unrelated changes unstaged and record them as blockers;
3. run the smallest applicable checks and record limitations truthfully;
4. commit every authorized outgoing change in coherent commit streams;
5. confirm the branch is not the default branch;
6. push the branch non-force and verify the local checkpoint is reachable from the
   remote-tracking branch;
7. create or update a Draft PR with scope, evidence, limitations and rollback;
8. record a machine-readable publication checkpoint; and
9. only then authorize the next work unit and create or switch to its
   `codex/<work-unit>` branch.

`HANDOFF` is not complete while the publication gate is incomplete. A failed check,
ambiguous ownership, failed push, missing remote, missing Draft PR or unverified remote
reachability keeps the outgoing ticket current and records one blocking next action.

## Publication checkpoint

`AI-contracts/state/work-unit-checkpoint.yml` records the last completed transition:

- outgoing and incoming work-unit IDs;
- outgoing branch;
- published checkpoint commit;
- remote-tracking ref;
- Draft PR URL;
- verification command and timestamp.

The checkpoint commit is the last outgoing commit that must be published before the
canonical ticket transition. Later transition-state commits may exist on the incoming
branch and do not make the recorded checkpoint circular.

## Enforcement

Repository validation MUST reject:

- a `STARTUP` current ticket whose branch name does not contain the normalized ticket ID;
- a ticket transition without a checkpoint naming the current incoming ticket;
- a checkpoint whose outgoing commit is absent locally;
- a checkpoint whose outgoing commit is not an ancestor of its recorded remote-tracking
  ref;
- a checkpoint recorded on the default branch; or
- placeholder publication evidence.

The validator is local and read-only. It verifies the fetched remote-tracking ref; the
publish workflow MUST run `git fetch` or verify the push result before relying on it.

## Current-state remediation

For the observed D03/D04 drift:

1. keep all D03 work on `codex/tkt-w04-d03-token-gateway-design`;
2. validate, commit and publish the authorized D03 and CCR-010 streams;
3. update Draft PR `#3`;
4. record the published D03 checkpoint;
5. create `codex/tkt-w04-d04-api-rbac-contract`;
6. move the D04 startup transition and its generated projections to that branch;
7. validate, commit, push and open a Draft PR for D04.

No force-push, default-branch push, merge, tag, release, branch deletion or history
rewrite is authorized.

## Verdict

`APPROVED`
