# CCR-004 — Pricing and endpoint completeness

## Status

`APPROVED`

- Approver: Van Phu Tin (project owner/reviewer)
- Approval date: 2026-07-26
- Evidence: direct reviewer approval in working session, 2026-07-26; contract
  amendments applied to `contracts/` and registered in `state/contract-status.yml`.
- Follow-up 2026-07-27: new endpoint IDs consumed by roadmap tickets `TKT-W06-D04`
  (`API-CAT-004..009`) and `TKT-W07-D04` (`API-BKG-001..005`); approval recorded in
  `03-project-contract.md`.

## Problem

The technical contracts drifted from the approved design documents in `docs/database`
and `docs/product-backlog`. Five gaps make the current contract set unimplementable or
ambiguous as written:

1. **Pricing is absent.** No entity in `data-contracts.md` carries a price, no business
   rule defines where the payment amount comes from, and `EVT-CAT-001` publishes a
   showtime snapshot without prices. Yet `BUS-005` requires webhook `amount/currency`
   verification — against a value the contracts never define. `docs/database` already
   designs this (`showtimes.base_price` integer VND, price snapshot per seat at booking
   time) but it was never promoted into the contracts.
2. **Endpoint inventory is incomplete.** Compared to
   `docs/product-backlog/06-api-backlog-summary.md`, `api-contracts.md` lacks the public
   seat map (`GET /showtimes/{id}/seats`), admin screen creation, admin seat-layout
   creation, and customer hold release. Without the seat map a Customer cannot know
   which seats to hold; without screen/seat endpoints the Catalog-owned entities cannot
   be created at all; `DATA-SM-003` contains `RELEASED` but no endpoint produces it.
3. **Ticket check-in is orphaned.** `DATA-SM-006` defines `CHECKED_IN`/`VOID` but no
   endpoint, actor or ticket exercises them.
4. **Showtime cancellation impact is undefined.** `EVT-CAT-002` says late cancellation
   "applies per booking policy", but no BUS rule defines that policy, and refund
   automation is out of scope per `SCOPE-002`.
5. **Retention is referenced but never specified.** `DATA-006` promises retention and
   deletion are "documented", but no document does so for refresh sessions, webhook
   payloads, idempotency records, inbox/outbox events or DLQ entries.

## Decision

Apply the following additive amendments upon approval.

### 1. Pricing (product, data, event contracts)

- New `BUS-009`: Price originates in Catalog. Each showtime carries a `base_price` in
  integer minor units (VND đồng, `> 0`); per-seat override MAY be introduced only by a
  reviewed design decision. Booking snapshots the effective seat price at publication
  consumption and again per seat at booking time; the payment amount MUST equal the sum
  of the booked seats' price snapshots. MVP currency is single (`VND`). Monetary values
  MUST use integer minor units; floating point representations are forbidden.
- Amend `DATA-CAT-001`: `showtimes` includes `base_price` with a positive check
  constraint.
- Amend `DATA-BKG-001`: `showtime_snapshots`/`showtime_seats` carry the price received
  in the published snapshot; `booking_seats` store the price snapshot at booking time;
  the booking total is derived from `booking_seats`, never re-read from live seat state.
- Amend `EVT-CAT-001`: published showtime snapshot payload includes seat pricing.
  Additive within `v1` per `EVT-COM-005`; no consumer is implemented yet, so no consumer
  migration is required.
- Clarify `BUS-005`: webhook `amount/currency` is verified against the booking total
  derived from price snapshots.

### 2. Endpoint inventory (API contracts)

New rows, inheriting all common contracts:

| Contract ID | Actor | Method path | Authz | Request → response | Status/failure | Idempotency |
|---|---|---|---|---|---|---|
| API-CAT-008 | Admin | `POST /api/v1/admin/cinemas/{id}/screens` | Admin | `ScreenWrite → ScreenResponse` | 201; 400/404/409 | required |
| API-CAT-009 | Admin | `POST /api/v1/admin/screens/{id}/seats` | Admin | `SeatLayoutWrite → SeatLayoutResponse` | 201; 400/404/409 duplicate label | required |
| API-BKG-004 | Guest | `GET /api/v1/showtimes/{id}/seats` | published only | none → `ShowtimeSeatMapResponse` | 200; 400/404 | safe |
| API-BKG-005 | Customer | `DELETE /api/v1/holds/{id}` | hold owner | none → `Empty` | 204; 401/403/404/409 | replay safe |

Notes: seat availability is served from Booking-owned snapshot/seat state, not Catalog;
releasing a hold already in a terminal state is a no-op or `409` per the reviewed design
ticket; seat map response exposes seat identity/state/price but never other actors'
identities.

### 3. Ticket check-in scope (data contracts)

Annotate `DATA-SM-006`: transitions beyond `ISSUED` (`CHECKED_IN`, `VOID`) are post-MVP.
No MVP endpoint or actor exercises them; introducing check-in requires a future CCR that
defines the acting role and its authorization. The states remain in the machine for
schema stability.

### 4. Showtime cancellation impact (product, event contracts)

- New `BUS-010`: Upon a verified `catalog.showtime.cancelled.v1`, Booking MUST release
  active holds (`RELEASED`), cancel `PENDING_PAYMENT` bookings (`CANCELLED`), and keep
  `CONFIRMED` bookings confirmed while flagging them for operator reconciliation, since
  refund automation is out of scope per `SCOPE-002`. All resulting transitions MUST be
  idempotent under duplicate delivery and audited.
- Amend `EVT-CAT-002`: replace "applies per booking policy" with a reference to
  `BUS-010`.

### 5. Retention (data contracts)

New `DATA-008`: The following data classes MUST have a documented retention and
purge/archival strategy before their owning module's MVP verification: expired/revoked
`refresh_sessions`, processed `inbox_events`/`outbox_events`, `idempotency_records`,
`payment_webhook_events` payloads, DLQ entries. Stored webhook payloads follow `SEC-007`
redaction. Concrete durations are chosen in the owning design ticket via a reviewed
decision; this contract requires that they exist, not specific numbers.

### 6. Named hold TTL (product contract)

Amend `BUS-003`: the hold expiry duration is a single named configuration parameter with
one source of truth; its default is chosen in the Booking design ticket. Scattered
hardcoded TTL literals are forbidden.

### Explicitly deferred, not silently dropped

Operator-facing endpoints (liveness/readiness, DLQ inspection/replay per `OPS-001`) are
not added to the public inventory by this CCR; they are specified in the worker and
observability design tickets. This deferral is recorded here so it is not read as
coverage.

## Compatibility

- All changes are additive; no existing contract ID is renamed, removed or re-scoped.
- New endpoint rows extend the inventory; no existing endpoint changes shape.
- `EVT-CAT-001` payload gains fields within `v1`; no implemented consumer exists, so no
  migration is triggered.
- `DATA-SM-006` annotation narrows MVP expectation without changing states or
  transitions.
- Ticket/capability/learning IDs remain stable; affected design tickets consume the new
  IDs at DoR time.

## State migration

Register `CCR-004` in `state/contract-status.yml` `open_change_requests` and record
`DRIFT-006`–`DRIFT-008`. No runtime, ticket or evidence state is created or altered.

## Risks and controls

| Risk | Control |
|---|---|
| Pricing added without matching docs/database design | contract text mirrors `docs/database/05-entities-booking.md` integer minor-unit and snapshot design |
| Float money representation slips in | `BUS-009` forbids floating point for monetary values |
| Seat map leaks other actors | response contract limited to seat identity/state/price |
| New endpoints inflate MVP scope | all four endpoints are `Must` items already present in the approved backlog |
| Check-in silently assumed implemented | `DATA-SM-006` annotation marks it post-MVP and gated behind a future CCR |
| Cancellation handling left to implementation whim | `BUS-010` fixes hold/pending/confirmed dispositions and idempotency |
| Retention numbers invented without workload knowledge | `DATA-008` requires existence of a reviewed strategy, not specific durations |

## Rollback

Remove `CCR-004` from the open registry and revert its drift findings. Because no
contract file changes take effect before approval, rollback of an unapproved draft is
registry-only. If rolled back after approval, revert the amended contract rows in a
follow-up CCR; never delete review history.

## Review requirements

- Confirm `BUS-009` matches the `docs/database` pricing design (integer VND, snapshot at
  booking time, total from `booking_seats`).
- Confirm seat availability ownership (Booking, not Catalog) is correct.
- Confirm the four new endpoints trace to `Must` backlog items.
- Confirm `BUS-010` dispositions are acceptable given refund automation is out of scope.
- Confirm check-in deferral does not conflict with any week 4–10 ticket.
- Confirm `DATA-008` classes are complete for the planned topology.
- Confirm no effective baseline is changed by this draft.
