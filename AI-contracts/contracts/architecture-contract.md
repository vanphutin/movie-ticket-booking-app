# Architecture contract

## Context and boundaries

| ID | Component | Owns | Does not own |
|---|---|---|---|
| ARCH-001 | Gateway | routing, edge validation, auth context propagation, correlation, coarse policy, error normalization | domain rule, repository, business DB |
| ARCH-002 | Identity | user credential, role, refresh session, token lifecycle | catalog/booking/payment state |
| ARCH-003 | Catalog | movie, trailer, cinema, screen, seat definition, showtime lifecycle/publication | hold/booking/payment |
| ARCH-004 | Booking | showtime snapshot, inventory state, hold, booking, payment/ticket workflow, inbox/outbox | credential/catalog truth |
| ARCH-005 | Worker | relay/expiry/retry/DLQ execution through owned contracts | direct arbitrary business mutation |

`ARCH-006`: Dependency direction: transport/adapters → application → domain; domain không phụ thuộc NestJS/ORM/provider SDK.  
`ARCH-007`: Sync HTTP dùng cho immediate query/command outcome với timeout; async event dùng cho propagated fact/recovery, không giả exactly-once.  
`ARCH-008`: Trust boundaries tại client→Gateway, Gateway→service, broker→consumer, provider→webhook, operator→ops endpoint. Mọi boundary authenticate/validate/authorize.

## Data ownership

`ARCH-009`: Identity, Catalog, Booking sở hữu database, migration và invariant riêng. Cross-service chỉ dùng opaque ID, minimal snapshot hoặc contract call/event.  
`ARCH-010`: Mỗi invariant có đúng một owner và transaction local. Cross-service workflow dùng outbox/inbox/idempotency/reconciliation.

## Forbidden

`ARCH-011`: MUST NOT shared database/schema/credential giữa services.  
`ARCH-012`: MUST NOT cross-service FK, ORM relation hoặc SQL join.  
`ARCH-013`: Gateway/Worker MUST NOT truy cập repository/database của domain service.  
`ARCH-014`: MUST NOT giữ DB transaction qua network call hoặc dùng distributed transaction nếu chưa có approved ADR/CCR.  
`ARCH-015`: MUST NOT trust actor headers từ client, bypass owner authorization hoặc import internal entity qua boundary.  
`ARCH-016`: MUST NOT lưu/log plaintext password, token, secret, webhook raw sensitive payload.

## Clean Architecture inside each microservice

`ARCH-017`: Mỗi service MUST tách responsibility theo các vòng `domain`,
`application`, `adapters/infrastructure` và `transport/bootstrap`; tên thư mục cụ thể
được quyết định khi scaffold nhưng dependency direction không được đảo.

`ARCH-018`: `domain` MUST chỉ chứa entity/value object/domain service/domain event và
invariant thuần; MUST NOT import NestJS, ORM decorators, HTTP/broker client, filesystem,
clock ngầm hoặc provider SDK.

`ARCH-019`: `application` MUST chứa use case và input/output port; orchestration gọi
domain qua public behavior và gọi external dependency qua port. Application MUST NOT
tham chiếu concrete adapter.

`ARCH-020`: Adapter/transport MUST map DTO/persistence/message sang model bên trong;
controller/consumer/ORM hook MUST NOT chứa business rule.

`ARCH-021`: Bootstrap/composition root là nơi duy nhất wire framework và concrete
adapter. Cross-service client phải implement versioned port và có timeout/error mapping.

`ARCH-022`: Shared package chỉ MAY chứa contract/schema/telemetry primitive không mang
business ownership. Shared entity, repository, domain service hoặc database model giữa
services bị cấm.

`ARCH-023`: Mỗi service MUST độc lập build/test/migrate/deploy về mặt thiết kế. Monorepo
MAY dùng chung tooling nhưng không được tạo runtime coupling hoặc shared database.

`ARCH-024`: Giao tiếp sync/async phải đi qua public contract. Import source nội bộ của
service khác, truy cập database khác hoặc dùng broker payload chưa version hóa bị cấm.

`ARCH-025`: Long-running cross-service workflow dùng saga/process manager hoặc
reconciliation có owner rõ; không dùng distributed transaction ngầm.

## Planned topology, not filesystem truth

`ARCH-026`: Topology logic dự kiến gồm Gateway, Identity, Catalog, Booking và Worker.
Filesystem/module roots chưa được khóa cho tới ticket scaffold được review. Tài liệu
không được giả định `apps/*`, package manager hoặc command runnable trước thời điểm đó.
