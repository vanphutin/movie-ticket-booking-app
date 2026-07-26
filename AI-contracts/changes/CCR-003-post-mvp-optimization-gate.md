# CCR-003 — Post-MVP optimization gate

## Status

`APPROVED`

- Approver: Van Phu Tin (project owner/reviewer)
- Approval date: 2026-07-27
- Evidence: direct reviewer approval in working session; optimization policies
  (`21`, `22`) and `state/optimization-status.yml` already materialized; registered in
  `state/contract-status.yml`. All optimization modules remain `NOT_ELIGIBLE` — no
  measurement or pass is claimed by this approval.

## Problem

The control plane verifies correctness, security, migration, tests and evidence, while
performance work is concentrated in weeks 9–10. It does not require a module-level
optimization disposition after each vertical-slice MVP. Consequently, `VERIFIED` can be
misread as “optimized”, or a measured bottleneck can be silently carried into the next
module.

## Decision

Add an independent post-MVP optimization lifecycle:

```text
MVP VERIFIED
→ baseline
→ optimization review
→ NOT_REQUIRED | OPTIMIZATION_REQUIRED | DEFERRED_WITH_BUDGET | BLOCKED
→ remediation and regression when required
→ dependency unlock
```

The gate applies after module/vertical-slice MVP tickets, primarily the canonical `D05`
tickets. It does not run before MVP correctness verification.

## Mandatory boundaries

- Correctness, security, data integrity, bounded behavior and expected-workload safety
  remain MVP obligations; they cannot be reclassified as optional optimization.
- `BLOCKER/HIGH` optimization findings block the next dependent module.
- `MEDIUM` may be deferred only with owner, reason, optimization budget, deadline/gate,
  risk acceptance and regression guard.
- `LOW` may be accepted with a recorded limitation.
- `NOT_REQUIRED` requires baseline or explicit risk evidence; it is not a checkbox.
- An optimization claim requires workload, environment, dataset, before/after and
  regression evidence.
- Weeks 9–10 retain cross-service/system-wide performance and release hardening.

## Compatibility

- Existing ticket, capability and technical contract IDs remain stable.
- Module optimization gates are projections, not new pre-planned daily implementation
  tickets.
- Optimization remediation tickets are created only from an observed `REQUIRED`
  disposition.
- Existing learning, DoR, execution, evidence and review dimensions remain independent.
- Initial optimization state is `NOT_ELIGIBLE` because no application module is currently
  implemented or MVP-verified.

## State migration

Add `state/optimization-status.yml` with no fabricated measurement or pass. Add an
optimization dimension and transition rules to `state/README.md`.

## Risks and controls

| Risk | Control |
|---|---|
| Premature optimization | `NOT_ELIGIBLE` until source MVP is `VERIFIED` |
| Correctness debt disguised as performance work | mandatory classification before baseline/optimization |
| Fake or misleading benchmark | workload/environment/dataset/warmup/limitations required |
| Optimization breaks behavior | functional, failure, security and invariant regression required |
| MEDIUM debt lives forever | owner, budget, deadline/gate and risk acceptance required |
| Every module is forced to change code | evidence-backed `NOT_REQUIRED` is valid |
| Week 9–10 becomes redundant | module gates are local; weeks 9–10 remain system-wide |

## Rollback

Remove the independent optimization projections and state while preserving all technical
contracts, MVP evidence and existing week 9–10 tickets. Never delete historical
optimization evidence; mark it non-authoritative or superseded.

## Review requirements

- Confirm seven module/system optimization gates map to the intended `D05` tickets.
- Confirm no optimization is eligible before MVP verification.
- Confirm BLOCKER/HIGH cannot be deferred.
- Confirm MEDIUM deferral requires all controls.
- Confirm `NOT_REQUIRED` requires evidence.
- Confirm weeks 9–10 remain cross-service/release gates.
- Confirm no effective baseline is changed by this draft.

