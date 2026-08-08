# CCR-012 — Cross-session coding action and checkpoint policy

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-08-02
- Approved by: Van Phu Tin
- Approved at: 2026-08-02
- Approval evidence: explicit `oke, duyệt` response after scope clarification
- Effective baseline before approval: `PC-2026.9`
- Proposed baseline after approval: `PC-2026.10`
- Application/runtime change: none

## Problem

The control plane currently records one canonical next action at ticket level. During
implementation, however, coding normally advances through smaller test-driven steps such
as RED, GREEN, REFACTOR and boundary-specific verification. Those steps can be described
in chat without being persisted in the repository.

This creates two related failures:

1. a short instruction such as “write the RED test for LogoutUseCase” identifies an
   operation but does not adequately explain the business problem, risk, expected
   behavior, affected files, exclusions or completion evidence to the learner; and
2. a later chat session can read the current ticket but cannot reliably recover the last
   observed coding step, so it may recommend a different next step based on inference.

Chat history is not a canonical project record. A learner statement such as “done” is
also not sufficient evidence that a coding step completed. The project needs a
service-independent presentation contract for coding instructions and a subordinate,
machine-readable implementation cursor that can be resumed across sessions.

## Decision

Upon approval, every newly assigned coding action whose allowed scope includes a path
under `apps/**` MUST be presented as a **Coding Action Card** and projected into a
canonical **Coding Checkpoint**.

This policy applies uniformly to every backend service, gateway, frontend application,
shared package and future application located under `apps/**`. It governs collaboration
and control-plane state only; it does not prescribe a service's runtime architecture.
It applies repository-wide across all roadmap weeks, phases, milestones, current and
future tickets, and is not limited to Week 4 or `TKT-W04-D05`.

### Coding Action Card

When assigning a new coding step, Codex MUST provide the following sections in language
appropriate to the learner:

1. **Current position** — ticket, feature or boundary, architectural layer, execution or
   TDD phase, previous observed step and current step identifier.
2. **Problem to solve** — the business or technical scenario expressed independently of
   the intended implementation.
3. **Why this step is required** — the failure, risk, invariant, contract or learning
   objective that makes the work necessary.
4. **Required behavior** — concrete scenarios and externally observable outcomes,
   preferably expressed as Given/When/Then when that improves precision.
5. **Affected files** — exact allowed paths, whether each path is created or modified,
   and the responsibility of each file. Every path MUST already be authorized by the
   reviewed expected-files manifest.
6. **Concrete coding work** — types, ports, use cases, tests, fakes, assertions or wiring
   to write at the current step, at enough detail for the learner to begin without
   guessing the intended boundary.
7. **Explicit exclusions** — adjacent work that is intentionally not part of the step,
   including later TDD phases, adapters, transports, migrations or refactors when
   applicable.
8. **Verification and completion condition** — prediction, exact command, working
   directory, expected result and the condition that distinguishes correct completion
   from an unrelated failure.

The card MUST lead with the problem and outcome rather than merely listing files or
commands. It MUST distinguish a clean RED result from compilation, import, configuration
or test-fixture failures. It MUST NOT claim a command passed unless that result was
observed.

The complete card is required when a step is first assigned or materially changed.
Routine progress replies within the same unchanged step MAY use a compact update that
references the stable step identifier and reports only observed delta, remaining work and
the unchanged completion condition.

### Coding Checkpoint

The canonical current-work state MUST support at most one optional subordinate
`coding_checkpoint`. When present, it MUST contain at least:

```yaml
coding_checkpoint:
  step_id: LOGOUT-RED-01
  ticket_id: TKT-W04-D05
  scope: APPLICATION
  feature: LOGOUT
  layer: APPLICATION
  phase: RED
  status: READY_TO_START
  problem: "Revoke an active refresh-token family without making repeated logout fail."
  reason: "Logout must be replay-safe and must not disclose token state."
  previous_observed_step: REFRESH-GREEN-AND-INTEGRATION
  allowed_paths:
    - apps/identity-service/src/application/logout.use-case.ts
    - apps/identity-service/src/application/ports/logout-session.port.ts
    - apps/identity-service/test/unit/auth-use-cases.spec.ts
  required_behaviors:
    - ACTIVE_FAMILY_REVOKED_ATOMICALLY
    - REPEATED_LOGOUT_SUCCEEDS_AS_NO_OP
    - INVALID_TOKEN_FAILURE_IS_NEUTRAL
  exclusions:
    - TYPEORM_ADAPTER_IMPLEMENTATION
    - NEST_HTTP_TRANSPORT
  verification:
    working_directory: apps
    command: npm run test:unit
    expected_result: CLEAN_RED
  completion_condition: >-
    Existing tests pass and the new typed LogoutUseCase tests fail only because the
    production behavior is not implemented.
  evidence: NOT_RUN
  updated_at: "2026-08-02"
  updated_by: Codex
```

The final schema and enum values MAY be normalized during rollout, but MUST retain the
semantics above.

### Authority and lifecycle rules

The coding checkpoint is subordinate to, and MUST be consistent with, the canonical
ticket-level `next_action`:

- it MUST NOT authorize a ticket, file, service, behavior or lifecycle transition;
- its `ticket_id` MUST equal `current-work.yml#ticket_id`;
- its paths MUST be a subset of the current reviewed expected-files manifest;
- it MUST be absent outside `IMPLEMENTATION` unless an approved policy explicitly
  permits another stage;
- only one coding checkpoint may exist at a time, matching the single-active-work rule;
- a session MUST read it during startup before recommending or performing application
  coding work; and
- if it conflicts with the ticket, contract, manifest, repository state or evidence, the
  session MUST stop coding, report drift and reconcile from the higher authority.

Checkpoint status MUST be updated from observed evidence or an explicit reviewer
decision. “Done”, “fixed”, a checkbox, a file existing or a chat summary alone MUST NOT
advance it. A learner report MAY trigger verification, but the observed result determines
the status.

When a step completes, the same session MUST either record the next authorized coding
step or clear the checkpoint if the ticket is leaving implementation. A session MUST NOT
invent a successor step when the evidence, design or expected-files authority is
insufficient.

### Cross-session resume behavior

At the beginning of a later session involving `apps/**`, Codex MUST reconcile:

1. canonical ticket-level state;
2. the coding checkpoint;
3. branch, worktree and relevant diff;
4. referenced evidence and test results; and
5. the learner's newest request.

If they agree, Codex resumes the recorded `step_id` and uses its Coding Action Card rather
than selecting a new step. If repository evidence shows the recorded step is stale,
Codex reports the discrepancy and updates the checkpoint only through the normal
evidence rules.

## Alternatives considered

### Selected: full action card plus canonical subordinate checkpoint

This serves both learning and continuity. The action card explains the work to a human;
the checkpoint gives later sessions a stable, reviewable cursor without weakening ticket
authority.

### Rejected: rely on chat history or generated conversation summaries

Chat context can be unavailable, summarized differently or detached from the current
branch. It is not repository evidence and cannot reliably coordinate multiple sessions.

### Rejected: make the ticket-level next action extremely detailed

Ticket actions are lifecycle-level decisions. Rewriting them for every RED/GREEN step
would mix two abstraction levels, cause unnecessary control-plane churn and make ticket
state harder to review.

### Rejected: maintain one checkpoint per service

That would allow multiple apparent active coding actions and conflict with the project's
single-primary-work rule. The active checkpoint may target any service, but only one may
be active globally.

### Rejected: require the full eight-section card in every reply

Repeating unchanged context would make collaboration noisy. The full card is required
when assigning or changing a step; compact updates are sufficient while the same step
remains active.

## Compatibility

- No API, event, database schema, runtime dependency or application behavior changes.
- Existing application code and historical chat sessions do not require retrofit.
- Existing ticket-level `next_action` remains authoritative and unchanged in meaning.
- Existing sessions may continue, but the first post-rollout coding action must create or
  reconcile the checkpoint before modifying `apps/**`.
- Tooling that ignores the optional checkpoint remains readable during the transition,
  but repository validation must enforce it after rollout is complete.

## Risks and controls

| Risk | Control |
|---|---|
| The action card becomes verbose boilerplate | Full card only on new/materially changed steps; compact updates thereafter |
| A checkpoint silently expands ticket scope | Ticket equality and expected-files subset validation |
| Chat-reported “done” advances state | Observed evidence or explicit review decision is required |
| Ticket next action and coding step diverge | Explicit subordinate authority and startup reconciliation |
| Stale checkpoints survive branch changes | Branch/worktree/diff reconciliation before coding |
| Every service invents its own format | Repository-wide schema and one shared action-card contract |
| Sensitive values enter the checkpoint | Store identifiers, behavior labels and commands; never secrets, raw credentials or tokens |

## Scope and rollout

Approval of this CCR does not itself authorize edits to product code or alter
`TKT-W04-D05`. Rollout requires a reviewed control-plane expected-files manifest and
consistent updates to at least:

1. `AI-contracts/schemas/current-work.schema.json`;
2. `AI-contracts/state/README.md`;
3. `AI-contracts/05-software-engineering-workflow.md`;
4. `AI-contracts/09-next-task-decision-policy.md`;
5. the relevant implementation/handoff templates;
6. root and applicable module-scoped `AGENTS.md` startup/handoff guidance;
7. control-plane synchronization and validation tooling; and
8. canonical state/projections when the first real coding checkpoint is activated.

Rollout MUST preserve stream isolation: contract, control-plane/tooling and product-code
changes must not be mixed into one commit merely for convenience.

## Verification requirements

Before `PC-2026.10` can become effective:

- the reviewer explicitly approves this CCR;
- rollout paths are authorized by a reviewed expected-files manifest;
- schema validation accepts zero or one valid checkpoint and rejects ticket/path/status
  inconsistencies that are mechanically provable;
- a cross-session fixture demonstrates that an unchanged checkpoint resumes the same
  `step_id`;
- a drift fixture demonstrates that conflicting checkpoint data blocks coding;
- workflow, next-action policy, templates and `AGENTS.md` use consistent authority;
- `npm run check:docs` exits successfully;
- `node tools/control-plane/sync-control-plane.mjs --check` exits successfully;
- `node tools/repository/validate-repository.mjs` exits successfully; and
- the reviewed diff confirms that no application runtime behavior or ticket lifecycle
  status changed as a side effect.

## Migration plan

1. Review and approve, reject or revise this CCR.
2. Create and review a control-plane rollout expected-files manifest.
3. Add the optional checkpoint schema and deterministic consistency validation.
4. Update workflow, next-action, templates and agent startup instructions.
5. Initialize the first checkpoint from observed repository state, not chat memory alone.
6. Synchronize projections, validate documentation and repository consistency.
7. Make `PC-2026.10` effective only after rollout evidence passes review.

## Rollback and forward-fix

Before approval, this draft may be revised or rejected without changing the effective
baseline. After approval, rollback requires a follow-up CCR; historical approval and
checkpoint evidence must remain intact. A schema or validator defect should be corrected
forward without treating an unverifiable checkpoint as authoritative.

## Review requirements

- Confirm the eight action-card sections are sufficient for a learner to begin coding
  without guessing the problem or boundary.
- Confirm compact replies remain allowed while the step is unchanged.
- Confirm cross-session continuity comes from repository state rather than chat history.
- Confirm the checkpoint cannot authorize scope or override contracts, tickets, design,
  expected-files or evidence.
- Confirm a learner's “done” triggers verification rather than automatic advancement.
- Confirm the policy applies uniformly to every current and future application under
  `apps/**` without imposing NestJS or another framework on all services.
- Confirm rollout does not change current product behavior or prematurely advance
  `TKT-W04-D05`.

## Test, document and ticket impact

- Tests: add schema/validator fixtures for valid resume, stale checkpoint, ticket mismatch
  and unauthorized path.
- Documents: workflow, next-action policy, state model, templates and agent instructions.
- Tickets: no current-ticket transition; rollout is separate control-plane work.
- Product code: none.

## Verdict

`APPROVED`
