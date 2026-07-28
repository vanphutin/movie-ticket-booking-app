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
current_stage: STARTUP
ticket_id: TKT-W04-D02
candidate_ticket_id: TKT-W04-D03
active_artifact: AI-contracts/audits/2026-07-28-tkt-w04-d02-startup.md
primary_blocker: NONE
required_output: OBSERVED_LEARNING_CHECKPOINT
evidence_status: MISSING
review_status: NOT_REVIEWED
next_action: ADVANCE_TO_LEARNING
completion_condition: Observed learning checkpoint LG-TKT-W04-D02 evaluated and PASSED.
```

## Repository snapshot

```yaml
captured_at: "2026-07-28"
repository_root: "D:/back-end/EDUCATION-BACKEND/MovieTicketBookingApp"
branch: codex/control-plane-governance
head_commit_before_control_plane_change: 68cf586
working_tree: MODIFIED
application_modules: NOT_SCAFFOLDED
application_tooling: NOT_AVAILABLE
services_running: POSTGRESQL_CONTAINER_ACTIVE
last_application_test: NOT_RUN
automation_validator: AVAILABLE (Observed: PASSED)
```

Observed notes:

- `PC-2026.5` is the effective `APPROVED_FOR_TRAINING` baseline (CCR-001 through CCR-007 approved).
- Prerequisite ticket `TKT-W04-D01` is `VERIFIED` and `APPROVED` (commit `68cf586`).
- Authorized current ticket is `TKT-W04-D02` (`CAP-IDN-01`: Identity & Session Data Design).
- Candidate ticket is `TKT-W04-D03`.
- Startup reconciliation report created (`2026-07-28-tkt-w04-d02-startup.md`).
- Automated validator script `tools/control-plane/validate-control-plane.mjs` verified `PASSED` with exit code `0`.

## Active artifact and output

The current required control-plane output is:

```text
Advance to Learning Gate LG-TKT-W04-D02
→ evaluate 5 core concepts: Identity vs Credential vs Session, Password Hash vs Token Hash, Refresh Session & Anti-replay, Email Unique Constraint, Domain Ownership & Invariants.
```

## One next action

Advance to Learning Gate `LG-TKT-W04-D02`.

Completion condition:

```text
Observed learning checkpoint LG-TKT-W04-D02 evaluated and PASSED.
```

## Shutdown

After material work:

1. Update `AI-contracts/state/current-work.yml` from observations or explicit decisions.
2. Synchronize affected compatibility projections.
3. Refresh this compact handoff.
4. Run `node tools/control-plane/validate-control-plane.mjs` (Observed outcome: `PASSED`, exit code `0`).
5. Report one next action and its completion condition.
