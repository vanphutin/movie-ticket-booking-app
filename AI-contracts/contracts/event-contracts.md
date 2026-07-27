# Event contracts

## Envelope and delivery

`EVT-COM-001`: Envelope `{eventId,eventName,schemaVersion,occurredAt,producer,correlationId,causationId,aggregateId,payload}`; JSON schema/AsyncAPI fixture required.  
`EVT-COM-002`: Delivery at-least-once; consumer inbox/dedup by `eventId`; producer outbox atomically with state.  
`EVT-COM-003`: Ordering only guaranteed/documented per aggregate key; consumer handles duplicate/late/out-of-order and ignores compatible unknown fields.  
`EVT-COM-004`: bounded exponential backoff+jitter; poison event → DLQ with redacted metadata; lost delivery detected by outbox lag/reconciliation.  
`EVT-COM-005`: additive compatible schema within version; rename/remove/type change needs new version, consumer migration and CCR.

| Event ID | Name/version | Producer → consumer | Meaning/schema | Partition/idempotency | Failure/observability |
|---|---|---|---|---|---|
| EVT-CAT-001 | `catalog.showtime.published.v1` | Catalog → Booking | published showtime snapshot: showtime/movie/screen/start/end/seats+pricing/version | key `showtimeId`; `eventId` | duplicate ignored; newer version wins; missing sequence reconciled; outbox/inbox lag metric |
| EVT-CAT-002 | `catalog.showtime.cancelled.v1` | Catalog → Booking | cancellation fact: showtimeId, reasonCode, version | key `showtimeId`; `eventId` | late cancellation applies per `BUS-010`; DLQ/replay audited |
| EVT-BKG-001 | `booking.confirmed.v1` | Booking → Worker | confirmed booking/payment references, actor-safe contact reference | key `bookingId`; `eventId` | duplicate ticket effect prevented; retry/DLQ counters |
| EVT-BKG-002 | `booking.hold.expired.v1` | Booking → Booking consumers/Worker | Booking-owned expiry fact after Worker invokes the expiry port; hold/booking/showtime IDs | key `holdId`; `eventId` | stale expiry command checks current state/version before Booking emits; replay audited |
| EVT-PAY-001 | `payment.succeeded.v1` | Booking → ticket workflow/Worker | Booking-owned fact after payment adapter verification: payment ID, booking ID, amount, currency, provider reference | key `bookingId`; provider event ID + eventId | out-of-order reconciled; mismatch quarantined; redacted logs |

Worker không trở thành owner chỉ vì nó schedule/retry một command. Mọi event mang
business fact phải được owner service xác nhận state transition trước khi phát.

`EVT-COM-006`: Việc thêm endpoint vào registry không mặc nhiên tạo event mới. Event chỉ
được thêm khi có propagated business fact/recovery need, owner, consumer, versioned
schema, idempotency và failure evidence. AI/Staff deferred endpoints không mở event MVP.
