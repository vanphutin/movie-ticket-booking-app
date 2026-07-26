# DATABASE DOCUMENT — Movie Ticket Booking Microservices

> Thứ tự triển khai schema tuần 4–10 được khóa tại [Kế hoạch delivery tăng trưởng](../progressive-delivery-plan-weeks-4-10.md). Các chương entity mô tả thiết kế đích; mỗi tuần chỉ migration capability hiện tại, không tạo toàn bộ schema từ đầu.

> **Phiên bản:** 1.0  
> **Ngày tạo:** 2026-07-08  
> **Vai trò soạn:** Senior Backend Engineer kiêm Database Architect  
> **Đối tượng đọc:** Backend Developer, Mentor, Reviewer  
> **Engine:** PostgreSQL 16+; `catalog_db` dùng pgvector nếu triển khai semantic search stretch

---

## Mục lục

| # | Phần | File | Nội dung chính |
|--:|------|------|---------------|
| 1 | Database Overview | `01-overview.md` | Purpose, design principles, conventions, UUID/timestamp, audit/migration strategy |
| 2 | Core Domain Model | `02-domain-model.md` | 9 nhóm entity, ERD text description, cardinality summary |
| 3 | Entity: User & Access | `03-entities-user.md` | users, roles, refresh_tokens — fields, constraints, indexes, queries |
| 4 | Entity: Catalog & Cinema | `04-entities-catalog.md` | movies, movie_trailers, cinemas, screens, seats |
| 5 | Entity: Showtime & Booking | `05-entities-booking.md` | showtimes, showtime_seats, seat_holds, bookings, booking_seats, tickets |
| 6 | Entity: Payment & Logs | `06-entities-payment-logs.md` | payments, audit_logs, integration_logs |
| 7 | Entity: AI & Search | `07-entities-ai.md` | movie_embedding_documents, ai_request_logs, movie_ai_content_drafts, preferences, feedback |
| 8 | State Machines | `08-state-machines.md` | 6 state machines: showtime_seat, seat_hold, booking, payment, ticket, ai_draft |
| 9 | Critical Transactions | `09-transactions.md` | 5 transactions với SQL, locking strategy, race condition prevention |
| 10 | Index, Constraint, Migration, Seed | `10-index-strategy.md` | ~35 indexes với justifications |
| 11 | Constraint + Migration + Seed | `11-constraint-migration-seed.md` | ~25 constraints, migration workflow, seed strategy |
| 12 | pgvector + Security + Query + DoD | `12-pgvector-security-query-dod.md` | AI design, 12 security rules, 10 query reviews, DoD checklist, final evidence |

---

## Tổng quan nhanh

> **Boundary update:** Các file entity/transaction bên dưới là logical-domain reference. Physical implementation phải chia theo `identity_db`, `catalog_db` và `booking_db` theo [kiến trúc microservice](../../chuong-trinh-dao-tao/thiet-ke/microservice-architecture.md). Không tạo một single/shared database, cross-service foreign key hoặc transaction xuyên service.

- **~25 logical entity** phân bổ theo service owner (Identity, Catalog, Booking; AI thuộc Catalog stretch)
- **6 state machines** với valid/invalid transitions và test cases bắt buộc
- **5 critical transactions** có SQL examples và locking strategy
- **~35 indexes** với query justification
- **~25 constraints** bảo vệ nghiệp vụ ở database level
- **10 queries** cần review hiệu năng
- **12 security rules** cho data privacy
- **10 evidence items** cuối khóa

> **QUAN TRỌNG:** Mọi thay đổi database phải qua migration. Không bao giờ dùng `synchronize: true` ngoài môi trường development local ban đầu. Mỗi migration phải chạy được từ clean database.
