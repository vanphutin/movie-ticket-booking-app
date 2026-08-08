# Evidence Manifest — TKT-W04-D04

## Environment

- **Date:** `2026-07-30`
- **Working directory:** `D:\back-end\EDUCATION-BACKEND\MovieTicketBookingApp`
- **Branch:** `codex/tkt-w04-d04-api-rbac-contract`
- **Boundary:** static OpenAPI, documentation, control-plane and scoped-diff evidence;
  no runtime auth implementation exists in this ticket

## EVD-W04-D04-01 — OpenAPI 3.1 validation

- **Prediction:** The auth API description is a valid OpenAPI 3.1 document and all local
  references resolve.
- **Command:**

  ```powershell
  npx --yes @redocly/cli@2.9.0 lint AI-contracts/openapi/auth-api.v1.yaml
  ```

- **Exit code:** `0`
- **Observation:** Redocly reported `Your API description is valid`. It produced one
  warning from the recommended `info-license` rule because the repository has no
  approved license metadata in this contract.
- **Artifact:** `AI-contracts/openapi/auth-api.v1.yaml`
- **Limitation:** This proves OpenAPI structure/reference validity, not runtime request,
  response, persistence, concurrency or security behavior. The one metadata warning is
  retained rather than inventing a project license.

## EVD-W04-D04-02 — Documentation and Mermaid validation

- **Prediction:** Modified Markdown and generated documentation remain valid, Mermaid
  sources parse and control-plane projections synchronize.
- **Command:**

  ```powershell
  npm run check:docs
  ```

- **Exit code:** `0`
- **Observation:** Mermaid syntax `10.9.6` passed for 10 diagrams; generated projections
  synchronized; repository consistency passed. The validator retained its existing
  warning that `docs\traceability-matrix.md` is a declared legacy projection.
- **Artifacts:** Design note, test matrix and generated documentation projections.
- **Limitation:** Documentation validation does not execute an HTTP service.

## EVD-W04-D04-03 — Repository consistency

- **Prediction:** Canonical state, projections, publication checkpoint and local
  references are consistent after contract artifact creation.
- **Command:**

  ```powershell
  node tools/repository/validate-repository.mjs
  ```

- **Exit code:** `0`
- **Observation:** Repository consistency passed: generated projections synchronized,
  control plane valid, Mermaid valid, work-unit publication checkpoint valid and
  Markdown/HTML/CSS local references valid.
- **Artifacts:** `AI-contracts/state/current-work.yml` and generated projections.
- **Limitation:** The declared legacy traceability projection warning remains
  informational and unrelated to D04 acceptance criteria.

## EVD-W04-D04-04 — Diff hygiene and scope inspection

- **Prediction:** The diff contains no whitespace errors and no application
  implementation path is introduced.
- **Commands:**

  ```powershell
  git status --short
  git diff --check
  git diff --stat
  ```

- **Exit code:** `0`
- **Observation:** `git diff --check` produced no error. Status showed D04 learning,
  analysis, design, readiness, OpenAPI and contract-test artifacts plus canonical and
  generated control-plane projections. No `apps/**`, migration or runtime application
  path was present.
- **Artifacts:** Working-tree diff on `codex/tkt-w04-d04-api-rbac-contract`.
- **Limitation:** Newly created untracked files do not appear in `git diff --stat` until
  staged; their presence and paths were observed through `git status --short`.

## Acceptance-criteria evidence map

| Criterion | Evidence | Observation |
|---|---|---|
| `AC-W04-D04-1` — OpenAPI schemas complete | `EVD-W04-D04-01`, OpenAPI artifact | Valid OpenAPI 3.1 with five reviewed operations and resolved references |
| `AC-W04-D04-2` — deny matrix | Approved design plus `SEC-*` cases in the test matrix | Strict DTO, neutral credential failure and spoofed-actor denies are specified |
| `AC-W04-D04-3` — contract tests planned | `AI-contracts/tests/auth-api-contract-test-matrix.md` | Static, schema, behavior, idempotency, replay, enumeration and disclosure predictions are enumerated |

## Honest verification boundary

- **Observed:** static OpenAPI validity, local reference resolution, documentation,
  Mermaid, control-plane, repository consistency, diff hygiene and artifact scope.
- **Not run:** live HTTP contract tests, database concurrency, token rotation/revocation,
  encrypted idempotency response storage, Gateway header stripping and log-redaction
  tests.
- **Reason:** Runtime implementation is explicitly outside `TKT-W04-D04` and belongs to
  `TKT-W04-D05`.
- **Evidence status:** `SUBMITTED_FOR_REVIEW`.
