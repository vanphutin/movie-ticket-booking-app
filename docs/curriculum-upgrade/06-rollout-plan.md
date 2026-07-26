# Kế hoạch rollout bộ nâng cấp

## Nguyên tắc

- Không rewrite curriculum đang ổn định.
- Áp dụng bằng lớp metadata/rubric trước, automation sau.
- Không scaffold `MovieTicketBookingApp` trước tuần 4.
- Mọi thay đổi tracker phải tương thích dữ liệu tiến độ hiện có.

## P0 — Chuẩn hóa tài liệu và gate

1. Gán capability ID cho từng daily ticket.
2. Gán capability level C1-C4 cần đạt.
3. Phân loại lab boundary: pure/in-memory/real DB/network/e2e.
4. Thêm evidence manifest template.
5. Thay gate dựa trên keyword bằng checklist + evidence state.
6. Thêm Foundation Gate trước thao tác khởi tạo capstone tuần 4.
7. Đánh dấu core/stretch nhất quán trong tracker.

### Acceptance criteria P0

- Mọi ngày có learning outcome và capability ID.
- Mọi capability core có verification type rõ.
- Mini lab không bị hiển thị như production/integration evidence.
- Người học thấy chính xác lý do một gate chưa pass.

## P1 — Automation và job-ready workflow

1. Thêm cấu trúc evidence record vào tracker database/API/UI.
2. Cho phép lưu command, exit code, artifact path và commit SHA.
3. Automation kiểm tra artifact/path/test khi có thể.
4. Thêm PR, self-review, debugging và incident templates.
5. Capability heatmap và remediation queue.
6. Clean-checkout runner cho capstone từ tuần 4 trở đi.

### Acceptance criteria P1

- `DONE` và `VERIFIED` là hai trạng thái riêng.
- AI không tự xác minh machine evidence.
- Weekly review đọc capability/evidence thay vì chỉ đọc free-form note.
- Có ít nhất một failure drill mỗi tuần 4-9.

## P2 — Trải nghiệm và đo hiệu quả

1. Boss challenge theo tuần.
2. Difficulty ladder Guided → Ambiguous.
3. Next-best-action thay cho danh sách TODO phẳng.
4. Mock interview tự lấy capability yếu và artifact liên quan.
5. Theo dõi outcome sau khóa: thời gian hoàn thành, gate retry, interview pass, placement feedback.

## Chỉ số nên đo

| Chỉ số | Dùng để phát hiện |
|---|---|
| Median time/capability | scope quá lớn hoặc hướng dẫn thiếu |
| Gate retry count | rubric mơ hồ hoặc kiến thức nền yếu |
| Evidence rejection reason | người học hay thiếu boundary nào |
| C1 cao nhưng C3 thấp | hiểu lý thuyết nhưng không tích hợp được |
| Test pass nhưng defend fail | học theo mẫu/AI quá nhiều |
| Clean-checkout failure rate | tài liệu setup/release yếu |
| Stretch started before core pass | scope control không hiệu quả |

## Thứ tự tích hợp đề xuất

```text
Capability IDs
→ Evidence schema
→ Foundation/weekly gate
→ Tracker UI
→ Automated verification
→ Boss challenge/team drills
→ Outcome analytics
```

## Definition of Done cho rollout

- Một học viên mới có thể biết “hôm nay cần chứng minh capability nào”.
- Mentor biết artifact nào phải review và boundary nào được claim.
- Tracker không kết luận job-ready từ số ngày hoàn thành.
- Project chỉ được khởi tạo đúng tuần 4 sau Foundation Gate.
- Cuối khóa có evidence index nối thẳng capability → code/test/diagram/commit.

