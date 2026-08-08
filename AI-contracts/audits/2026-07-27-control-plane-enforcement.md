# Audit — Control-plane enforcement

Date: 2026-07-27
Scope: project operating control plane only
Application scaffold/code: none

## Approved outcome

Make Codex follow one canonical stage, one authorized ticket and one next action. Require
an explicit artifact at every stage, provide expected-file guidance without writing the
learner's business implementation, and keep the workflow stable as the repository grows.

## Repository observations

- Effective baseline is `PC-2026.2`.
- `CCR-001` through `CCR-004` are approved.
- `FG-001` has no reviewer-observed evidence.
- `apps/client` and `apps/server` exist, but no application project marker or runnable
  application format/lint/test command was observed.
- The module scanner returned `modules: []`.
- The previous `CODEX-CONTEXT.md` duplicated contracts and long session history.
- `state/current-ticket.yml` still listed `CCR-001` as a blocker even though it was
  approved.

## Decisions

1. `AI-contracts/state/current-work.yml` is canonical for stage, current/candidate ticket,
   blocker, required output and next action.
2. `current-ticket.yml`, `next-action.yml` and `CODEX-CONTEXT.md` remain compatibility
   projections checked for drift.
3. Root `AGENTS.md` enforces the repository-wide operating workflow. No nested module
   guideline is created before a module/tooling decision exists.
4. Each delivery stage has a required artifact and explicit transition condition.
5. An expected-files manifest records responsibility, contract basis, allowed content,
   forbidden content and verification before application changes.
6. The validator is read-only and uses built-in Node.js modules; it does not mutate
   evidence or verdicts.

## Outputs

- `AGENTS.md`
- `AI-contracts/state/current-work.yml`
- state transition and artifact matrix in `AI-contracts/state/README.md`
- current-work and ticket schemas
- analysis, expected-files, readiness and acceptance-review templates
- `tools/control-plane/validate-control-plane.mjs`
- compact `CODEX-CONTEXT.md`

## Verification evidence

Prediction:

> Validation will pass only when canonical state, compatibility projections and compact
> handoff agree; it will preserve `FG-001` as the only delivery blocker.

Command:

```text
node tools/control-plane/validate-control-plane.mjs
```

Working directory:

```text
D:/back-end/EDUCATION-BACKEND/MovieTicketBookingApp
```

Observed result:

- Exit code: `0`
- Effective baseline: `PC-2026.2`
- Current stage: `FOUNDATION_GATE`
- Authorized ticket: none
- Candidate ticket: `TKT-W04-D01`
- Next action: `REVIEW_FOUNDATION_GATE_EVIDENCE`
- Warning correctly reports that no root `package.json` exists and no npm script is
  claimed.

Additional command:

```text
git diff --check
```

Observed result:

- Exit code: `0`
- No whitespace error was reported.
- Git emitted line-ending conversion warnings for existing Windows working-tree policy;
  these are not validation failures.

## Review

Review state: `CONDITIONAL_PASS`

The control plane is internally valid and no application scope was opened. The remaining
project-level blocker is intentionally unchanged: `FG-001` needs learner evidence and a
reviewer verdict before `TKT-W04-D01` may be authorized.

## One next action

Review learner-supplied Foundation Gate evidence against the canonical rubric.

Completion condition: `FG-001` has an evidence-backed reviewer verdict.
