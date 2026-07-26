# Evidence Standard

## 1. Evidence tốt phải trả lời bốn câu hỏi

1. Người học dự đoán điều gì trước khi chạy?
2. Đã chạy chính xác command/test nào?
3. Kết quả quan sát được là gì?
4. Kết quả chứng minh hoặc bác bỏ claim nào?

## 2. Evidence manifest đề xuất

```yaml
capability_id: CON-01
claim: Concurrent holds produce exactly one winner
artifact_type: concurrency-test
boundary: real-postgresql
command: npm run test:concurrency -- seat-hold
exit_code: 0
artifact_paths:
  - evidence/week-7/seat-hold-test.txt
  - evidence/week-7/seat-hold-timeline.md
commit_sha: ""
prediction: One request succeeds; remaining requests return conflict
observation: ""
explanation: ""
limitations: ""
verified_at: ""
```

Trước khi có commit, `commit_sha` được phép rỗng. Không được điền kết quả mẫu vào evidence của học viên.

## 3. Loại evidence và tiêu chuẩn

| Loại | Tối thiểu phải có | Không đủ khi chỉ có |
|---|---|---|
| Theory | giải thích riêng, example, counterexample, self-check | copy định nghĩa |
| Design | invariant, boundary, state/failure, trade-off | sơ đồ đẹp nhưng không có decision |
| Unit | test name, assertion, command, output | “test pass” viết tay |
| Integration | dependency thật, setup/cleanup, assertion | mock dependency |
| DB/concurrency | PostgreSQL thật, parallel orchestration, deterministic assertion | biến in-memory hoặc gọi tuần tự |
| API/E2E | request/response, negative case, state verification | chỉ Swagger screenshot |
| Performance | dataset, workload, percentile, before/after | một con số không có phương pháp |
| Operations | failure injection, signal/log, recovery step | log happy path |
| Security | threat/negative test, redaction, secret handling | chỉ dependency audit |

## 4. Evidence confidence

| Mức | Ý nghĩa |
|---|---|
| LOW | Claim chỉ dựa trên mô tả hoặc screenshot. |
| MEDIUM | Có artifact chạy được nhưng boundary/setup chưa đủ rõ hoặc chưa repeat. |
| HIGH | Có command reproducible, đúng boundary, assertion rõ và learner giải thích được. |

`DONE` không đồng nghĩa `HIGH`. Tracker nên hiển thị riêng trạng thái thực hiện và confidence.

## 5. Trạng thái evidence

```text
DRAFT → SUBMITTED → VERIFIED
                    ↘ REJECTED → RESUBMITTED
```

- Học viên được tự lưu `DRAFT` và `SUBMITTED`.
- Automation xác nhận exit code, file, test hoặc schema khi có thể.
- AI mentor không tự khai rằng command đã chạy.
- Mentor/automation gán `VERIFIED` hoặc `REJECTED` với lý do cụ thể.

## 6. Quy tắc chống Done ảo

- Checkbox hoặc nội dung dài không tự tạo evidence.
- Keyword như `curl`, `log`, `pass`, `commit` không đủ để approve.
- Link tồn tại không đồng nghĩa nội dung đúng.
- Một artifact không được tái sử dụng cho nhiều capability nếu không chứng minh từng claim.
- Evidence chứa secret/token/raw personal data phải bị reject và được làm sạch.
- Generated explanation của AI phải được người học xác nhận và bảo vệ bằng oral/self-check.

## 7. Cấu trúc thư mục gợi ý từ tuần 4

```text
MovieTicketBookingApp/
└── evidence/
    ├── week-4/
    │   ├── manifest.yml
    │   ├── auth-negative-tests.txt
    │   └── request-correlation.md
    ├── week-7/
    │   ├── manifest.yml
    │   └── seat-hold-race.txt
    └── week-10/
        ├── clean-checkout.txt
        └── release-scorecard.md
```

Thư mục này chỉ xuất hiện khi capstone được khởi tạo ở tuần 4.

