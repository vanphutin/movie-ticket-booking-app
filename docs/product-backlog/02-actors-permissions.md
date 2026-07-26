# 2. Actors & Permissions

---

## 2.1. Guest (Khách vãng lai)

**Mục tiêu sử dụng:** Duyệt thông tin phim, rạp chiếu, suất chiếu và seat map để quyết định có đăng ký tài khoản và đặt vé hay không.

**Quyền được làm:**
- Xem danh sách phim đang chiếu, sắp chiếu (có filter theo genre, status).
- Xem chi tiết phim, trailer đã published.
- Xem danh sách rạp và chi tiết rạp.
- Xem suất chiếu theo phim, rạp, ngày.
- Xem seat map và trạng thái ghế (AVAILABLE / HELD / SOLD) cho một suất chiếu.
- Sử dụng AI semantic search để tìm phim bằng ngôn ngữ tự nhiên.

**Quyền KHÔNG được làm:**
- Giữ ghế (seat hold).
- Tạo booking hoặc thanh toán.
- Xem thông tin booking/ticket/payment của bất kỳ ai.
- Truy cập bất kỳ API admin hoặc staff nào.

**API nhóm liên quan:** Public APIs, AI Customer APIs (movie search).

---

## 2.2. Customer (Khách hàng đã đăng ký)

**Mục tiêu sử dụng:** Đặt vé xem phim hoàn chỉnh — từ tìm phim, chọn ghế, thanh toán đến nhận vé điện tử.

**Quyền được làm:**
- Tất cả quyền của Guest.
- Đăng ký, đăng nhập, refresh token, logout.
- Xem và cập nhật profile, preferences.
- Giữ ghế tạm thời (seat hold) cho một suất chiếu.
- Hủy seat hold do mình tạo (nếu chưa hết hạn).
- Tạo booking từ seat hold còn hiệu lực.
- Tạo payment link qua payOS cho booking.
- Xem lịch sử booking và chi tiết booking của chính mình.
- Hủy booking nếu còn ở trạng thái cho phép.
- Xem danh sách vé và chi tiết vé của chính mình.
- Xem trạng thái payment của chính mình.
- Sử dụng AI semantic search và AI recommendations.
- Gửi feedback cho AI recommendations.

**Quyền KHÔNG được làm:**
- Xem booking/ticket/payment của customer khác.
- Giữ ghế đã HELD bởi customer khác hoặc đã SOLD.
- Tạo booking khi seat hold đã hết hạn.
- Thanh toán cho booking đã EXPIRED hoặc CANCELLED.
- Hủy vé sau giờ chiếu bắt đầu hoặc sau khi đã check-in.
- Truy cập API admin hoặc staff.
- Thay đổi giá vé hoặc amount thanh toán.

**API nhóm liên quan:** Public APIs, Auth APIs, Customer APIs, AI Customer APIs.

---

## 2.3. Staff (Nhân viên rạp)

**Mục tiêu sử dụng:** Kiểm vé tại cửa phòng chiếu — tra cứu nhanh vé bằng ticket code và thực hiện check-in.

**Quyền được làm:**
- Tất cả quyền của Guest (xem phim, rạp, suất chiếu).
- Tra cứu vé bằng ticket code (mô phỏng QR scan).
- Check-in vé hợp lệ cho suất chiếu.
- Xem danh sách vé đã check-in của một suất chiếu.

**Quyền KHÔNG được làm:**
- Đặt vé thay customer.
- Hủy booking hoặc payment.
- Quản lý phim, rạp, suất chiếu.
- Xem thông tin thanh toán chi tiết.
- Truy cập API admin.
- Check-in vé không thuộc suất chiếu đang diễn ra.
- Check-in vé đã check-in trước đó (idempotent nhưng không tạo hiệu ứng phụ).

**API nhóm liên quan:** Public APIs, Staff APIs.

---

## 2.4. Admin (Quản trị viên)

**Mục tiêu sử dụng:** Quản trị toàn bộ dữ liệu hệ thống — phim, rạp, phòng chiếu, ghế, suất chiếu, booking, payment — và sử dụng AI assistant để tạo nội dung.

**Quyền được làm:**
- Tất cả quyền xem của Guest.
- CRUD phim: tạo, cập nhật thông tin phim.
- Quản lý trailer: cập nhật URL/metadata, publish/unpublish.
- CRUD rạp chiếu, phòng chiếu, layout ghế.
- Tạo suất chiếu (trigger snapshot seat map).
- Cập nhật hoặc hủy suất chiếu (nếu chưa có booking CONFIRMED).
- Xem toàn bộ bookings và payments.
- Sync payment status thủ công khi cần.
- Xem audit logs và integration logs.
- Sử dụng AI content draft: tạo synopsis, trailer description, tags.
- Duyệt (apply) hoặc từ chối (reject) nội dung AI draft.
- Rebuild embeddings cho phim đơn lẻ hoặc hàng loạt.
- Xem AI request logs và usage stats.

**Quyền KHÔNG được làm:**
- Xóa hoặc sửa suất chiếu đã có booking CONFIRMED.
- Xóa phim đang có suất chiếu active.
- Thay đổi amount thanh toán sau khi payment đã tạo.
- Truy cập mật khẩu người dùng (chỉ lưu hash).
- Bỏ qua human approval cho AI content (auto-apply bị cấm).

**API nhóm liên quan:** Public APIs, Admin APIs, AI Admin APIs, Payment APIs, Operation/Log APIs.

---

## 2.5. System (Hệ thống nền)

**Mục tiêu:** Thực thi các tác vụ nền tự động để duy trì data consistency và xử lý integration events.

**Hành động tự động:**
- **Expire seat holds:** BullMQ job chạy sau khi seat hold hết thời hạn (mặc định 5 phút). Chuyển showtime_seats về AVAILABLE, đánh dấu seat_hold EXPIRED.
- **Expire pending bookings:** BullMQ job chạy sau khi booking hết thời hạn thanh toán (mặc định 15 phút). Chuyển booking sang EXPIRED, release các showtime_seats, đánh dấu payment EXPIRED.
- **Process payOS webhook:** Nhận webhook từ payOS, verify signature, đối soát, cập nhật payment → booking → showtime_seats → tạo tickets. Idempotent.
- **Generate embeddings:** BullMQ job gọi embedding provider để tạo/cập nhật vector cho phim.
- **Audit logging:** Tự động ghi audit log cho các hành động quan trọng.
- **Integration logging:** Tự động ghi request/response log cho payOS, AI provider.

**Ràng buộc:**
- Mọi thay đổi state phải trong transaction.
- Mọi job failure phải có retry strategy và error logging.
- System không tự ý tạo booking, payment, hoặc apply AI content.

**API nhóm liên quan:** Webhook APIs (nhận), Background Jobs (nội bộ).

---

## 2.6. Ma trận quyền tổng hợp

| Hành động | Guest | Customer | Staff | Admin | System |
|---|:---:|:---:|:---:|:---:|:---:|
| Xem phim/rạp/suất chiếu/seat map | ✅ | ✅ | ✅ | ✅ | — |
| AI semantic movie search | ✅ | ✅ | — | — | — |
| Đăng ký / Đăng nhập | — | ✅ | ✅ | ✅ | — |
| Giữ ghế (seat hold) | — | ✅ | — | — | — |
| Tạo booking | — | ✅ | — | — | — |
| Tạo payment link | — | ✅ | — | — | — |
| Xem booking/ticket cá nhân | — | ✅ | — | — | — |
| Tra cứu vé bằng code | — | — | ✅ | — | — |
| Check-in vé | — | — | ✅ | — | — |
| CRUD phim/rạp/suất chiếu | — | — | — | ✅ | — |
| Quản lý booking/payment | — | — | — | ✅ | — |
| AI content draft/apply | — | — | — | ✅ | — |
| Rebuild embeddings | — | — | — | ✅ | — |
| Xem audit/integration logs | — | — | — | ✅ | — |
| Expire seat holds/bookings | — | — | — | — | ✅ |
| Process webhook | — | — | — | — | ✅ |
| Generate embeddings | — | — | — | — | ✅ |
