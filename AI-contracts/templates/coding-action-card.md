# Coding Action Card — <STEP-ID>

Use this full card when assigning a new `apps/**` coding step or materially changing the
current one. Use the compact update only while the same step remains active.

## 1. Current position

- Ticket:
- Feature or boundary:
- Layer:
- Phase:
- Previous observed step:
- Current step ID:

## 2. Problem to solve

Describe the business or technical scenario without assuming the implementation.

## 3. Why this step is required

State the risk, invariant, contract, failure mode or learning objective.

## 4. Required behavior

- Given/When/Then scenario:
- Failure/security scenario:
- Public or boundary outcome:

## 5. Affected files

| Path | Create/modify | Responsibility |
|---|---|---|
| `apps/...` |  |  |

Every path must already exist in the reviewed expected-files manifest.

## 6. Concrete coding work

List the types, ports, use cases, tests, fakes, assertions or wiring required now.

## 7. Explicit exclusions

List adjacent adapters, transports, migrations, refactors or later TDD phases that are
not part of this step.

## 8. Verification and completion condition

- Prediction:
- Working directory:
- Exact command:
- Expected result:
- Completion condition:
- Unrelated failures that do not count:

For RED, compilation/import/configuration/fixture failure is not a clean RED. The test
must fail for the intended missing production behavior.

## Compact same-step update

- Step ID:
- Observed delta:
- Remaining work:
- Verification status:
- Unchanged completion condition:
