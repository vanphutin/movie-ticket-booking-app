# Frontend contracts

This directory is the independent canonical control plane for frontend learning and delivery.
Backend state under `AI-contracts/` is read-only from this workstream. The root workstream router
selects which lane may advance.

Canonical state: `state/current-work.yml`. Generated projections: `state/current-ticket.yml`,
`state/next-action.yml` and `../CODEX-CONTEXT.md`.

Effective frontend contracts change only through an approved `FE-CCR-NNN` under `changes/`, using
the policy in `04-frontend-contract-change-policy.md`.
