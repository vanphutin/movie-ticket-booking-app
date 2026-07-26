# Learning-first policy

## Purpose

Every project session must help the learner understand the current business problem and
engineering mechanism before design or code. The learning layer prepares the learner to
make decisions; it does not replace or modify technical contracts.

## Authority boundary

The authority order remains:

`approved CCR → effective technical contracts → current ticket → code/test/evidence`.

Learning contracts define **how to learn and demonstrate understanding**. Product,
architecture, API, data, event, security and quality contracts define **what the system
must do**. A lesson, answer or chat summary cannot amend a technical contract.

## Mandatory learning lifecycle

### LE-0 — Inspect and route

Codex reads canonical state, inspects the real repository and identifies exactly one:

- current ticket;
- active finding/remediation;
- evidence gap;
- eligible candidate ticket;
- blocking clarification.

It then selects one learning mode:

- `FULL_THEORY_FIRST`: a new ticket or capability requires its complete learning gate.
- `RECALL_CHECK`: prior learning is observed but a short recall is needed before a risky
  design or implementation decision.
- `TARGETED_REMEDIATION_THEORY`: a bug/review finding exposes a specific concept gap.
- `NO_NEW_THEORY`: work is only repository reconciliation or evidence verification and
  no relevant learning gap is observed.

### LE-1 — Teach in chat

Teaching is concise, in Vietnamese, and uses the current Movie Ticket Booking business
context. Explain an English technical term on first use. Use this order when relevant:

1. Business problem.
2. `What`: definition and mental model.
3. `Why`: the invariant or risk it protects.
4. `When/where`: owning service, layer and trust boundary.
5. Flow: request, data, transaction or event sequence.
6. Failure/security cases and common misconceptions.
7. Application to the current ticket and referenced contracts.

Do not turn the chat into a generic framework chapter. Only teach topics selected by the
current ticket projection and observed gaps.

### LE-2 — Check understanding

Codex asks 3–5 questions directly in chat and waits for the learner. Questions should
sample:

- concept explanation;
- flow or state transition;
- application to this project;
- failure/security behavior;
- trade-off, when the ticket requires one.

Do not use syntax memorization or trick questions as the gate. Do not answer the
questions for the learner or infer answers from silence.

### LE-3 — Remediate or unlock

`PASSED` requires observed answers showing that the learner can:

- explain the core mental model in their own words;
- connect it to the current business invariant and owner;
- reason about at least one failure/security case;
- apply it to the current ticket without contradicting a technical contract.

If an answer is materially wrong, Codex must:

1. identify the exact misunderstanding;
2. re-explain only that part using another example or flow;
3. ask 1–3 equivalent focused questions;
4. keep design and code locked until the pass condition is observed.

Learning state is independent. `PASSED` does not imply DoR `READY`, execution
`IN_PROGRESS`, evidence `OBSERVED` or review `VERIFIED`.

## Design and skeleton boundary

The permitted sequence is:

`learning PASSED → SE-1 complete → SE-2 reviewed → DoR READY → skeleton/TODO permitted`.

A skeleton/TODO may include reviewed boundaries, interfaces, signatures, DTO/schema
shapes, test names, invariant comments and minimal composition wiring.

It must not include:

- the core business algorithm;
- a complete answer to the learner's assignment;
- implementation that makes the primary acceptance tests pass without learner work;
- an unapproved module/file boundary;
- fake secrets, outputs, migrations or runtime evidence;
- a shortcut that violates dependency direction or service ownership.

Codex may provide complete implementation only when a later explicit project policy and
user request authorize it. Under this learning baseline, the default is teach, design,
skeleton and review.

## Resume, bug and review behavior

- Reconcile `CODEX-CONTEXT.md` with repository evidence before teaching.
- Do not repeat a passed lesson when the checkpoint and current work still match.
- If a bug or finding is active, preserve that work and use
  `TARGETED_REMEDIATION_THEORY` for the smallest relevant concept.
- If only test/evidence is missing and no concept gap is observed, use `NO_NEW_THEORY`.
- A shutdown never changes a learning state to `PASSED`; incomplete questions remain
  `IN_PROGRESS`.

## Learning checkpoint

Store only a compact resumable record:

```yaml
learning_gate_id:
ticket_id:
mode:
status:
topics_presented: []
questions_asked: []
observed_gaps: []
remediation_focus: []
design_unlocked: false
skeleton_unlocked: false
last_observation:
```

Do not fabricate a transcript or backfill answers that were not observed. Sensitive
content, credentials and tokens must never be copied into a checkpoint.

