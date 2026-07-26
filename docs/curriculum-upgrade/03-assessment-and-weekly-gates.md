# Assessment và Weekly Gates

## 1. Tách ba loại tiến độ

| Chỉ số | Ý nghĩa |
|---|---|
| Activity progress | Đã đọc/làm các hoạt động theo lịch. |
| Capability progress | Đã đạt C1/C2/C3/C4 cho từng năng lực. |
| Release readiness | Capstone có chạy, test, deploy và demo được không. |

Không dùng activity progress để kết luận job-ready.

## 2. Daily gate

Một ngày hoàn thành khi đủ các phần phù hợp với loại ngày:

| Thành phần | Theory day | Lab/design day | Implementation day |
|---|---:|---:|---:|
| Learning summary bằng lời riêng | bắt buộc | bắt buộc | bắt buộc |
| Mental model/invariant | bắt buộc | bắt buộc | khi liên quan |
| Prediction → observation | khuyến khích | bắt buộc | bắt buộc cho test/failure |
| Executable evidence | không luôn bắt buộc | bắt buộc | bắt buộc |
| Failure/counterexample | bắt buộc | bắt buộc | bắt buộc |
| Trade-off/interview answer | bắt buộc | bắt buộc | bắt buộc |

## 3. Foundation Gate cuối tuần 3

Học viên chỉ khởi tạo `MovieTicketBookingApp` khi tự làm được một bài toán mới và đạt:

- Phân rã actor, outcome, state, invariant, side effect và failure.
- Thiết kế API/error contract không phụ thuộc framework.
- Tách domain rule khỏi I/O và tạo test seam.
- Thiết kế schema với key, constraint, index và transaction decision.
- Chạy PostgreSQL lab có success/failure evidence.
- Phân biệt AuthN/AuthZ, threat boundary và secret handling.
- Giải thích timeout, idempotency, outbox và observability ở mức mental model.

### Rubric

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Problem framing | không xác định | liệt kê feature | có actor/input/output | có invariant/failure/trade-off |
| Design | không có | diagram trang trí | boundary/state hợp lý | decision có alternative |
| Verification | không chạy | happy path | negative test | evidence reproducible |
| Explanation | đọc thuộc | định nghĩa | giải thích example | xử lý tình huống mới |

Mỗi dimension tối thiểu 2; tổng tối thiểu 9/12. Nếu chưa đạt, học viên remediation 2–3 ngày thay vì scaffold capstone sớm.

## 4. Weekly project gate tuần 4-9

Mỗi tuần phải vượt sáu cổng:

1. **Scope:** chỉ capability tuần hiện tại; core trước stretch.
2. **Design:** owner, invariant, contract, schema/state và failure matrix.
3. **Build:** implementation chạy được từ command documented.
4. **Verify:** test đúng boundary, gồm negative/failure case.
5. **Operate:** log/health/migration/recovery phù hợp với scope tuần.
6. **Defend:** học viên giải thích được decision, alternative và limitation.

### Chính sách carry-over

- Một gate thiếu evidence được mang sang tuần sau với trạng thái `CONDITIONAL`, không được giả thành Done.
- Blocker core chiếm tối đa 30% capacity tuần tiếp theo.
- Hai tuần liên tiếp còn blocker cùng capability: dừng stretch và làm remediation sprint.
- Không yêu cầu học lại toàn bộ tuần nếu chỉ thiếu một evidence cô lập.

## 5. Gate theo tuần

| Tuần | Claim quan trọng nhất phải chứng minh |
|---:|---|
| 4 | Identity/Gateway auth flow chạy được; deny-by-default và token/session lifecycle an toàn. |
| 5 | Catalog migration/API chạy; query/index decision có evidence. |
| 6 | State change và outbox atomic; event contract versioned. |
| 7 | Concurrent seat hold có exactly one winner; replay an toàn. |
| 8 | Duplicate/crash/retry không tạo payment/ticket effect trùng. |
| 9 | Hệ thống observable, readiness đúng, shutdown/recovery có drill. |
| 10 | Clean checkout → migrate/seed → run → test → demo không sửa tay. |

## 6. Job-ready scorecard

| Dimension | Trọng số |
|---|---:|
| Backend foundations và explanation | 15% |
| API/domain design | 10% |
| SQL/transaction/concurrency | 20% |
| Security | 10% |
| Testing/evidence quality | 15% |
| Reliability/operations | 10% |
| Git/team workflow | 10% |
| Debugging/communication/interview | 10% |

Điều kiện pass:

- Tổng từ 70/100.
- Không dimension nào dưới 50%.
- Tất cả hard gate security, concurrency, clean checkout và core E2E đều pass.
- Score không bù được hard gate: 90/100 nhưng bán trùng ghế vẫn không job-ready.

## 7. Vai trò AI mentor

AI mentor được phép:

- hỏi Socratic và phát hiện reasoning thiếu;
- đánh giá clarity, invariant, failure và trade-off;
- đề xuất test/failure case còn thiếu;
- gán confidence cho explanation.

AI mentor không được phép:

- xác nhận command/test đã chạy nếu không có machine evidence;
- approve chỉ vì câu trả lời dài hoặc có keyword;
- viết hộ observation, benchmark hay incident result;
- tự chuyển ngày hoặc capability sang `VERIFIED`.

