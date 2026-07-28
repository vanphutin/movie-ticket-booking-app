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
effective_baseline: PC-2026.7
current_stage: STARTUP
ticket_id: TKT-W04-D03
candidate_ticket_id: TKT-W04-D04
active_artifact: null
primary_blocker: NONE
required_output: REPOSITORY_RECONCILIATION_REPORT
evidence_status: MISSING
review_status: NOT_REVIEWED
next_action: RECONCILE_REPOSITORY
completion_condition: Repository reconciliation report for TKT-W04-D03 records canonical state, Git state, active evidence, and any drift or blockers.
```
<!-- GENERATED:CURRENT-HANDOFF:END -->

## Repository snapshot

```yaml
captured_at: "2026-07-28"
repository_root: "D:/back-end/EDUCATION-BACKEND/MovieTicketBookingApp"
branch: codex/control-plane-governance
head_commit_before_control_plane_change: f35852b
working_tree: MODIFIED
application_modules: NOT_SCAFFOLDED
application_tooling: NOT_AVAILABLE
services_running: POSTGRESQL_CONTAINER_ACTIVE
last_application_test: NOT_RUN
automation_validator: AVAILABLE (Observed: PASSED)
```

Observed notes:

- Effective baseline and current ticket values are owned by the generated handoff block above.
- Prerequisite ticket `TKT-W04-D01` is `VERIFIED` and `APPROVED`.
- Authorized current ticket is `TKT-W04-D02` (`CAP-IDN-01`: Identity & Session Data Design).
- Learning Gate `LG-TKT-W04-D02` is `PASSED` (`C3_INTEGRATE` level).
- Analysis Note `2026-07-28-tkt-w04-d02-analysis.md` created with 0 unanswered conflicts.
- Automated validator script `tools/control-plane/validate-control-plane.mjs` verified `PASSED` with exit code `0`.

## Active artifact and output

The current required control-plane output is:

```text
Create Design Note 2026-07-28-tkt-w04-d02-design.md and expected-files manifest for TKT-W04-D02
→ define schema design, table definitions, indexing strategy, and expected-files manifest.
```

## One next action

Proceed to Design stage for `TKT-W04-D02`.

Completion condition:

```text
Design Note 2026-07-28-tkt-w04-d02-design.md and expected-files manifest created and reviewed.
```

## Shutdown

After material work:

1. Update `AI-contracts/state/current-work.yml` from observations or explicit decisions.
2. Run `node tools/control-plane/sync-control-plane.mjs`.
3. Run `node tools/repository/validate-repository.mjs`.
4. Review canonical/generated diffs together.
5. Report one next action and its completion condition.
