# CCR-007 — Autonomous branch and publish workflow

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Approved by: Van Phu Tin
- Approved at: 2026-07-28
- Approval evidence: explicit `phê duyệt` response to the proposed CCR-007 scope
- Effective baseline before approval: `PC-2026.4`

## Decision

Codex is authorized to:

1. create and switch to a `codex/<work-unit>` branch for an authorized ticket or approved
   CCR;
2. create autonomous local commits under CCR-006;
3. non-force push that branch after applicable verification;
4. create or update a Draft Pull Request;
5. move the five unpushed governance commits currently above `099d664` from local `main`
   onto a preserved feature branch, then restore local `main` to `099d664` only after the
   remote feature branch is verified.

Codex is not authorized to:

- push directly to `main`;
- force-push;
- auto-merge or enable auto-merge;
- delete local or remote branches without a separate reason/approval;
- create a release/tag;
- rewrite published history.

## Branch policy

> Naming amendment: CCR-012 supersedes the `codex/<work-unit>` default for work-unit
> branches created on or after 2026-08-01. New branches use the typed convention in
> CCR-012. Historical and already-published `codex/*` branches remain valid.

- Branch unit is a ticket, approved CCR or coherent remediation—not a folder.
- Original default name: `codex/<ticket-or-ccr>-<short-outcome>` (historical only after
  CCR-012).
- A branch may contain multiple commit streams when they serve the same reviewed work
  unit; commits remain independently reviewable.
- Before switching/creating a branch, preserve a mixed worktree and classify it under
  CCR-006.

## Publish gate

Codex may push and open/update a Draft PR only when:

- branch is not `main`/default;
- staged/working tree ownership is understood;
- commits are coherent and secret-reviewed;
- relevant checks passed or limitations are explicit;
- remote is verified;
- push is fast-forward/non-force;
- PR body records scope, non-scope, contracts, evidence and limitations.

The PR remains Draft until the ticket reaches its review/readiness condition. Merge always
requires an explicit reviewer decision.

## Current-history migration

Safety sequence:

1. Create `codex/control-plane-governance` at current `main` HEAD.
2. Apply this CCR and commit it on that branch.
3. Push the branch and verify remote SHA.
4. Open a Draft PR targeting remote default branch.
5. Switch local `main` to the known baseline `099d664` using a local-only reset.
6. Verify the feature branch still points to the full preserved history.

No remote `main` update or force operation occurs.

## Verdict

`APPROVED`
