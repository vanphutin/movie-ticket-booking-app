# Frontend learning and delivery lifecycle

Each ticket follows:

`STARTUP → LEARNING → ANALYSIS → DESIGN → READINESS → IMPLEMENTATION → VERIFICATION → REVIEW → HANDOFF`

Required outputs are reconciliation, observed learning checkpoint, analysis, reviewed design and
expected-files, readiness verdict, scoped diff/self-review, reproducible evidence, acceptance review
and canonical handoff.

For a ticket that implements UI, `IMPLEMENTATION` contains two ordered checkpoints:

`FUNCTIONAL_UI → VISUAL_UX`

`FUNCTIONAL_UI` must prove semantic HTML/TSX structure, business behavior, API or traceable mock
integration, validation, relevant UI states and functional tests. CSS remains minimal but must make
structure, focus and states operable. `VISUAL_UX` starts only after all scoped functional acceptance
criteria pass with reproducible evidence and no blocking functional finding remains.

`VISUAL_UX` applies the approved design language, responsive layout, typography, color, spacing,
variants, motion and visual QA. Semantic structure, keyboard behavior, focus order, labels, error
association and responsive content constraints begin in `FUNCTIONAL_UI`; they may not be postponed
to visual polish.

Learning levels are `C1_EXPLAIN`, `C2_PREDICT`, `C3_APPLY`, `C4_DEBUG`, `C5_COMPARE`, `C6_DEFEND`
and `C7_LEAD`. A gate records observed answers and remediation; it never infers passing from reading
material or file existence.

After inactivity, resume the checkpoint within seven days, use a compact recall check after 8–21
days, and use a capability re-entry assessment after 21 days.
