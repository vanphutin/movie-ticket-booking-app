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
current_stage: IMPLEMENTATION
ticket_id: TKT-W04-D01
candidate_ticket_id: TKT-W04-D02
active_artifact: AI-contracts/readiness/2026-07-28-tkt-w04-d01-readiness.yml
primary_blocker: NONE
required_output: SCOPED_DIFF_AND_SELF_REVIEW
evidence_status: OBSERVED
review_status: APPROVED
next_action: EXECUTE_IMPLEMENTATION
completion_condition: Scoped control-plane changes and expected files manifest are verified with validator passing.
```

## Repository snapshot

```yaml
captured_at: "2026-07-28"
repository_root: "D:/back-end/EDUCATION-BACKEND/MovieTicketBookingApp"
branch: codex/control-plane-governance
head_commit_before_control_plane_change: 93a4f45
working_tree: MODIFIED
application_modules: NOT_SCAFFOLDED
application_tooling: NOT_AVAILABLE
services_running: POSTGRESQL_CONTAINER_ACTIVE
last_application_test: NOT_RUN
automation_validator: AVAILABLE (Observed: PASSED)
```

Observed notes:

- `PC-2026.5` is the effective `APPROVED_FOR_TRAINING` baseline (CCR-001 through CCR-007 approved).
- Foundation Gate `FG-001` is `VERIFIED` with final rubric score `12/12`.
- Learning Gate `LG-TKT-W04-D01` is `PASSED` (`C4_DEFEND` level).
- Analysis Note artifact is `APPROVED` by reviewer with 0 unanswered conflicts.
- Design Note and Expected-Files Manifest were approved after V4 remediation.
- Readiness Verdict evaluated and `READY` (`2026-07-28-tkt-w04-d01-readiness.yml`); stage advanced to `IMPLEMENTATION`.
- Application code is NOT scaffolded (`NOT_SCAFFOLDED`).
- Automated validator script `tools/control-plane/validate-control-plane.mjs` is present in working tree and verified `PASSED` with exit code `0`.

## Active artifact and output

The current required control-plane output is:

```text
Execute implementation for TKT-W04-D01
→ perform scoped control-plane changes strictly within expected-files manifest
→ maintain zero application code scaffolding for D01
```

## One next action

Execute implementation for `TKT-W04-D01`.

Completion condition:

```text
Scoped control-plane changes and expected files manifest are verified with validator passing.
```

## Shutdown

After material work:

1. Update `AI-contracts/state/current-work.yml` from observations or explicit decisions.
2. Synchronize affected compatibility projections.
3. Refresh this compact handoff.
4. Run `node tools/control-plane/validate-control-plane.mjs` (Observed outcome: `PASSED`, exit code `0`).
5. Report one next action and its completion condition.
