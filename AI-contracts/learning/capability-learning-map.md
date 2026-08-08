# Capability learning map

This is the reusable concept source for learning gates. Ticket projections select only
the concepts needed for the current outcome.

Detailed mental models, option comparisons, counterexamples, target levels and reference
profiles are canonical in `capability-lesson-specs.md`. This table remains the compact
capability index.

| Capability | Business problem and mental model | Core theory | Failure/security and project application |
|---|---|---|---|
| CAP-CON-01 | Deliver from explicit authority and evidence | contract vs plan vs observation; source of truth; invariant; gate; traceability | contract drift, fake evidence; map Movie Ticket Booking owners and trust boundaries |
| CAP-IDN-01 | Identify actors and protect credentials/sessions | identity vs credential; adaptive password hashing; session lifecycle; role assignment | enumeration, plaintext secrets, session replay; Identity owns user/credential/session |
| CAP-SEC-01 | Authenticate and authorize without trusting the client | authentication vs authorization; JWT signing/claims/expiry; access vs refresh token; rotation/revocation/reuse; RBAC and ownership | stolen/replayed token, 401 vs 403, actor spoofing, redaction; Gateway verifies/propagates and Identity owns lifecycle |
| CAP-CAT-01 | Publish valid catalog data and serve bounded queries | aggregate and lifecycle; DTO boundary; validation; pagination/filter/sort; index from workload | invalid publish, mass assignment, unbounded/N+1 query; Catalog owns movie/trailer |
| CAP-SCH-01 | Maintain valid cinema, screen, seat and showtime schedules | state machine; uniqueness; temporal overlap; database constraints; transition policy | duplicate seat, overlapping showtime, invalid publish; Catalog owns scheduling |
| CAP-EVT-01 | Share facts reliably across service boundaries | event fact vs command; envelope/versioning; at-least-once; outbox/inbox; ordering and compatibility | duplicate, late, out-of-order, poison event; showtime facts flow Catalog to Booking |
| CAP-BKG-01 | Hold and book seats without violating ownership or expiry | snapshot ownership; hold/booking state; expiry; idempotent command; resource authorization | stale snapshot, expired hold, cross-user access; Booking owns availability and booking |
| CAP-CONC-01 | Produce one valid winner under race | transaction boundary; isolation; row/advisory lock; constraint; deadlock and retry | lost update, oversell, deadlock; real-database exactly-one-winner test |
| CAP-PAY-01 | Accept only verified payment outcomes and issue one ticket | payment/booking/ticket state; webhook signature; amount/currency/reference; idempotency and reconciliation | spoof/replay/mismatch/out-of-order callback; Booking/payment adapter preserves ticket-once invariant |
| CAP-WRK-01 | Recover background effects without infinite or duplicate work | relay/worker lifecycle; ACK/effect crash windows; backoff/jitter; bounded retry; DLQ | poison job, retry storm, crash before/after effect; worker uses contracts, not arbitrary DB access |
| CAP-OBS-01 | Correlate failures without leaking or exploding telemetry | structured logs; correlation/trace propagation; metrics cardinality; redaction | token/PII logs, lost context, unbounded labels; trace Gateway through owner service/event |
| CAP-OPS-01 | Keep deploys recoverable and dependencies bounded | health vs readiness; timeout/retry budget; graceful shutdown; migration/rollback; backup/restore | false-ready, hanging call, retry storm, corrupt restore; reproducible Compose/CI/runbook |
| CAP-REL-01 | Make release claims reproducible and defensible | contract audit; load model; regression; evidence manifest; handover and trade-off defense | hidden local state, misleading benchmark, undocumented drift; clean checkout release verdict |

## Teaching pattern

For a selected capability, teach only the ticket-relevant subset in this order:

`problem → what → why → when/owner → flow → failure/security → project application`.

Framework syntax follows the concept and approved design. It never replaces the mental
model or becomes a source of technical authority.

Each full gate must resolve the target level and reference profile in
`ticket-learning-map-weeks-4-10.md`.
