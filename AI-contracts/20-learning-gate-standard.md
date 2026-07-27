# Learning gate standard

## Canonical schema

```yaml
learning_gate_id:
ticket_id:
capability_ids: []
business_context:
learning_outcomes: []
prerequisite_concepts: []
theory_topics: []
project_application: []
misconceptions: []
decision_points: []
examples: []
counterexamples: []
security_or_failure_focus: []
check_question_dimensions: []
target_level: C1_EXPLAIN
reference_profile:
pass_conditions: []
remediation_rule:
design_unlock_condition:
skeleton_unlock_condition:
status: NOT_EVALUATED
```

## Identity and status

- Gate ID format: `LG-<ticket-id>`, for example `LG-TKT-W04-D03`.
- Exactly one canonical gate projects onto each daily ticket.
- Status values:
  `NOT_EVALUATED | IN_PROGRESS | CHANGES_REQUIRED | PASSED | BLOCKED`.
- A candidate ticket may have a gate definition without an active runtime gate.
- Status changes require observed learner interaction or an explicit blocker.

## Question contract

- Ask 3–5 questions for a full gate.
- A focused remediation re-check may ask 1–3 equivalent questions.
- Questions are generated in chat from the dimensions in the ticket map; they are not a
  static answer key.
- At least one question applies the concept to Movie Ticket Booking.
- At least one question compares realistic options when the gate has a material decision.
- Security, concurrency, payment, trust-boundary and data-loss topics require at least one
  failure/security question.
- `C4_DEFEND` requires a selected/rejected option, trade-off/limitation and change
  condition question.

## Pass contract

Passing requires all:

1. Core mental model is materially correct.
2. Relevant owner/invariant is identified.
3. At least one failure or security consequence is reasoned correctly.
4. Proposed project application does not contradict referenced contracts.
5. Any critical misconception observed in the same gate is remediated.
6. Every rubric dimension through the declared `target_level` is observed.

Minor wording or syntax mistakes do not fail a gate. Memorizing definitions without
project application does not pass it.

## Depth, decision and reference contract

- Full gates follow `learning/decision-learning-standard.md`.
- Capability depth comes from `learning/capability-lesson-specs.md`.
- Recall points come from `learning/knowledge-retention.yml`.
- Every gate resolves exactly one reference profile from
  `learning/reference-profiles.yml`; that profile contains 1–3 external documentation
  links.
- References support learning but cannot amend contracts or prove a learning pass.
- A topic with no material option choice may compare valid/invalid mental models rather
  than inventing alternatives.

## Unlock contract

- `design_unlocked` requires learning `PASSED` plus completion of the relevant SE-1
  analysis conditions.
- `skeleton_unlocked` requires learning `PASSED`, SE-1 complete, SE-2 reviewed and DoR
  `READY`.
- Learning status never changes ticket execution or review status automatically.

## Evidence boundary

An observed chat answer may support a learning checkpoint but is not runtime, migration,
test or production evidence. Store a concise observation, not a fabricated quote or full
transcript.
