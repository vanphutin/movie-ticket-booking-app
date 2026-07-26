# Bộ tài liệu nâng cấp chương trình Backend Job-ready

## Mục tiêu

Bộ tài liệu này bổ sung cơ chế chứng minh năng lực cho chương trình 10 tuần hiện tại. Nó không thay đổi nguyên tắc ba tuần đầu chỉ học foundation và mini lab; `MovieTicketBookingApp` chỉ được khởi tạo sau khi học viên vượt gate tuần 3 và bắt đầu tuần 4.

```text
Tuần 1-3: theory + precursor lab, không scaffold capstone
                 ↓ vượt Foundation Gate
Tuần 4: khởi tạo capstone theo scope Identity + Gateway
                 ↓ mỗi capability phải có evidence
Tuần 5-10: mở rộng dần, không code trước capability tương lai
```

## Tài liệu

1. [Capability Traceability Standard](01-capability-traceability-standard.md): mapping mục tiêu học → tài liệu → lab → code → evidence.
2. [Evidence Standard](02-evidence-standard.md): định nghĩa bằng chứng hợp lệ và chống “Done ảo”.
3. [Assessment & Weekly Gates](03-assessment-and-weekly-gates.md): rubric chấm ngày, tuần và mức job-ready.
4. [Learning Experience Playbook](04-learning-experience-playbook.md): giữ chương trình nặng nhưng tạo trải nghiệm học hấp dẫn.
5. [Team Workflow & Job-ready Practice](05-team-workflow-and-job-ready-practice.md): Git, PR, review, debugging và incident.
6. [Rollout Plan](06-rollout-plan.md): thứ tự tích hợp tài liệu và tracker theo P0/P1/P2.

## Nguyên tắc sử dụng

- Tài liệu curriculum nói người học cần biết gì; capability matrix nói phải chứng minh bằng gì.
- Mini lab chứng minh một primitive riêng lẻ; không được dùng để khẳng định hành vi database/network thật nếu lab chỉ chạy in-memory.
- AI mentor đánh giá reasoning và chất lượng giải thích; command runner/test/mentor người thật xác nhận evidence thực thi.
- Không dùng phần trăm đọc bài làm thước đo job-ready.
- Stretch capability không được làm chậm core release.

