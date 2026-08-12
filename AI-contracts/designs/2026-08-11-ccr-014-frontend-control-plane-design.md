# CCR-014 frontend control-plane design

## Repository facts

- `clients/` existed and was empty when bootstrap started.
- Backend state was at `TKT-W04-D05` `HANDOFF` with publication checkpoint `VERIFIED`.
- `.gitignore`, `.vscode/` and the Postman collection contained unrelated user changes.
- No frontend package, command, application source or test tooling existed.

## Outcome and scope

Create an independent, resumable frontend learning authority under `clients/contracts/`, plus a
minimal root router and deterministic synchronization/validation tooling. No UI or application
runtime is created.

## Authority and state design

- Backend canonical state: `AI-contracts/state/current-work.yml`.
- Frontend canonical state: `clients/contracts/state/current-work.yml`.
- Routing authority: `project-control/active-workstream.yml`.
- Generated summary: `project-control/full-stack-status.yml`.
- Generated FE projections: current ticket, next action and compact context.

The router selects one lane. It cannot update a lane's verdict. Each lane retains its own lifecycle,
ticket IDs, capability IDs, evidence and review.

## Frontend lifecycle

`STARTUP → LEARNING → ANALYSIS → DESIGN → READINESS → IMPLEMENTATION → VERIFICATION → REVIEW → HANDOFF`

Learning and delivery are independent dimensions. A learning pass does not imply readiness,
implementation, evidence or review.

## Senior capability trace

`Market requirement → senior capability → prerequisite → learning gate → Movie Ticket problem →
design decision → coding action → test → evidence → review`

The curriculum may prove `SENIOR_TECHNICAL_SCOPE_READY`; it cannot infer real-team tenure or a
Senior job title.

## Rejected alternatives

- One shared BE/FE state file: rejected because either lane could mutate the other's authority.
- Two active lanes without a router: rejected because a generic continuation request becomes
  ambiguous and violates one-delivery-lane learning cadence.
- Copying backend contracts into Stitch: rejected because a design tool is not product, behavior or
  security authority.
- Scaffold React during bootstrap: rejected because foundation learning and application readiness
  have not yet been observed.

## Trade-off and limitation

The repository gains more governance files and two validators. This cost buys deterministic resume
and honest evidence boundaries. The bootstrap does not prove curriculum mastery or application
behavior.

## Test matrix

- Synchronization: generated FE projections are idempotent and check mode detects drift.
- Validation: router paths exist, exactly one lane is active, FE state has one next action, referenced
  artifacts exist and no application marker is present.
- Repository: Markdown links, Mermaid syntax and existing backend projections remain valid.
- Status: `status:work` reports the routed FE next action and completion condition.

## Review status

`APPROVED` — explicit reviewer authorization on 2026-08-11.
