# Learning Experience Playbook

## 1. Mục tiêu trải nghiệm

Chương trình vẫn nặng, nhưng mỗi tuần người học phải cảm nhận được mình vừa mở khóa một khả năng thực tế, không chỉ hoàn thành danh sách tài liệu.

## 2. Nhịp một capability

```text
Hook → Mental model → Predict → Build/Experiment
→ Break it → Explain → Ship evidence → Review
```

- **Hook:** mở bằng tình huống production hoặc yêu cầu người dùng.
- **Predict:** người học dự đoán trước khi chạy.
- **Break it:** bắt buộc tạo ít nhất một lỗi có chủ đích.
- **Ship:** kết thúc bằng artifact review được.

## 3. User-visible outcome mỗi tuần project

| Tuần | Khoảnh khắc người học nhìn thấy |
|---:|---|
| 4 | đăng ký/đăng nhập qua Gateway và thấy request ID xuyên flow |
| 5 | admin tạo phim, guest tìm/lọc phim |
| 6 | tạo lịch chiếu và quan sát event được ghi/publish |
| 7 | nhiều client tranh cùng ghế nhưng chỉ một người thắng |
| 8 | payment mock thành công, ticket sinh đúng một lần dù webhook lặp |
| 9 | làm hỏng dependency, xem telemetry và khôi phục theo runbook |
| 10 | clone sạch và demo luồng mua vé end-to-end |

## 4. Boss challenge cuối tuần

Boss challenge là tình huống mới, không copy exact tutorial. Thời lượng 60–120 phút.

| Tuần | Challenge gợi ý |
|---:|---|
| 1 | phân loại timeout, HTTP error và CORS từ ba evidence khác nhau |
| 2 | refactor code phụ thuộc framework để test domain không cần Nest |
| 3 | tìm invariant chưa được DB bảo vệ và thiết kế constraint/transaction |
| 4 | token bị replay sau rotation; điều tra và chặn family |
| 5 | query chậm khi dữ liệu tăng; chứng minh index phù hợp |
| 6 | process chết giữa state change và publish; sửa delivery gap |
| 7 | 20 request giữ cùng ghế; tạo test ổn định và giải thích winner |
| 8 | webhook gửi trùng/sai amount/out-of-order; reconcile đúng |
| 9 | service dependency treo; timeout, readiness và log phải phản ánh đúng |
| 10 | clean-checkout demo kèm một incident bất ngờ do mentor chọn |

## 5. Cơ chế difficulty ladder

| Level | Dạng hỗ trợ |
|---|---|
| Guided | có checklist, fixture và câu hỏi dẫn đường |
| Semi-guided | có acceptance criteria, không có implementation steps |
| Independent | chỉ có ticket, constraints và business outcome |
| Ambiguous | requirement thiếu/mâu thuẫn; học viên phải hỏi và ghi assumption |

Tuần 1-3 ưu tiên Guided/Semi-guided; tuần 4-6 Semi-guided; tuần 7-9 Independent; tuần 10 có Ambiguous scenario.

## 6. Feedback loop

- Feedback nhỏ trong ngày: compiler/test/command.
- Feedback reasoning: AI mentor hỏi invariant/failure/trade-off.
- Feedback kỹ thuật hàng tuần: code review/evidence review.
- Feedback tích lũy: capability heatmap.
- Feedback tuyển dụng: demo, mock interview và README review.

## 7. Dashboard nên hiển thị

- Capability đang học và prerequisite.
- Cấp hiện tại C1-C4.
- Evidence confidence LOW/MEDIUM/HIGH.
- Core blocker và remediation action.
- Một “next best action”, không dồn hàng chục TODO ngang nhau.
- Streak chỉ là động lực phụ; không làm thay capability score.

## 8. Chống quá tải

- Mỗi ngày tối đa một outcome chính và một stretch task.
- Reading phải gắn với decision hoặc lab trong ngày.
- Có budget 20% cho debug/remediation từ tuần 4.
- Feature freeze core cuối tuần 8.
- Tuần 10 không mở domain mới.
- Nếu học viên chậm, giảm service topology trước khi giảm invariant/test/security.

