---
name: generate-git-commit
description: Generate and execute repository-safe Git commits and publishing from real diffs. Use for commit messages, auto commit, autonomous checkpoint commits, branch creation, non-force push, Draft PR creation/update, or PR summaries. Follow approved CCR-006/007 and keep product code, contracts, control-plane, learning, project docs, viewers, and tooling in separate commit streams.
---

# Generate Git Commit

Turn real repository changes into reviewable commits and, when authorized by
`AI-contracts/15-git-and-pr-workflow.md`, publish them through a non-default branch and
Draft PR.

## Authority

Read these before mutating Git state:

1. nearest `AGENTS.md`;
2. `AI-contracts/state/current-work.yml`;
3. `AI-contracts/15-git-and-pr-workflow.md`;
4. approved CCR-006 and CCR-007.

Repository policy authorizes autonomous local commits, `codex/<work-unit>` branch
creation, non-force branch push, and Draft PR creation/update when their gates pass.
User requests may narrow this authority.

Never:

- push directly to the default branch;
- force-push or rewrite published history;
- merge, enable auto-merge, tag, release, or delete branches;
- stage secrets, unrelated user changes, caches, runtime output, or ambiguous files;
- bypass ticket, contract, expected-files, learning, design, readiness, or verification
  gates.

## Commit convention

Use:

```text
<type>[optional scope]: <imperative description>

Ticket: <ticket-id or none>
Contracts: <contract IDs, approved CCR, or none>
Evidence: <checks/artifacts, or NOT_RUN/NOT_AVAILABLE with reason>
```

Allowed types: `fix`, `feat`, `build`, `chore`, `docs`, `style`, `refactor`, `perf`,
`test`.

Keep the subject concise, imperative, and without a trailing period.

## Automatic workflow

### 1. Inspect

- Read branch, remote/default branch, status, staged/unstaged diff, recent log, and
  relevant state.
- If another process changes canonical state during the operation, stop and reconcile
  projections from canonical state.
- Treat an already staged diff as intentional only after reviewing its exact paths and
  hunks.

### 2. Classify

Assign every changed path to one stream:

| Stream | Typical paths |
|---|---|
| `PRODUCT_CODE` | `apps/**` including app tests/config/migrations |
| `PRODUCT_CONTRACT` | contracts, approved CCR, schemas, traceability |
| `CONTROL_PLANE` | policies, state, roadmap, audits, templates, `AGENTS.md`, context |
| `LEARNING` | learning contracts, curriculum, lab/learning evidence |
| `PROJECT_DOCS` | `docs/**`, root explanatory docs |
| `DOCS_TOOLING` | `docs-viewer/**`, `AI-contracts/viewer/**` |
| `REPOSITORY_TOOLING` | `.agents/**`, `.claude/**`, root tooling/config, `tools/**` |
| `LOCAL_ONLY` | secrets, caches, runtime output, temporary/machine-specific files |

Path ownership wins over extension. Split unrelated streams. Generated viewer data may
follow its source commit when required for a usable artifact; otherwise commit it
separately.

### 3. Select branch

- If on the default branch and changes are authorized, create
  `codex/<ticket-or-ccr>-<short-outcome>`.
- If already on a matching `codex/` branch, remain there.
- If the current non-default branch serves another work unit, stop instead of mixing
  scope.
- Preserve a dirty tree before switching; never discard user changes.

### 4. Verify and stage

- Run the smallest meaningful format/lint/test/build/validator checks available for the
  stream.
- Report missing tooling truthfully; never fabricate a pass.
- Scan intended changes for credentials, private keys, conflict markers, debug output,
  and suspicious binaries.
- Stage explicit paths or patch hunks. Never use `git add .` or implicit whole-repository
  staging.
- Review `git diff --cached` and `git diff --cached --check`.

### 5. Commit

- Generate the message from the staged diff only.
- Commit when the staged set has one coherent, independently revertible outcome.
- Repeat for additional streams in dependency order:

```text
approved contract → repository/tooling → product code → tests/evidence → projections/viewers
```

- Do not create an empty commit.

### 6. Publish

When CCR-007 gates pass:

1. confirm the branch is not the default branch;
2. non-force push and set upstream if needed;
3. verify local and remote branch SHA match;
4. create a Draft PR when none exists, otherwise update the existing Draft PR;
5. include Summary, Why, Changes, Verification, Risk & rollback, and Scope;
6. leave the PR Draft until lifecycle gates permit readiness.

If the remote lacks a default/base branch, do not invent or push one without explicit
bootstrap authority.

## Message-only requests

When the user asks only for a commit or PR message, inspect read-only state and return the
message without staging, committing, pushing, or changing a PR.

PR title uses the commit convention. PR body:

```markdown
## Summary
- ...

## Why
- ...

## Changes
- ...

## Verification
- [ ] ...

## Risk & rollback
- Risk: ...
- Rollback: ...

## Scope
- Ticket/CCR: ...
- Area: ...
```

## Completion report

Report:

- branch and upstream;
- commit hashes/messages and stream per commit;
- checks and limitations;
- PR URL/state when published;
- remaining uncommitted paths and why;
- exactly one project next action from canonical state.
