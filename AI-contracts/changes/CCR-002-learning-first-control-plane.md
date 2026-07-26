# CCR-002 — Learning-first control plane

## Status

`APPROVED`

- Approver: Van Phu Tin (project owner/reviewer)
- Approval date: 2026-07-27
- Evidence: direct reviewer approval in working session; learning-first policies
  (`19`, `20`) and `learning/` maps already materialized; registered in
  `state/contract-status.yml`. Learning gate state remains independent — no learner
  interaction is claimed by this approval.

## Problem

The control plane defines contract, design, implementation and verification gates, but it
does not require the learner to understand the business and engineering concepts before
design or code. `learning_outcome` exists on daily tickets without a canonical teaching
protocol, assessment rule or resumable learning state.

This creates four risks:

- Codex can jump directly from ticket selection to code.
- Teaching depth can vary between sessions.
- A new session can repeat or silently skip prior learning.
- A learner can receive complete implementation before demonstrating the mental model.

## Proposed change

Add a learning-first layer to the existing control plane:

1. `19-learning-first-policy.md` defines mandatory chat-based teaching behavior.
2. `20-learning-gate-standard.md` defines learning gate schema and state.
3. `learning/capability-learning-map.md` is the reusable concept map.
4. `learning/ticket-learning-map-weeks-4-10.md` projects concepts onto all 35 tickets.
5. Workflow, DoR, ticket schema, next-action and traceability policies reference the
   learning gate.
6. Runtime ticket state gains an independent `learning` dimension.
7. `CODEX-CONTEXT.md` routes new work, resumed work and remediation through the
   appropriate learning mode.

## Behavioral decisions

- Teaching is in Vietnamese; the first use of an English technical term is explained.
- Codex teaches directly in chat and asks 3–5 questions.
- Codex waits for the learner's answers and does not answer on their behalf.
- A wrong answer triggers focused explanation and an equivalent re-check.
- A passed learning gate does not imply DoR, implementation or review completion.
- Codex may create only a reviewed skeleton/TODO after learning, SE-1, SE-2 and DoR gates
  all permit it.
- For an active bug or review, Codex restores repository state first and teaches only the
  concepts needed to remediate the observed gap.
- Technical contracts remain authoritative for code. Learning material cannot change a
  product, architecture, API, data, event, security or quality contract.

## Compatibility and migration

- Existing ticket IDs, capability IDs and technical contract IDs remain stable.
- Existing `learning_outcome` is retained for compatibility and supplemented by explicit
  learning-gate fields.
- Runtime state adds an independent learning object. Initial values must not claim a
  learner interaction that was not observed.
- `PASSED` learning state never maps automatically to `READY`, `IN_PROGRESS`,
  `SUBMITTED` or `VERIFIED`.
- Current blockers `CCR-001` and `FG-001` remain unchanged.

## Risks and controls

| Risk | Control |
|---|---|
| Teaching becomes generic or too long | Select only current ticket topics from the capability and ticket maps |
| Repeated lessons after restart | Store a compact checkpoint, never a fabricated transcript |
| Learning pass bypasses delivery gates | Keep learning, DoR, execution, evidence and review as independent dimensions |
| Codex completes the learner's assignment | Enforce the skeleton/TODO boundary in `19-learning-first-policy.md` |
| Outdated framework advice | Prefer stable concepts and verify version-sensitive behavior against official documentation |
| Baseline changes silently | Keep this CCR in review until explicit approval |

## Rollback

Rollback removes learning-gate references and the independent learning state while
preserving all technical contracts, ticket IDs and existing delivery evidence. Any
observed learning notes may remain as non-authoritative session history.

## Review requirements

- Confirm 13 capabilities and 35 canonical tickets are covered.
- Confirm learning state cannot unlock code by itself.
- Confirm resume, bug, review and evidence-only scenarios do not force irrelevant lessons.
- Confirm `CODEX-CONTEXT.md` remains a compact handoff rather than a static textbook.
- Confirm no effective-baseline status is changed by this draft.

