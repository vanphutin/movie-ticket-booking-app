# CCR-006 — Autonomous commit policy for a shared learning repository

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-07-28
- Materialized by: Codex
- Approved by: Van Phu Tin
- Approved at: 2026-07-28
- Approval evidence: explicit `duyệt` response to CCR-006
- Effective baseline before approval: `PC-2026.3`
- Application/runtime change: none

## Problem

The repository is both:

1. a product repository whose application source belongs under `apps/`; and
2. a shared learning workspace containing AI contracts, learning evidence, plans,
   diagrams and documentation viewers.

The current Git policy requires small ticket commits but does not define path ownership,
generated-file handling, autonomous commit checkpoints or how to split a dirty tree that
contains several kinds of work. This makes it possible to mix product code with learning
material or control-plane state in one opaque commit.

## Proposed decision

Codex MAY decide when to create local commits without asking for confirmation on every
commit, but only under the classification, readiness and safety rules below. This
authority covers local commits only. It does not authorize push, force-push, merge,
release, tag, PR creation or rewriting published history.

## Commit streams

Every changed path must be assigned to exactly one stream before staging.

| Stream | Primary paths | Purpose | Commit type |
|---|---|---|---|
| `PRODUCT_CODE` | `apps/**` | application source, module config, app tests and app-local migrations | `feat`, `fix`, `refactor`, `test`, `perf`, `build` |
| `PRODUCT_CONTRACT` | `AI-contracts/contracts/**`, `AI-contracts/changes/**`, contract schemas/traceability | approved requirements, architecture and API/data/event/security/quality authority | `docs(contracts)` |
| `CONTROL_PLANE` | `AI-contracts/state/**`, policies, templates, roadmap, audits, root `AGENTS.md`, `CODEX-CONTEXT.md`, control-plane tools | workflow state, gates, evidence and enforcement | `chore(control-plane)` |
| `LEARNING` | `AI-contracts/learning/**`, learning/lab evidence and curriculum documents | teaching content, learning checkpoints and retention | `docs(learning)` |
| `PROJECT_DOCS` | `docs/**`, root `README.md`, non-contract project documentation | backlog projections, plans, diagrams and explanatory docs | `docs(project)` |
| `DOCS_TOOLING` | `docs-viewer/**`, `AI-contracts/viewer/**` | viewer source and generated indexes | `chore(docs-viewer)` |
| `REPOSITORY_TOOLING` | root tooling/config not owned by an app, `tools/**`, root `package.json` | repository-wide automation | `chore(tooling)` |
| `LOCAL_ONLY` | secret, cache, runtime output, temporary or machine-specific files | never committed | none |

An app-owned configuration or test stays in `PRODUCT_CODE` even if its extension is
Markdown, JSON or YAML. Path ownership wins over file extension.

## Split rules

1. Never mix `PRODUCT_CODE` with learning, project documentation, viewers or unrelated
   control-plane changes.
2. Product contract changes may share a commit with their registry/schema only when one
   approved CCR makes them one atomic contract change.
3. Canonical state plus its compatibility projections and `CODEX-CONTEXT.md` must remain
   in the same `CONTROL_PLANE` commit when they describe one transition.
4. Generated viewer data must be committed with the source documents that caused it only
   when it is required for an immediately usable artifact; otherwise use a following
   `DOCS_TOOLING` commit that references the source commit.
5. Cross-stream work is committed in dependency order:

   `approved contract → repository/tooling → product code → tests/evidence → projections/viewers`

6. A mixed worktree is not evidence that changes belong together. Codex stages explicit
   path lists or patch hunks and leaves unrelated user changes unstaged.

## Autonomous commit checkpoint

Codex creates a local commit when all applicable conditions are true:

- the change has one coherent outcome and one stream;
- the authorized ticket/approved CCR permits every staged path;
- expected-files permits application paths when application work is involved;
- required format/lint/test/validator checks for that stream have passed or are reported
  truthfully as `NOT_AVAILABLE`/`NOT_RUN` where the contract permits;
- staged diff has been reviewed, contains no secret or unrelated user change and has no
  unresolved conflict marker;
- canonical state and generated projections are synchronized when affected;
- the commit leaves the repository at a useful checkpoint that another session can
  understand or safely revert.

Codex SHOULD commit at:

- an approved contract change applied and validated;
- a ticket stage boundary with its required artifact complete;
- a product vertical slice whose relevant checks pass;
- a focused bug fix with a reproducing test/evidence;
- a handoff boundary before switching ticket or work stream.

Codex SHOULD NOT commit merely because time passed, many files changed, the session is
ending, or a validator can be made green.

## Stop conditions

Codex must not commit and must report the blocker when:

- a changed effective contract has no approved CCR;
- a staged path is outside the authorized ticket/expected-files manifest;
- source and generated artifacts disagree;
- verification failed for staged product code;
- a secret, credential, personal data or suspicious binary/generated artifact is present;
- ownership of an existing user change is unclear;
- the only way to make a clean commit would rewrite or discard user history.

## Commit messages

Use Conventional Commit form:

```text
<type>(<scope>): <imperative outcome>

Ticket: <ticket-id or none>
Contracts: <contract IDs or approved CCR>
Evidence: <commands/artifact or NOT_RUN with reason>
```

Examples:

```text
docs(contracts): reconcile the 55-endpoint inventory

Ticket: none
Contracts: CCR-005, API-COM-007..010, TRC-001..003
Evidence: node tools/control-plane/validate-control-plane.mjs
```

```text
feat(identity): implement refresh-token family rotation

Ticket: TKT-W04-D05
Contracts: API-AUTH-003, SEC-002, DATA-IDN-001
Evidence: identity unit/integration/contract checks
```

## Initial repository cleanup

The existing dirty tree predates this policy and must not be committed as one batch.
After approval, Codex will:

1. inventory every changed and untracked path;
2. preserve existing user changes;
3. group them by the streams above;
4. inspect each staged diff and run its applicable checks;
5. create separate local commits in dependency order;
6. leave any ambiguous or failing group uncommitted with a precise report.

No push or history rewrite is part of this cleanup.

## Files affected after approval

- `AI-contracts/15-git-and-pr-workflow.md`
- `AGENTS.md`
- `AI-contracts/templates/daily-contract-ticket.md`
- `AI-contracts/templates/pull-request.md`
- `AI-contracts/state/current-work.yml`
- compatibility projections and `CODEX-CONTEXT.md`
- optional validation rules/fixtures under `tools/control-plane/`

## Validation requirements

- every repository path classifies into one stream;
- application paths never appear in a learning/docs-only commit fixture;
- state projections cannot be split from their canonical transition;
- unapproved contract changes and secrets block commit;
- staged paths are explicit and the staged diff is reviewed;
- validator and commit-policy negative fixtures pass.

## Approval verdict

`APPROVED`

Approval must explicitly authorize:

1. autonomous local commits by Codex;
2. the stream/path classification;
3. splitting the existing dirty tree into multiple local commits;
4. no automatic push, merge, tag, release or history rewrite.
