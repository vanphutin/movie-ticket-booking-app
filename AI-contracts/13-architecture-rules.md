# Architecture rules

Normative architecture nằm ở `contracts/architecture-contract.md` và quyết định dự thảo
`decisions/ADR-001-microservice-clean-architecture.md`.

- Mỗi microservice là một deployable boundary và một bounded context có owner rõ.
- Bên trong mỗi service, dependency đi vào trong: `transport/infrastructure → application → domain`.
- Domain thuần không import NestJS, ORM, broker, HTTP client hoặc provider SDK.
- Gateway là edge, không phải domain owner.
- Identity, Catalog và Booking có database/migration riêng.
- Worker chạy orchestration kỹ thuật qua port/contract; không sở hữu hoặc sửa business
  truth tùy tiện.
- Cross-service relation là opaque ID, minimal snapshot hoặc versioned contract; không
  FK/ORM/shared query.
- Không tạo shared domain/entity library giữa bounded contexts.
- Module roots và package layout chỉ được khóa sau ticket scaffold có DoR; hiện chưa tạo
  nested `AGENTS.md`.
- Optimization không được thêm shared cache/store phá data ownership, cross-service
  database/join, network call trong database transaction hoặc business logic tại Gateway.
  Denormalization/cache/parallelism cần owner, invalidation/consistency và failure policy.
