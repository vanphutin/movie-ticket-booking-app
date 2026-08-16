# FE-CCR-001 — Functional UI before visual UX

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-08-11
- Approved by: Van Phu Tin
- Approved at: 2026-08-11
- Approval evidence: explicit reviewer instructions `oke, toi muốn như vậy`, followed by
  `tạm thời bỏ qua, xây contracts trước`
- Effective baseline before approval: `FE-PC-2026.1`
- Effective baseline after approval: `FE-PC-2026.2`
- Application/runtime change: none

## Problem

The frontend contracts accept a screen against behavior and visual design together, but do not
define a gated order between functional implementation and visual refinement. A ticket could either
polish an unstable flow too early or postpone semantic structure, accessibility and responsive
constraints until they are expensive to repair.

## Decision

UI implementation tickets use two ordered checkpoints after readiness:

1. `FUNCTIONAL_UI` establishes semantic HTML/TSX, component boundaries, business behavior, verified
   API or contract-traceable mocks, validation, the complete UI-state matrix and functional tests.
   CSS is limited to what is necessary to expose structure, states, focus and operability.
2. `VISUAL_UX` applies the approved design language: layout, responsive composition, typography,
   color, spacing, component variants, motion and visual QA.

`VISUAL_UX` cannot start until every functional acceptance criterion in scope has reproducible
passing evidence and no blocking functional finding remains open.

Semantic structure, native behavior, keyboard access, focus order, labels, error association and
responsive content constraints begin in `FUNCTIONAL_UI`; they are not deferred as decoration.
Accessibility verification and cross-viewport visual QA are completed in `VISUAL_UX`.

Learning, analysis, design and readiness still precede implementation. This change does not permit
React scaffolding or application code for the current foundation ticket.

## Compatibility and migration

- Existing completed frontend control-plane work is unchanged.
- `FE-TKT-W01-D01` remains in `LEARNING`; it is paused only for this approved contract rollout and
  resumes at the same Q1–Q4 learning check afterward.
- Future UI implementation tickets must split acceptance criteria and evidence by checkpoint.
- A ticket already in implementation must return to design/readiness if its reviewed artifacts do
  not identify the two checkpoints.

## Rollback

Revert the FE-PC-2026.2 contract commit and restore the prior lifecycle, design standard and screen
acceptance template. No runtime or persisted data migration is involved.

## Verification

- `npm run check:docs`
- `npm run check:frontend-control`
- `node tools/repository/validate-repository.mjs`
- review the intended and generated diffs together

## Verdict

`APPROVED`
