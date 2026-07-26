# Daily contract ticket standard

Canonical schema nằm ở `templates/daily-contract-ticket.md`; instances ở `roadmap/weeks-4-10.md`.

- Mỗi ngày đúng một core outcome, tối đa một stretch task.
- Ticket hoàn thành trong một ngày học; dành khoảng 20% cho debug/remediation.
- Analysis/design lớn phải tách khỏi implementation; slice theo vertical outcome hoặc risk.
- Acceptance criterion đo được và map tới test/evidence.
- Reading chỉ phục vụ decision hiện tại.
- Mọi ticket có phase, milestone, capability, contract, prerequisite và dependency.
- Stretch chỉ mở khi core ticket và gate liên quan `VERIFIED`.
- Status hợp lệ: `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `CHANGES_REQUIRED`, `CONDITIONAL_PASS`, `VERIFIED`, `BLOCKED`.
- Mỗi ticket ghi architecture impact: service owner, layer/port/adapter và cross-service contract.
- Mỗi ticket có đúng một `learning_gate_id`, map tới capability/ticket learning map.
- Learning fields phải chỉ rõ outcome, prerequisite concepts, topics, misconceptions,
  pass condition và design/skeleton unlock condition.
- Full learning gate hỏi 3–5 câu trực tiếp trong chat; remediation gate hỏi lại 1–3 câu
  tập trung. Câu trả lời phải được quan sát, không backfill.
- Learning `PASSED` là dimension độc lập, không đồng nghĩa DoR `READY` hoặc ticket
  `VERIFIED`.
- Ticket vertical-slice/module MVP dùng block `post_mvp_optimization` với applicability
  `REQUIRED_AFTER_MVP_VERIFIED`; D01–D04 mặc định `NOT_APPLICABLE`.
- Optimization review chỉ active sau MVP `VERIFIED`; disposition phải có trước khi mở
  module phụ thuộc theo `21-post-mvp-optimization-policy.md`.
- `expected_files` là planned paths/patterns, không phải evidence file tồn tại.
- Tooling command chỉ được ghi runnable khi module/tool thực tế tồn tại.
- `candidate_ticket_id` không đồng nghĩa current/authorized ticket.
