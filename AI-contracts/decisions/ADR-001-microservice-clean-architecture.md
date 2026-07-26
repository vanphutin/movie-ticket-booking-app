# ADR-001 — Microservice Clean Architecture

Status: `ACCEPTED` (2026-07-27, theo CCR-001 `APPROVED`)  
Baseline target: `PC-2026.2`  
Decision owner: Project reviewer  
Related: `CCR-001`, `ARCH-001..026`, `QLT-001..005`

## Context

Hệ thống cần năm logical components nhưng repository chưa scaffold. Contract cũ có
service ownership tốt nhưng chưa đủ quy tắc ngăn framework/ORM/business coupling bên
trong từng service.

## Decision

Áp dụng microservice architecture với Clean Architecture độc lập trong mỗi bounded
context:

```text
transport/bootstrap ─┐
infrastructure/adapters ──> application ──> domain
                     └── implements ports
```

- Gateway chỉ xử lý edge concerns.
- Identity sở hữu credential/session.
- Catalog sở hữu movie/scheduling truth.
- Booking sở hữu inventory/hold/booking/payment/ticket workflow.
- Worker thực thi relay/expiry/retry/DLQ qua contract, không sửa business DB tùy tiện.
- Sync communication qua versioned API port; async qua versioned event và outbox/inbox.
- Mỗi service sở hữu migration, database và invariant local.

Module/package roots chưa được quyết định. Quyết định này khóa boundary và dependency
direction, không khóa filesystem layout.

## Rejected alternatives

### Layered controller/service/repository dùng chung

Đơn giản lúc đầu nhưng dễ kéo entity/repository/domain rule qua service boundary và làm
framework trở thành kiến trúc.

### Shared domain library giữa services

Giảm duplicate type ngắn hạn nhưng tạo coupling release/runtime và làm mờ bounded-context
ownership. Chỉ schema/contract primitive không mang business ownership mới được chia sẻ.

## Consequences

- Nhiều mapping/port hơn nhưng test domain/application không cần framework.
- Cross-service change cần contract compatibility và consumer review.
- Không scaffold trước Foundation Gate.
- Nested coding guidelines chỉ sinh sau khi module roots tồn tại.

## Validation

- Architecture review map import direction và service ownership.
- Static boundary rules được thêm cùng tooling khi scaffold.
- Contract/integration tests bảo vệ public API/event.
- Database/concurrency tests bảo vệ invariant của owner service.
