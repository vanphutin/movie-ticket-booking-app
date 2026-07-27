# Learning Checkpoint — LG-TKT-W04-D01

```yaml
ticket_id: TKT-W04-D01
gate_id: LG-TKT-W04-D01
capability_id: CAP-CON-01
target_level: C4_DEFEND
mode: FULL_THEORY_FIRST
status: PASSED
presented_at: "2026-07-28"
answered_at: "2026-07-28"
topics_presented:
  - authority order and normative source
  - contract versus authorized state versus repository observation
  - OBSERVED, REPORTED, INFERRED and MISSING evidence
  - canonical state versus compact projection
  - owner, invariant and trust boundary mapping
  - drift response and false-verification counterexample
decision_comparison:
  selected: canonical structured state plus validated compact projections
  rejected: one duplicated giant context document as a second source of truth
  trade_off: more synchronization machinery in exchange for machine-checkable authority
  limitation: canonical files still need review-backed updates and cannot prove runtime behavior alone
  change_condition: reconsider projection mechanics only when canonical files cannot be accessed reliably
questions_asked: [Q1_EXPLAIN, Q2_COMPARE, Q3_APPLY, Q4_FAILURE, Q5_DEFEND]
answers_observed:
  - Q1: Correct authority order; code/test cannot change an effective contract without an approved CCR.
  - Q2: Selected canonical state plus validated projections and defended trade-off/change condition.
  - Q3: Rejected client actor headers and assigned resource ownership authorization to Booking.
  - Q4: Correctly classified observed artifact, reported output, inferred runtime claim and missing reviewer execution.
  - Q5: Stopped delivery, trusted current-work.yml, reconciled projections, validated and resumed LEARNING.
observed_gaps: []
verdict: PASSED
design_unlocked: false
```

## Reviewer observation

All five dimensions met `C4_DEFEND`. Gateway verifies token/auth context at the edge;
Identity remains owner of credential and token lifecycle. The learner correctly assigned
hold ownership authorization to Booking.

Learning `PASSED` unlocks `ANALYSIS`; it does not unlock design or implementation.

Reference: RFC 2119 — <https://www.rfc-editor.org/rfc/rfc2119.html>
