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
ticket_id: TKT-W04-D01
candidate_ticket_id: TKT-W04-D02
active_artifact: AI-contracts/audits/2026-07-28-tkt-w04-d01-analysis.md
primary_blocker: NONE
required_output: ANALYSIS_REVIEW
evidence_status: OBSERVED
review_status: NOT_REVIEWED
next_action: REVIEW_ANALYSIS_ARTIFACT
completion_condition: Reviewer confirms analysis artifact completeness and authorizes transition to DESIGN stage.
```

## Repository snapshot

```yaml
captured_at: "2026-07-28"
repository_root: "D:/back-end/EDUCATION-BACKEND/MovieTicketBookingApp"
branch: main
head_commit_before_control_plane_change: 099d664
working_tree: MODIFIED
application_modules: NOT_SCAFFOLDED
application_tooling: NOT_AVAILABLE
services_running: POSTGRESQL_CONTAINER_ACTIVE
last_application_test: NOT_RUN
```

Observed notes:

- `PC-2026.5` is the effective `APPROVED_FOR_TRAINING` baseline.
- CCR-006 authorizes autonomous local commits split by repository stream; it does not
  authorize unsafe history changes.
- CCR-007 authorizes `codex/<work-unit>` branches, verified non-force push and Draft PR
  creation/update; direct-main push, force-push, merge, tag/release and history rewrite
  remain forbidden.
- Foundation Gate `FG-001` is `VERIFIED` with final rubric score `12/12`.
- Learning Gate `LG-TKT-W04-D01` is `PASSED` (`C4_DEFEND` level).
- `TKT-W04-D01` Analysis Note artifact is created with 0 unanswered conflicts:
  `AI-contracts/audits/2026-07-28-tkt-w04-d01-analysis.md`.
- Design and Implementation stages are NOT yet open.

## Active artifact and output

The current required control-plane output is:

```text
Review Analysis Artifact for TKT-W04-D01
→ AI-contracts/audits/2026-07-28-tkt-w04-d01-analysis.md
→ verify actor, outcome, scope, out-of-scope, assumptions, invariants, owners, trust boundaries, failures, security risks, contract IDs, and 0 unanswered conflicts
→ authorize transition to DESIGN stage
```

## One next action

Review `TKT-W04-D01` Analysis Note Artifact.

Completion condition:

```text
Reviewer confirms analysis artifact completeness and authorizes transition to DESIGN stage.
```

## Shutdown

After material work:

1. Update `AI-contracts/state/current-work.yml` from observations or explicit decisions.
2. Synchronize affected compatibility projections.
3. Refresh this compact handoff.
4. Run `node tools/control-plane/validate-control-plane.mjs`.
5. Report one next action and its completion condition.
