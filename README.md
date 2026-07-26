# Movie Ticket Booking App

Repository triển khai project thật của chương trình Backend tuần 4–10.

## Trạng thái hiện tại

- Project source chưa được scaffold.
- Chưa có feature nào được xác minh.
- Chưa có migration, test hoặc runtime evidence.
- Không bắt đầu implementation trước khi Foundation Gate và ticket contract hiện tại đủ điều kiện.

## Bắt đầu hoặc tiếp tục bằng Codex

Đưa file `CODEX-CONTEXT.md` cho Codex và yêu cầu:

```text
Đọc CODEX-CONTEXT.md, kiểm tra repository thực tế và tiếp tục đúng công việc đang dở.
```

`CODEX-CONTEXT.md` là operational handoff duy nhất người học cần mang giữa các phiên. Codex phải cập nhật lại file trước khi kết thúc phiên.

## Repository boundary

Đây là repository độc lập với repository chương trình `EDUCATION-BACKEND`.

- Remote dự kiến: `https://github.com/vanphutin/movie-ticket-booking-app.git`
- Branch chính: `main`
- Không push source project vào remote `education-backend.git`.
- Không copy tracker database, progress history hoặc secret vào repository này.

## Delivery rules

- Gateway không chứa business logic hoặc truy cập database của service.
- Mỗi service sở hữu database/migration riêng.
- Không shared database, cross-service ORM relation/FK/SQL join.
- Không dùng `synchronize: true` cho project database.
- Contract/design/test plan đi trước implementation.
- `DONE` không đồng nghĩa `VERIFIED`.
- Không claim test/migration/runtime đã chạy nếu không có command output và evidence thật.

## Planned topology

Topology được mở dần theo verified ticket, không scaffold trước:

```text
Gateway
Identity Service
Catalog Service
Booking Service
Worker
```

## Thư mục & Cấu trúc dự án

- `apps/client/` và `apps/server/`: Thư mục ứng dụng frontend và backend microservices (hiện là placeholder trống, scaffold theo ticket).
- `docs/`: Tài liệu sản phẩm, database design, backlog và kế hoạch master plan (`docs/plan/`).
- `AI-contracts/`: Quy ước AI, hợp đồng dự án, roadmap và công cụ xem contract tương tác (`AI-contracts/viewer/`).

