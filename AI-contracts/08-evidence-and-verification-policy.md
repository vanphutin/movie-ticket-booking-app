# Evidence and verification policy

Evidence hợp lệ ghi: ticket/contract/AC/test IDs, prediction, exact command, working directory/environment đã redacted, timestamp, exit code, artifact path, actual observation, reviewer và confidence.

Máy chỉ xác minh file/schema/link/command exit code mà nó thực sự chạy. AI phân biệt:

- `OBSERVED`: trực tiếp thấy output/artifact.
- `REPORTED`: học viên nói nhưng reviewer chưa quan sát.
- `INFERRED`: suy luận, không dùng để pass gate.
- `MISSING`: chưa có.

Screenshot đơn lẻ, checkbox, link trống, output mẫu hoặc text “pass” không đủ. Không sửa lịch sử evidence; correction tạo record mới và liên kết record cũ. Evidence chứa secret/PII phải redacted và bị từ chối nếu không an toàn.
