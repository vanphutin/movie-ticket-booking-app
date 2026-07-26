# Performance baseline standard

## Required baseline context

Every performance claim records:

```yaml
workload_model:
environment:
dataset_profile:
warmup_policy:
concurrency:
duration_or_iterations:
metrics: []
acceptance_thresholds: []
correctness_invariants: []
security_invariants: []
measurement_tooling:
limitations: []
```

Threshold numbers are approved per module/design after a credible workload and
environment exist. This standard does not invent universal latency or throughput values.

## Metric catalogue

Select only relevant metrics and explain omissions.

- API: p50/p95/p99 latency, throughput, error/timeout rate, payload size, dependency calls.
- Database: queries/request, duration, rows scanned/returned, plan/index use, lock wait,
  deadlock/retry rate.
- Booking/concurrency: winner count, transaction duration, contention/conflict, retry
  exhaustion.
- Event/worker: queue delay, processing latency, throughput, retry/DLQ rate,
  duplicate/replay and crash recovery.
- Operations: CPU, memory, pool saturation, readiness/shutdown time and telemetry
  overhead.

## Measurement rules

- Describe hardware/runtime/dependency versions sufficiently for reproduction.
- Use representative data or state why the result is only exploratory.
- Define warmup and avoid comparing warm and cold runs as if equivalent.
- Use enough iterations/duration for the stated claim and disclose variance/limitations.
- Preserve the same workload and material environment conditions for before/after.
- Keep correctness and security invariant checks active during load.
- Database claims include plan evidence when relevant and discuss write/storage cost of
  indexes.
- Mock-only results cannot claim real database, network, queue or provider behavior.
- Production claims require production-authorized evidence; local evidence remains local.

## Valid decisions

`NOT_REQUIRED` is valid only when selected metrics/risks meet the approved budget and
limitations do not invalidate that conclusion.

`OPTIMIZATION_REQUIRED` identifies a metric, observed baseline, threshold/risk, severity
and resolve condition.

`BLOCKED` is required when a representative environment, workload, dataset or measurement
tool is unavailable and a reliable disposition cannot be made.

## Regression

After optimization, repeat comparable measurement and run:

- functional acceptance tests;
- negative/failure tests;
- security/authorization/redaction tests;
- data/concurrency invariant tests;
- migration/compatibility tests when schema/config changed.

An improvement that breaks a required regression is not verified.

