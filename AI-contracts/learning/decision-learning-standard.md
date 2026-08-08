# Decision-oriented learning standard
## Purpose

A topic list is not a complete lesson. Every full learning gate must teach enough for the
learner to explain the mechanism, compare realistic choices and defend the project
decision. External documentation supports stable concepts; it never overrides an
effective project contract.

## Mandatory lesson flow

```text
business problem
→ constraints and invariant
→ mental model
→ available options
→ option comparison
→ selected project direction
→ rejected alternatives and reasons
→ change conditions
→ happy path
→ failure/security path
→ counterexample
→ project application
→ learner check
→ rubric verdict or remediation
```

For a full gate, Codex must not skip `options`, `rejected alternatives`, `change
conditions` or `counterexample` when the ticket contains a material architecture, data,
security, concurrency, payment, reliability or compatibility decision.

## Required decision record

Each material learning decision uses:

```yaml
decision:
project_constraints: []
options:
  - name:
    mechanism:
    advantages: []
    disadvantages: []
    failure_modes: []
    use_when: []
    avoid_when: []
selected_direction:
selection_reason:
rejected_alternatives:
  - option:
    rejection_reason:
change_conditions: []
```

The selected direction is a teaching projection of effective contracts or an explicitly
reviewed design. Learning content cannot invent or approve a technical decision.

## Examples and counterexamples

Every full gate includes:

- one project-specific happy-path example;
- one failure or security example;
- one counterexample showing a tempting but invalid mental model;
- one limitation or condition under which the selected direction would need review.

## Question mix

Ask 3–5 questions. Across the gate, sample at least:

1. `EXPLAIN`: mental model in the learner's words.
2. `COMPARE`: two realistic options and their trade-off.
3. `APPLY`: decision in Movie Ticket Booking.
4. `FAILURE`: consequence under failure, attack, race or retry.
5. `DEFEND`: selected/rejected option and change condition, when target level is C4.

Do not expose a static answer key before the learner answers.

## Capability levels

| Level | Required observable behavior |
|---|---|
| `C1_EXPLAIN` | Explain the core concept without relying on syntax or memorized wording. |
| `C2_APPLY` | Map the concept to the correct owner, invariant and ticket flow. |
| `C3_INTEGRATE` | Connect API/data/event/security boundaries and reason through failure. |
| `C4_DEFEND` | Compare options, reject an alternative, state trade-off/limitation and handle a novel scenario. |

A gate declares `target_level`. Passing requires every dimension through that level; a
high score in one dimension cannot compensate for a missing owner, invariant or critical
failure consequence.

## Reference policy

- Every full learning gate resolves to 1–3 external documentation links.
- Prefer specifications and official project/vendor/security documentation.
- Record title, URL, authority and the exact lesson purpose.
- References are reading support, not proof that the learner understood the topic.
- Do not block a session merely because an external site is temporarily unavailable;
  use the stored title/purpose and report link availability as unverified.
- Version-sensitive behavior must be rechecked before implementation.
- More than three links requires narrowing to the ticket-relevant subset.

## Remediation

On a material mistake:

1. identify the exact misconception and affected invariant;
2. re-explain only that part with a different example or option comparison;
3. ask 1–3 equivalent questions;
4. keep the gate `CHANGES_REQUIRED`;
5. record the observed gap and next recall point.
