# CCR-008 — Repository-wide consistency and generated-projection enforcement

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-07-28
- Approved by: Van Phu Tin
- Approved at: 2026-07-28
- Approval evidence: explicit `duyệt` response after confirming repository-wide scope
- Effective baseline before approval: `PC-2026.5`
- Effective baseline after approval: `PC-2026.6`
- Application/runtime change: none

## Problem

The repository contains canonical contracts and runtime state together with compatibility
projections, handoff text, explanatory Markdown, HTML/CSS viewers, tooling and immutable
historical evidence. Some current-status prose can become stale even when the existing
control-plane validator passes because not every repeated value has an explicit owner or
machine-enforced derivation.

Manual search-and-replace is not a safe solution. A superseded baseline, ticket or decision
may remain valid inside an audit, approved CCR, ADR or evidence artifact that records history.
Rewriting those artifacts to resemble current state would destroy provenance.

## Decision

The project adopts repository-wide consistency enforcement based on four artifact classes:

| Class | Authority and mutation rule |
|---|---|
| `CANONICAL` | Approved contracts, CCR decisions and canonical runtime state; changed only by an authorized decision or observed evidence |
| `GENERATED_PROJECTION` | Derived current-state/context/index content; written only by the declared generator |
| `AUTHORED_CURRENT` | Current documentation, HTML/CSS, tooling and application code; checked by deterministic validators, tests and review |
| `HISTORICAL_EVIDENCE` | Audits, review records, evidence and past decisions; append-only or explicitly superseded, never rewritten merely to remove current-state drift |

`AI-contracts/state/current-work.yml` remains the single canonical source for current stage,
current/candidate ticket, required output and next action.
`AI-contracts/state/contract-status.yml` remains canonical for the effective baseline and
approved/open CCR registry.

The repository MUST provide:

1. a dependency-free Node.js synchronization command that updates declared generated
   projections from canonical sources;
2. a read-only check mode that fails when synchronization would change a tracked projection;
3. deterministic validation for state projections, generated Markdown regions, local
   references and applicable repository structure;
4. a tracked Git pre-commit hook that validates staged work without silently staging or
   committing generated changes;
5. a CI workflow that runs from a clean checkout, fails on generated drift and runs the
   repository validator;
6. negative fixtures or tests proving representative drift is rejected;
7. explicit ownership metadata for every generated target.

## Generated targets

The initial generator owns:

- the projected fields in `AI-contracts/state/current-ticket.yml`;
- `AI-contracts/state/next-action.yml`;
- the current handoff block in `CODEX-CONTEXT.md`;
- the delimited current-status block in `AI-contracts/README.md`.

Additional targets MAY be registered later only when their canonical inputs and generated
boundaries are explicit. The generator MUST NOT infer reviewer verdicts, learning outcomes,
evidence observations or implementation readiness from artifact existence.

## Validation boundaries

Automation MUST enforce every consistency relation that can be represented deterministically,
including:

- canonical/projection equality;
- baseline and approved-CCR registry alignment;
- declared generated-region integrity;
- ticket/capability/contract identifier references;
- Markdown local links and HTML/CSS/JS local asset references;
- expected-files scope when a reviewed manifest exists;
- repository commit-stream constraints where staged-path information is available;
- application format/lint/typecheck/test commands only after real module tooling exists.

Semantic consistency that cannot be proven mechanically remains subject to contract review,
architecture checks, tests and reproducible evidence. Tooling MUST NOT claim that syntactic
validation proves business or architectural correctness.

## Git hook and CI policy

- The pre-commit hook runs a staged-scope guard and repository consistency check.
- The hook MUST fail with a remediation command; it MUST NOT mutate the index.
- Hook activation is an explicit local setup operation because Git does not activate tracked
  hooks merely because they exist in a clone.
- CI runs the generator in check mode and the complete repository validator.
- CI MUST fail if generation would produce a diff.
- CI MUST NOT commit, push, approve, merge or rewrite generated output.
- No Husky, package manager or application scaffold is introduced by this CCR.

## Compatibility and rollout

The automation is repository-wide and applies to Week 4 through Week 10, optimization gates,
handoffs and release work. It is implemented as repository tooling and control-plane changes,
not as Identity application work under `TKT-W04-D02`.

Rollout order:

1. apply this approved CCR and baseline transition;
2. add generator ownership metadata and synchronization;
3. extend validation and add negative tests;
4. add tracked Git hook plus activation command;
5. add CI enforcement;
6. synchronize projections and verify a clean regeneration check.

The current ticket and lifecycle stage do not advance merely because this CCR is approved.

## Risks and controls

- **Historical rewriting:** generated ownership is limited to declared current projections.
- **False confidence:** validator output states its deterministic boundary and does not claim
  semantic proof.
- **Slow commits:** pre-commit uses staged-path classification and dependency-free checks;
  CI runs the full suite.
- **Hook bypass:** CI repeats all mandatory checks from a clean checkout.
- **Generator corruption:** check mode, reviewed diffs and negative fixtures detect drift.
- **Platform variance:** commands use the repository's existing Node.js baseline and tracked
  cross-platform scripts; shell hooks only delegate to Node.

## Verification requirements

- synchronization is idempotent;
- check mode exits zero on synchronized state and non-zero on a drift fixture;
- existing canonical/projection validations continue to pass;
- stale README current status is corrected from canonical state;
- local Markdown and HTML/CSS/JS reference checks pass or report exact limitations;
- pre-commit entrypoint executes the staged guard without modifying the index;
- CI workflow uses clean checkout and the same checked-in commands;
- repository remains without application scaffold or invented application commands.

## Verdict

`APPROVED`
