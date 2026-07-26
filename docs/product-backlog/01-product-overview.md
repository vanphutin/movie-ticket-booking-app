# 1. Product Overview

## 1.1. Product Vision

Xây dựng một **backend API chuẩn doanh nghiệp** cho hệ thống đặt vé xem phim trực tuyến, phục vụ như một dự án thực chiến để chứng minh năng lực Backend Fresher/Junior trong phỏng vấn và portfolio cá nhân.

Hệ thống mô phỏng luồng nghiệp vụ thực tế: từ việc khách hàng duyệt phim, chọn suất chiếu, giữ ghế, đặt vé, thanh toán qua cổng payOS, đến nhân viên kiểm vé tại rạp — tất cả được vận hành bởi backend có transaction safety, background jobs, audit logging và AI-powered search.

**Tuyên bố sản phẩm:**

> Cung cấp một REST API backend cho phép khách hàng tìm phim (bao gồm tìm kiếm ngữ nghĩa bằng AI), đặt vé an toàn không bị double-booking, thanh toán qua payOS với webhook idempotent, đồng thời cho phép Admin quản trị toàn bộ dữ liệu hệ thống và Staff kiểm vé tại rạp.

---

## 1.2. Target Users

| Nhóm người dùng | Mô tả | Kênh tương tác |
|---|---|---|
| **Khách vãng lai (Guest)** | Người chưa đăng ký, chỉ duyệt thông tin phim, rạp, suất chiếu | Public REST API |
| **Khách hàng (Customer)** | Người đã đăng ký tài khoản, có nhu cầu đặt vé, thanh toán, xem lịch sử | Authenticated REST API |
| **Nhân viên rạp (Staff)** | Nhân viên kiểm vé tại quầy hoặc cửa phòng chiếu | Staff REST API |
| **Quản trị viên (Admin)** | Quản lý toàn bộ dữ liệu phim, rạp, suất chiếu, booking, payment, AI content | Admin REST API |
| **Hệ thống (System)** | Background jobs, scheduled tasks, webhook receiver | Internal processes |

---

## 1.3. Business Goals

| # | Mục tiêu kinh doanh | Đo lường |
|--:|---|---|
| BG-1 | Cho phép khách hàng đặt vé hoàn chỉnh từ tìm phim đến nhận vé | End-to-end flow hoạt động, có evidence |
| BG-2 | Đảm bảo không bao giờ xảy ra double-booking (bán trùng ghế) | Race condition test pass, lock evidence |
| BG-3 | Tích hợp thanh toán thực với payOS (số tiền nhỏ cho demo) | Payment link tạo thành công, webhook xác nhận, vé được phát hành |
| BG-4 | Hỗ trợ tìm kiếm phim bằng ngôn ngữ tự nhiên (AI semantic search) | Kết quả tìm kiếm có relevance score, mock provider hoạt động |
| BG-5 | Admin quản trị dữ liệu hiệu quả với AI content assistant | Draft → Apply flow hoạt động, human approval bắt buộc |
| BG-6 | Nhân viên rạp kiểm vé nhanh và chính xác | Tra cứu + check-in vé trong ≤ 2 API calls |

---

## 1.4. Engineering Goals

| # | Mục tiêu kỹ thuật | Đo lường |
|--:|---|---|
| EG-1 | Kiến trúc module rõ ràng theo NestJS best practices | Module/controller/service/provider tách biệt, không có circular dependency |
| EG-2 | Database schema có constraint bảo vệ data integrity | Foreign key, unique, check constraint, index — có ERD document |
| EG-3 | Transaction safety cho critical flows | SELECT FOR UPDATE, proper isolation level, rollback behavior documented |
| EG-4 | Request pipeline chuẩn: validation, error handling, logging | DTO validation, global exception filter, request ID tracking |
| EG-5 | Test coverage cho happy path + edge cases quan trọng | Unit test + e2e test, coverage report |
| EG-6 | CI/CD pipeline tự động | GitHub Actions: lint → test → build → Docker image |
| EG-7 | Containerized development environment | Docker Compose chạy được từ `docker compose up` trên máy bất kỳ |
| EG-8 | API documentation tự động | Swagger/OpenAPI accessible, mô tả đầy đủ |
| EG-9 | Audit trail cho mọi hành động quan trọng | Audit log + integration log queryable |
| EG-10 | Provider abstraction cho third-party services | PaymentProvider, AIProvider, EmbeddingProvider — mock trong test |

---

## 1.5. Success Criteria

Dự án được xem là thành công khi đạt đủ các tiêu chí sau:

### Tiêu chí sản phẩm
- [ ] Guest có thể duyệt danh sách phim, rạp, suất chiếu, seat map mà không cần đăng nhập.
- [ ] Customer có thể đăng ký → đăng nhập → giữ ghế → tạo booking → thanh toán → nhận vé.
- [ ] Staff có thể tra cứu và check-in vé bằng ticket code.
- [ ] Admin có thể CRUD phim, rạp, phòng chiếu, suất chiếu, xem audit log.
- [ ] Không xảy ra double-booking khi hai customer giữ cùng ghế đồng thời.
- [ ] Ghế hết hạn hold được tự động release bởi background job.
- [ ] Booking hết hạn payment được tự động expire.
- [ ] AI semantic search trả kết quả phù hợp với query ngôn ngữ tự nhiên.

### Tiêu chí kỹ thuật
- [ ] Toàn bộ API có Swagger documentation.
- [ ] Unit test coverage ≥ 60% cho service layer.
- [ ] E2E test cho core flows: auth, seat hold, booking, payment webhook.
- [ ] Docker Compose chạy full stack (app + PostgreSQL + Redis) từ zero.
- [ ] CI pipeline pass trên GitHub Actions.
- [ ] Migration chạy được từ clean database.
- [ ] Không hard-code secrets trong source code.

### Tiêu chí portfolio
- [ ] README portfolio đủ để reviewer hiểu kiến trúc trong 5 phút.
- [ ] Có ERD, state machine diagram, race condition evidence.
- [ ] Có release notes v1.0.0 với scope, limitations, future improvements.
- [ ] Có interview notes với 3-minute pitch và deep-dive Q&A.
