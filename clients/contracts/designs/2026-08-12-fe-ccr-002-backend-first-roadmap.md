# FE-CCR-002 backend-first roadmap design

## Model

The canonical roadmap consists of phases, milestones, capability records, backend integration gates, a complete ticket catalog and a dependency graph. Ticket eligibility is the intersection of frontend prerequisites and the matching backend gate.

## Weekly shape

Each product week has five planned tickets: domain/API learning, UX/state analysis, reviewed design, functional vertical slice, and visual/verification closure. The final ticket verifies the frontend weekly gate and returns the router to the next backend week.

## Foundation shape

Foundation tickets cover CSS, JavaScript/browser, TypeScript and React prerequisites before FE-W04 functional implementation. Later capabilities are learned just in time before the product slice that applies them.

## Validation invariants

- every ticket ID is unique;
- every prerequisite resolves;
- the graph is acyclic;
- every mandatory capability has ticket coverage;
- every W4–W10 product ticket declares a backend gate;
- a visual ticket depends on functional evidence;
- completed historical tickets remain represented;
- exactly one next action remains canonical.

## Review

`APPROVED` — reviewer approved the backend-first alternating model on `2026-08-12`.
