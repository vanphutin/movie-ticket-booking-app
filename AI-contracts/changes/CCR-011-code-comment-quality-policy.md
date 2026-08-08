# CCR-011 — Intent-revealing code comment policy

## Status

`APPROVED`

- Requested by: Van Phu Tin
- Requested at: 2026-07-31
- Approved by: Van Phu Tin
- Approved at: 2026-07-31
- Approval evidence: explicit `duyệt` response after reviewing the proposed CCR
- Effective baseline before approval: `PC-2026.8`
- Proposed baseline after approval: `PC-2026.9`
- Application/runtime change: none

## Problem

The effective workflow requires implementation self-review, documentation/traceability
and PR-style review, but it does not define a normative code-comment review. An AI can
therefore finish an implementation without checking whether non-obvious design intent,
invariants, security boundaries, concurrency behavior, failure semantics or temporary
workarounds need to be preserved next to the code.

A blanket requirement to comment every completed implementation would create a different
failure mode: comments that repeat syntax, narrate obvious control flow or become stale
and contradict the executable behavior. The missing policy is therefore not “more
comments”; it is a repeatable decision about when a comment is necessary and what quality
it must have.

## Decision

Upon approval, the project adopts a mandatory **code-comment review** as part of
implementation self-review and contract-based code review.

### Required review

For every authored or materially modified application-code unit, Codex MUST inspect the
changed code and record exactly one comment-review disposition:

- `COMMENTS_ADDED`: a required intent-bearing comment was added or materially corrected;
- `COMMENTS_NOT_REQUIRED`: names, types, structure and tests already communicate the
  necessary intent, so no comment was added;
- `STALE_COMMENTS_REMOVED`: an inaccurate, redundant or obsolete comment was removed;
- `COMMENTS_UPDATED`: an existing useful comment was updated to remain consistent with
  changed behavior.

Multiple dispositions MAY be recorded for different files or findings, but every
materially changed application-code unit MUST be covered by the review. A disposition is
self-review evidence, not proof that the implementation is correct.

### Comments that are required

A code comment MUST be present when information necessary for safe maintenance cannot be
made sufficiently clear through naming, types, structure, executable validation or tests
alone. This includes:

1. the reason for a non-obvious architecture or design choice;
2. a business or data invariant whose enforcement is distributed across boundaries;
3. a security or trust-boundary assumption that a maintainer could otherwise weaken;
4. transaction, locking, idempotency, retry, replay or unknown-commit-outcome behavior
   whose safety depends on a non-obvious ordering or constraint;
5. compatibility, migration or protocol behavior that must be preserved for an external
   consumer;
6. a necessary framework, provider or database workaround, including the condition under
   which it can be removed; or
7. an intentionally surprising limitation or rejected obvious alternative where removing
   the apparent irregularity would introduce a defect.

Comments MUST explain **why**, the invariant or the constraint. They MUST NOT be used as a
substitute for missing validation, tests, error handling, contract definition or clear
code structure.

### Comments that are prohibited

Codex MUST NOT add or preserve comments that:

- merely translate a statement, method name or control-flow step into prose;
- describe behavior that is no longer true;
- duplicate a contract or test without adding local maintenance context;
- contain secrets, credentials, tokens, personal data or sensitive payload examples;
- claim a test, runtime result, guarantee or compatibility state without evidence;
- preserve dead code instead of relying on version control; or
- use vague annotations such as `TODO`, `FIXME`, `HACK` or `TEMP` without traceable
  ownership and a removal condition.

### TODO and workaround traceability

Every committed `TODO`, `FIXME`, `HACK` or temporary-workaround comment MUST include:

- a ticket, finding or approved decision identifier;
- the concrete unresolved reason;
- the completion or removal condition; and
- an owner when ownership is not already unambiguous from the referenced artifact.

Such a comment MUST NOT defer a current acceptance criterion, hide a blocker or expand
scope beyond the authorized ticket. If no authorized traceability target exists, the
annotation MUST NOT be committed.

### Public API documentation

JSDoc or equivalent API documentation is required only when the public signature, types
and naming do not fully communicate caller obligations, error/failure semantics,
side-effects or lifecycle constraints. Documentation that only restates the signature is
not required and SHOULD be removed.

### Review severity

- A misleading comment that can cause a security, data-integrity, compatibility or
  concurrency defect is reviewed at the severity of that potential defect.
- A missing comment is a finding only when one of the required-comment conditions above
  is met and the intent cannot reasonably be expressed in executable structure.
- Comment density, comment count and documentation percentage MUST NOT be used as quality
  gates.

## Scope and rollout

After approval, this policy applies repository-wide to newly authored or materially
modified application code. It does not require a bulk retrofit of untouched historical
code.

The rollout MUST update, in separate authorized contract/control-plane changes:

1. `05-software-engineering-workflow.md` so SE-3 requires the comment-review disposition;
2. `07-code-review-policy.md` so reviewers check required, prohibited and stale comments;
3. `contracts/quality-contract.md` with a stable quality contract ID for intent-bearing
   comments;
4. the applicable Definition of Done and review/self-review templates;
5. module-scoped `AGENTS.md` guidance when the affected module already exists; and
6. deterministic validation only for mechanically provable rules, such as untraceable
   `TODO`/`FIXME` markers. Semantic comment quality remains a human/AI review concern.

Approval MUST NOT alter the current ticket, lifecycle stage, readiness verdict,
expected-files manifest, implementation evidence or review verdict. Rollout files that
are outside the current ticket require their own reviewed expected-files authority before
modification.

## Alternatives considered

### Selected: mandatory decision, comments only for non-obvious intent

This makes comment review repeatable while keeping code, types and tests as the primary
explanation mechanism.

### Rejected: require comments after every implementation

This incentivizes redundant narration, comment-count gaming and stale prose. It does not
improve maintainability when the code is already self-explanatory.

### Rejected: leave comments entirely to reviewer preference

This preserves the current gap: important security, transaction and compatibility intent
can be omitted without an explicit review result.

### Rejected: enforce a comment-density metric

Density cannot distinguish useful rationale from noise and would reward the wrong
behavior.

## Compatibility

- No product behavior, API, event, data schema or runtime dependency changes.
- Existing comment-free code is not non-compliant until it is materially modified or a
  review identifies a required-comment condition.
- Existing valid comments remain valid; misleading comments become findings when observed.
- Current ticket and baseline `PC-2026.8` remain effective until explicit reviewer
  approval and rollout.

## Risks and controls

| Risk | Control |
|---|---|
| AI adds comments everywhere to satisfy the policy | Explicit `COMMENTS_NOT_REQUIRED` disposition and prohibition on syntax narration |
| Useful intent is forced into prose instead of code | Comments cannot replace names, types, validation, tests or structure |
| Comments become stale | Mandatory update/removal review for materially changed code |
| TODOs become permanent hidden scope | Traceable identifier, reason, owner and removal condition |
| Semantic quality is falsely claimed by a linter | Automation limited to mechanically provable rules |
| Current D05 scope is expanded | Approval does not authorize rollout outside its reviewed manifest |

## Verification requirements

Before `PC-2026.9` can become effective:

- reviewer explicitly approves this CCR;
- all rollout paths are authorized and reviewed;
- the workflow, review policy, quality contract and templates use consistent normative
  language and dispositions;
- generated projections are synchronized through the control-plane command;
- `npm run check:docs` exits successfully;
- `node tools/repository/validate-repository.mjs` exits successfully; and
- the diff confirms no product runtime behavior or current-ticket status was changed.

## Rollback

Before approval, remove `CCR-011` from `open_change_requests` and clear the proposed
baseline/status; no effective policy changes need rollback.

After approval, rollback requires a follow-up CCR. Historical approval and review evidence
MUST remain intact even if the policy is superseded.

## Review requirements

- Confirm the policy requires a review decision, not a comment on every code change.
- Confirm the required-comment categories cover design intent, invariants, security,
  concurrency/failure, compatibility and workarounds.
- Confirm comments cannot replace executable checks or tests.
- Confirm `TODO`/`FIXME` traceability is strict enough without inventing tickets.
- Confirm semantic comment quality is not reduced to a density metric or linter claim.
- Confirm rollout does not alter `TKT-W04-D05` scope or effective baseline before
  approval.

## Verdict

`APPROVED`
