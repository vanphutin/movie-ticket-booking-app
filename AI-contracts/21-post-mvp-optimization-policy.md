# Post-MVP optimization policy

## Purpose

Build the correct, secure MVP first. After a module/vertical slice is verified, measure
its relevant behavior, decide whether optimization is required, and prevent material
bottlenecks from being skipped.

`MVP_VERIFIED` and `OPTIMIZED_VERIFIED` are different claims.

## Eligibility

Optimization is `NOT_ELIGIBLE` until the source MVP ticket is `VERIFIED` with its
correctness, security, migration, test and evidence obligations satisfied.

Before eligibility, teams may define expected workload, metrics and test seams. They must
not:

- implement speculative caching/indexing/parallelism unrelated to an invariant or known
  MVP workload;
- publish performance claims without representative evidence;
- delay correctness or security work by calling it future optimization.

## Correctness and safety classification

The following remain MVP remediation, not optimization debt:

- violated business invariant, ownership or authorization;
- oversell, lost update or invalid state transition;
- missing required constraint, timeout, bounded pagination or bounded retry;
- unverified webhook, secret/token leakage or weakened password protection;
- reproducible resource leak or algorithm that cannot serve the approved MVP workload;
- N+1/unbounded query on a core flow that fails the approved MVP budget.

Classification result:

```text
CORRECTNESS_OR_SAFETY_REMEDIATION
POST_MVP_OPTIMIZATION
```

The first result returns to the normal remediation policy and keeps MVP unverified.

## Optimization lifecycle

### OP-0 — Eligibility and classification

Confirm source MVP `VERIFIED`. Classify observed gaps as correctness/safety or
post-MVP optimization.

### OP-1 — Budget and baseline

Define workload, environment, dataset, warmup, concurrency/iterations, metrics,
thresholds, invariant guards and limitations. Record an observed baseline according to
`22-performance-baseline-standard.md`.

### OP-2 — Review and disposition

Choose exactly one:

- `NOT_REQUIRED`: relevant baseline and risks meet the approved budget.
- `OPTIMIZATION_REQUIRED`: an observed bottleneck requires a scoped ticket.
- `DEFERRED_WITH_BUDGET`: only a MEDIUM finding with every deferral control.
- `BLOCKED`: measurement, environment, authority or evidence is unavailable.

### OP-3 — Optimize

Create a small optimization ticket for one bottleneck or one causally related group.
Record the selected method, rejected alternative, trade-off, rollback and expected
before/after change. Do not add unrelated feature scope.

### OP-4 — Regression and verification

Repeat the comparable measurement and run functional, failure, security and invariant
regression. `OPTIMIZED_VERIFIED` requires the budget/approved outcome plus no prohibited
regression.

## Severity and dependency unlock

- `BLOCKER/HIGH`: cannot be deferred; next dependent module remains locked.
- `MEDIUM`: may be resolved immediately or become `DEFERRED_WITH_BUDGET`.
- `LOW`: may be accepted with an explicit limitation.

A MEDIUM deferral requires all:

```yaml
owner:
reason:
optimization_budget:
deadline_or_gate:
risk_acceptance:
regression_guard:
```

Missing any field means the finding is not validly deferred.

Dependency unlock requires one:

```text
NOT_REQUIRED
OPTIMIZED_VERIFIED
DEFERRED_WITH_BUDGET
```

plus unresolved optimization `BLOCKER/HIGH = 0`.

## Evidence boundary

Artifact existence, a fast local run, a single screenshot or “it feels faster” is not
evidence. Claims must identify workload, environment, data, commands, outputs,
observations and limitations. Before/after comparison must use materially comparable
conditions.

## Module gates

| Gate | Source MVP | Scope |
|---|---|---|
| OPT-W04-IDN | TKT-W04-D05 | Identity/Auth |
| OPT-W05-CAT | TKT-W05-D05 | Catalog |
| OPT-W06-SCH-EVT | TKT-W06-D05 | Scheduling/Events |
| OPT-W07-BKG | TKT-W07-D05 | Booking/Concurrency |
| OPT-W08-PAY-WRK | TKT-W08-D05 | Payment/Worker |
| OPT-W09-OPS | TKT-W09-D05 | Operations/cross-cutting |
| OPT-W10-REL | TKT-W10-D05 | Release/system |

Weeks 9–10 remain mandatory system-wide hardening even when earlier module dispositions
were `NOT_REQUIRED`.

