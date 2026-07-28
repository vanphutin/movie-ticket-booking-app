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

```yaml
schema_version: 1
canonical_state: AI-contracts/state/current-work.yml
effective_baseline: PC-2026.5
current_stage: ANALYSIS
ticket_id: TKT-W04-D02
candidate_ticket_id: TKT-W04-D03
active_artifact: AI-contracts/audits/2026-07-28-tkt-w04-d02-learning.md
primary_blocker: NONE
required_output: ANALYSIS_ARTIFACT
evidence_status: MISSING
review_status: NOT_REVIEWED
next_action: PROCEED_TO_ANALYSIS
completion_condition: Analysis artifact 2026-07-28-tkt-w04-d02-analysis.md completed and reviewed.
```

## Repository snapshot

```yaml
captured_at: "2026-07-28"
repository_root: "D:/back-end/EDUCATION-BACKEND/MovieTicketBookingApp"
branch: codex/control-plane-governance
head_commit_before_control_plane_change: 8ea945a
working_tree: MODIFIED
application_modules: NOT_SCAFFOLDED
application_tooling: NOT_AVAILABLE
services_running: POSTGRESQL_CONTAINER_ACTIVE
last_application_test: NOT_RUN
automation_validator: AVAILABLE (Observed: PASSED)
```

Observed notes:

- `PC-2026.5` is the effective `APPROVED_FOR_TRAINING` baseline (CCR-001 through CCR-007 approved).
- Prerequisite ticket `TKT-W04-D01` is `VERIFIED` and `APPROVED`.
- Authorized current ticket is `TKT-W04-D02` (`CAP-IDN-01`: Identity & Session Data Design).
- Learning Gate `LG-TKT-W04-D02` is `PASSED` (`C3_INTEGRATE` level, `2026-07-28-tkt-w04-d02-learning.md`).
- Automated validator script `tools/control-plane/validate-control-plane.mjs` verified `PASSED` with exit code `0`.

## Active artifact and output

The current required control-plane output is:

```text
Create Analysis Note 2026-07-28-tkt-w04-d02-analysis.md for TKT-W04-D02
→ evaluate table boundaries, credential/session separation, password/token hashing strategies, and constraints.
```

## One next action

Proceed to Analysis stage for `TKT-W04-D02`.

Completion condition:

```text
Analysis artifact 2026-07-28-tkt-w04-d02-analysis.md completed and reviewed.
```

## Shutdown

After material work:

1. Update `AI-contracts/state/current-work.yml` from observations or explicit decisions.
2. Synchronize affected compatibility projections.
3. Refresh this compact handoff.
4. Run `node tools/control-plane/validate-control-plane.mjs` (Observed outcome: `PASSED`, exit code `0`).
5. Report one next action and its completion condition.
