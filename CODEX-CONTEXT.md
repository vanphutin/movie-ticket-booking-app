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
current_stage: HANDOFF
ticket_id: TKT-W04-D01
candidate_ticket_id: TKT-W04-D02
active_artifact: AI-contracts/audits/2026-07-28-tkt-w04-d01-review.yml
primary_blocker: NONE
required_output: CANONICAL_STATE_UPDATE
evidence_status: OBSERVED
review_status: APPROVED
next_action: AUTHORIZE_CANDIDATE_TICKET
completion_condition: Candidate ticket TKT-W04-D02 DoR and startup prerequisites evaluated and authorized.
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
- Readiness Verdict evaluated and `READY` (`2026-07-28-tkt-w04-d01-readiness.yml`).
- Implementation completed and committed in two stream-isolated commits (`b47822c`, `1588b87`). Zero application code scaffolded (`NOT_SCAFFOLDED`).
- Verification evidence manifest created (`2026-07-28-tkt-w04-d01-verification.yml`).
- Acceptance review verdict created and `APPROVED` (`2026-07-28-tkt-w04-d01-review.yml`).
- Automated validator script `tools/control-plane/validate-control-plane.mjs` is present in working tree and verified `PASSED` with exit code `0`.

## Active artifact and output

The current required control-plane output is:

```text
Authorize candidate ticket TKT-W04-D02 for startup
→ evaluate DoR and startup prerequisites for TKT-W04-D02
```

## One next action

Authorize candidate ticket `TKT-W04-D02`.

Completion condition:

```text
Candidate ticket TKT-W04-D02 DoR and startup prerequisites evaluated and authorized.
```

## Shutdown

After material work:

1. Update `AI-contracts/state/current-work.yml` from observations or explicit decisions.
2. Synchronize affected compatibility projections.
3. Refresh this compact handoff.
4. Run `node tools/control-plane/validate-control-plane.mjs` (Observed outcome: `PASSED`, exit code `0`).
5. Report one next action and its completion condition.
