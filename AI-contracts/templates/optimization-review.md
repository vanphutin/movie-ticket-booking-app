# Optimization review — <OPT-GATE-ID>

```yaml
optimization_review_id:
module_or_capability:
source_mvp_ticket:
mvp_review_status:
eligibility:
classification:
workload_model:
environment:
dataset_profile:
performance_budget:
baseline_evidence: []
correctness_or_safety_findings: []
optimization_findings: []
decision: NOT_EVALUATED
severity:
selected_optimization:
rejected_alternatives: []
trade_offs: []
before_after_evidence: []
regression_evidence: []
defer:
  owner:
  reason:
  optimization_budget:
  deadline_or_gate:
  risk_acceptance:
  regression_guard:
review_status:
dependency_unlocked: false
next_action:
reviewer:
reviewed_at:
```

Valid decisions:

```text
NOT_REQUIRED
OPTIMIZATION_REQUIRED
DEFERRED_WITH_BUDGET
OPTIMIZED_VERIFIED
BLOCKED
```

Do not fill planned metrics or example output as observed evidence. `BLOCKER/HIGH`
cannot use the defer block. `NOT_REQUIRED` requires baseline/risk evidence and does not
require a code change.

