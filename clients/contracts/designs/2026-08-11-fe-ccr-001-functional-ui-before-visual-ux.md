# FE-CCR-001 functional-before-visual design

## Outcome

Introduce two implementation checkpoints without changing the repository lifecycle or weakening its
learning, design and readiness gates.

## Checkpoint boundary

`READINESS → FUNCTIONAL_UI → VISUAL_UX → VERIFICATION`

`FUNCTIONAL_UI` owns behavior, state completeness and an operable semantic structure. `VISUAL_UX`
owns approved visual composition and final experience quality. Accessibility crosses both: correct
semantics and keyboard/focus behavior start functionally, while final contrast, viewport behavior
and visual affordances are verified with the visual system.

## Required ticket design

Every UI implementation design identifies:

- functional acceptance criteria and their test boundary;
- visual/UX acceptance criteria and their viewport or reference boundary;
- the UI-state matrix, including loading, empty, error, success and disabled states where relevant;
- files expected in each checkpoint;
- the evidence required to unlock `VISUAL_UX`.

## Rejected alternatives

- Finish all CSS before behavior: rejected because unstable behavior can invalidate polished work.
- Defer all CSS, responsive thinking and accessibility: rejected because markup and component
  boundaries can become structurally incompatible with the intended experience.
- Treat both checkpoints as separate tickets by default: rejected because behavior and presentation
  usually form one screen outcome and should retain one acceptance trace.

## Trade-off and limitation

The extra checkpoint adds a review boundary and evidence bookkeeping. It reduces expensive rework
but cannot prove that a design is usable; that still requires visual and interaction review against
real rendered states.

## Review status

`APPROVED` — explicit reviewer direction on 2026-08-11.
