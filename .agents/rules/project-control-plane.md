# Movie Ticket Booking project control plane

Apply this rule for every task in this workspace.

Before doing project work:

1. Read @../../AGENTS.md completely.
2. Read @../../AI-contracts/state/current-work.yml.
3. When `ticket_id` is not `null`, read the authorized current ticket.
4. Read only the effective contracts and capability records referenced by that ticket.
5. Reconcile the current branch, repository status, recent log, relevant diff, active
   artifact, and canonical evidence before making changes.

Treat `AI-contracts/state/current-work.yml` as the canonical source for the current
stage, authorized ticket, blockers, required output, and next action.

`CODEX-CONTEXT.md` is a generated handoff projection, not a second source of truth. If
it conflicts with `AI-contracts/state/current-work.yml`, stop delivery work, report the
drift, and reconcile the projection from canonical state.

Follow the lifecycle, implementation gates, verification requirements, Git policy, and
handoff procedure in `AGENTS.md`. Do not bypass a gate or expand scope merely because a
task was requested through Antigravity.
