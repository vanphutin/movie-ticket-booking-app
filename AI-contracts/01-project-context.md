# Project context

Product: Movie Ticket Booking Microservices, dùng để đào tạo backend theo progression Identity/Gateway → Catalog → reliable events → Booking/concurrency → Payment/Ticket/Worker → operations → release.

Actors: Guest, Customer, Admin, Service identity và Operator. Tuần 1–3 là foundation/mini lab; project thật bắt đầu tuần 4 sau `FG-001`.

Các tài liệu nền được giữ:

- `docs/product-backlog/`: discovery, actor, MVP, epics và risk register.
- `docs/database/`: domain/data design chi tiết.
- `chuong-trinh-dao-tao/thiet-ke/`: architecture, API, database và business-rule notes.
- `docs/curriculum-upgrade/`: evidence, capability và gate rationale.
- `study/` và `tien-do-hoc-tap/progress.json`: projection/note/progress legacy dùng bởi tracker.

Contract trong `AI-contracts/` ưu tiên khi điều hành tuần 4–10. Draft baseline/CCR
không ghi đè effective baseline trước review; tài liệu nền không tự trở thành
implementation evidence.
