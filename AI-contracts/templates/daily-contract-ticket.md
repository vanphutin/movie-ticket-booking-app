# Daily contract ticket

> Planned fields are not repository/runtime evidence.

```yaml
ticket_id:
baseline:
week:
day:
phase_id:
milestone_id:
capability_ids: []
contract_ids: []
architecture:
  service_owner:
  layers_touched: []
  ports_or_adapters: []
  cross_service_contracts: []
title:
actor:
business_outcome:
learning_outcome:
learning_gate:
  learning_gate_id:
  prerequisite_concepts: []
  theory_topics: []
  misconceptions: []
  security_or_failure_focus: []
  check_question_dimensions: []
  target_level:
  reference_profile:
  decision_points: []
  counterexamples: []
  pass_conditions: []
  design_unlock_condition:
  skeleton_unlock_condition:
  status: NOT_EVALUATED
post_mvp_optimization:
  applicability: NOT_APPLICABLE
  optimization_gate_id:
  eligibility_condition:
  dependency_unlock_condition:
prerequisites: []
definition_of_ready: []
scope: []
out_of_scope: []
assumptions: []
invariants: []
acceptance_criteria: []
failure_cases: []
security_cases: []
design_requirements: []
implementation_constraints: []
expected_files: []
tooling_commands:
  availability: NOT_AVAILABLE
  format: null
  lint: null
  test: null
verification_plan: []
evidence_required: []
required_artifacts:
  - analysis
  - design
  - expected-files
  - readiness-verdict
  - self-review
  - evidence
  - acceptance-review
definition_of_done: []
completion_condition:
reviewer_focus: []
next_ticket_dependencies: []
core_or_stretch: CORE
estimated_time:
status: NOT_STARTED
```

Acceptance criterion dùng ID `AC-<ticket>-N`; test `TEST-<ticket>-N`; evidence
`EVD-<ticket>-N`. `expected_files` và planned tooling không chứng minh file/command tồn
tại. Không điền output giả vào template.

Learning gate ID dùng `LG-<ticket-id>`. `learning_outcome` được giữ để tương thích;
learning gate là projection chi tiết. Trạng thái learning không tự cập nhật DoR,
execution, evidence hoặc review.

Ticket vertical-slice/module MVP đổi `post_mvp_optimization.applicability` thành
`REQUIRED_AFTER_MVP_VERIFIED`. Field này không cấp quyền tối ưu trước khi source ticket
`VERIFIED`.
