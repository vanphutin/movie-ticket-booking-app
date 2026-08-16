# Frontend contract change policy

An effective frontend contract changes only through a reviewed frontend contract change request
(`FE-CCR-NNN`). A reviewer instruction may approve a clearly bounded change when the record quotes
that instruction as approval evidence; ambiguity keeps the request in `DRAFT` or `IN_REVIEW`.

Each request records the old and new rule, affected actors and consumers, compatibility, migration,
rollback, verification and ticket impact. Its lifecycle is:

`DRAFT → IN_REVIEW → APPROVED | REJECTED | SUPERSEDED`

Only `APPROVED` requests may modify the effective frontend baseline. Rollout requires a reviewed
design, an expected-files manifest, readiness, reproducible evidence and acceptance review. A
frontend change cannot alter backend authority or claim application behavior without observed
evidence.

An interrupted delivery ticket remains incomplete. Contract work may temporarily take priority only
when the reviewer explicitly orders it, the outgoing branch is already non-force published and
represented by a Draft PR, and the change record preserves the ticket's prior stage and next action.
After rollout, delivery resumes from that preserved checkpoint unless the reviewer separately
authorizes another ticket transition.
