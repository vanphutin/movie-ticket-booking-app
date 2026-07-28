# Movie Ticket Booking — Codex operating rules

## Authority and startup

Before project work, read in this order:

1. `AI-contracts/state/current-work.yml`.
2. The authorized current ticket, when `ticket_id` is not `null`.
3. Only the effective contracts and capability records referenced by that ticket.
4. The real repository state: branch, status, recent log and relevant diff.
5. The active artifact and evidence referenced by canonical state.

Authority order:

`approved CCR → effective contracts → authorized current ticket → code → observed test/evidence`

`CODEX-CONTEXT.md` is a handoff projection, not a second source of truth. If it differs
from `AI-contracts/state/current-work.yml`, stop delivery work, report drift and reconcile
the projection from canonical state.

## Mandatory workflow

At most one primary ticket and one next action may be active.

Use this lifecycle:

`STARTUP → LEARNING → ANALYSIS → DESIGN → READINESS → IMPLEMENTATION → VERIFICATION → REVIEW → HANDOFF`

The current stage may advance only when its required artifact exists and the transition
conditions in `AI-contracts/state/README.md` are satisfied.

Required outputs:

| Stage | Required output |
|---|---|
| `STARTUP` | repository reconciliation report |
| `LEARNING` | observed learning checkpoint |
| `ANALYSIS` | analysis artifact |
| `DESIGN` | reviewed design note and expected-files manifest |
| `READINESS` | readiness verdict |
| `IMPLEMENTATION` | scoped diff and self-review |
| `VERIFICATION` | reproducible evidence manifest |
| `REVIEW` | acceptance-criteria review verdict |
| `HANDOFF` | canonical state update and compact context projection |

Do not:

- authorize a candidate ticket whose prerequisites are not `VERIFIED`;
- design, scaffold or implement while Foundation Gate `FG-001` is unverified;
- implement before learning, analysis, design and readiness gates permit it;
- change an effective contract without an approved CCR;
- expand scope beyond the authorized ticket or reviewed expected-files manifest;
- invent a file, command, output, test result, runtime state, commit or evidence;
- infer `VERIFIED` from `DONE`, a checkbox, a file existing or a reported result;
- open a dependent ticket while a current finding or acceptance criterion remains open;
- add module-specific format/lint/test commands before a real module and its tooling exist.

For a full learning gate, follow `AI-contracts/learning/decision-learning-standard.md`.
Teach realistic options, selected/rejected direction, trade-off, limitation, change
conditions and a counterexample at the gate's target level. Resolve the gate's reference
profile to 1–3 documentation links; references never override effective contracts or
count as proof of understanding.

When a requirement is ambiguous or conflicts with an effective contract, record the
question or blocker. Do not silently choose a new requirement.

## Implementation and verification

Before modifying application files, confirm:

- the ticket is authorized;
- `definition_of_ready_status` is `READY`;
- the design has been reviewed;
- `expected-files.yml` permits the target;
- the acceptance criterion and verification boundary are known.

If implementation needs an unplanned file, return to `DESIGN` and update/review the
expected-files manifest first.

Evidence must record prediction, exact command, working directory, environment, exit
code, observation, artifact path and limitation. Report `NOT_RUN`, `INTERRUPTED` or
`MISSING` rather than filling gaps.

## Documentation and Mermaid validation

After creating or modifying Markdown documentation:

1. Run `npm run check:docs`.
2. If validation reports a Mermaid file and line, repair that source diagram.
3. Re-run `npm run check:docs` until the command exits successfully.
4. Do not declare documentation work complete while this validation is failing.

All Mermaid diagrams use the centralized template configured in `docs-viewer/app.js`.
Do not add per-diagram `%%{init: ...}%%`, `theme` or renderer configuration directives.
Do not edit `docs-viewer/docs-data.js` manually; regenerate it through
`npm run check:docs`.

Automated normalization may only perform syntax-preserving changes. If an automatic
rewrite could alter the meaning, participants, messages, states, edges or security
boundary of a diagram, repair the Markdown source explicitly and validate it again.

## Handoff

Before ending material project work:

1. Update `AI-contracts/state/current-work.yml` from observed evidence or explicit
   reviewer decisions.
2. Run `node tools/control-plane/sync-control-plane.mjs`; do not edit generated files or
   delimited generated regions by hand.
3. Run `node tools/repository/validate-repository.mjs`.
4. Review the canonical and generated diff together.
5. Report exactly one next action and its completion condition.

Do not rewrite evidence, approval history or reviewer verdicts merely to make validation
pass.

## Autonomous local commit policy

Follow `AI-contracts/15-git-and-pr-workflow.md` and approved `CCR-006`.

- Treat `apps/**` as product code and never mix it with unrelated learning, contracts,
  project docs or viewer changes.
- Classify every changed path into one commit stream before staging.
- Stage explicit paths or hunks; never stage the whole repository implicitly.
- Review the staged diff and run the smallest relevant checks before every commit.
- Keep canonical state and affected projections in the same control-plane commit.
- Preserve ambiguous user changes unstaged and report them.
- Local commits are autonomous when policy gates pass.
- Under approved CCR-007, create/switch `codex/<work-unit>` branches, non-force push
  verified branches and create/update Draft PRs autonomously.
- Under approved CCR-010, do not change the canonical ticket/work unit until the outgoing
  branch is coherently committed, non-force pushed, verified against its remote-tracking
  ref, represented by a Draft PR and recorded in
  `AI-contracts/state/work-unit-checkpoint.yml`.
- Never push directly to the default branch, force-push, merge/enable auto-merge, tag,
  release, delete branches or rewrite published history without separate authority.
