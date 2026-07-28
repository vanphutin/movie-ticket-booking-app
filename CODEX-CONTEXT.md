# CODEX CONTEXT — Movie Ticket Booking Backend

> Compact session handoff only. Canonical runtime state is
> `AI-contracts/state/current-work.yml`; effective contracts live under
> `AI-contracts/`. Do not copy technical contracts into this file.

## Startup

1. Read `AGENTS.md`.
2. Read the canonical state below.
3. Inspect the real branch, status, recent log and relevant diff.
4. Read the authorized current ticket and only its referenced contracts.
5. Report drift, unverified claims and exactly one next action before delivery work.

## Current handoff

<!-- GENERATED:CURRENT-HANDOFF:START -->
```yaml
schema_version: 1
canonical_state: AI-contracts/state/current-work.yml
effective_baseline: PC-2026.8
current_stage: HANDOFF
ticket_id: TKT-W04-D03
candidate_ticket_id: TKT-W04-D04
active_artifact: AI-contracts/readiness/2026-07-28-tkt-w04-d03-readiness.yml
primary_blocker: NONE
required_output: PUBLISHED_WORK_UNIT_CHECKPOINT
evidence_status: OBSERVED
review_status: VERIFIED
next_action: PUBLISH_WORK_UNIT_CHECKPOINT
completion_condition: D03 authorized changes committed; branch pushed non-force; checkpoint commit reachable from origin/codex/tkt-w04-d03-token-gateway-design; Draft PR updated; publication checkpoint recorded.
```
<!-- GENERATED:CURRENT-HANDOFF:END -->

## Shutdown

After material work:

1. Update `AI-contracts/state/current-work.yml` from observations or explicit decisions.
2. Run `node tools/control-plane/sync-control-plane.mjs`.
3. Run `node tools/repository/validate-repository.mjs`.
4. Review canonical/generated diffs together.
5. Report one next action and its completion condition.
