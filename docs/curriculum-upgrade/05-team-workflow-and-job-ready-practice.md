# Team Workflow và Job-ready Practice

## 1. Mục tiêu

Capstone không chỉ chứng minh khả năng code; nó phải mô phỏng những hành vi người mới cần có khi gia nhập team.

## 2. Workflow bắt buộc từ tuần 4

```text
Ticket → clarify assumptions → design note
→ feature branch → small commits → self-review
→ PR → CI/evidence → review feedback → merge/release note
```

## 3. Ticket template

```markdown
## Outcome
Actor nào đạt kết quả gì?

## Scope / Out of scope

## Invariants

## Acceptance criteria

## Failure and security cases

## Design decisions

## Verification plan

## Rollback / compatibility
```

## 4. Pull request template

```markdown
## Problem and outcome
## Key decisions and alternatives rejected
## API/schema/event compatibility
## Test matrix
## Evidence commands and artifacts
## Security/observability impact
## Migration and rollback
## Known limitations
## Reviewer focus
```

## 5. Self-review checklist

- Diff chỉ chứa scope của ticket.
- Tên và boundary phản ánh owner/invariant.
- Không log secret/PII/raw provider payload.
- Error contract ổn định, không rò stack/internal URL.
- Test có negative case và đúng boundary.
- Migration additive/repeatable theo scope.
- Outbound call có deadline; retry bounded và safe.
- README/evidence command chạy lại được.

## 6. Weekly team drills

| Tuần | Drill |
|---:|---|
| 4 | xử lý review về auth boundary hoặc secret leak |
| 5 | requirement đổi pagination/filter sau khi API đã có consumer |
| 6 | review event compatibility và migration additive |
| 7 | debug flaky concurrency test hoặc deadlock |
| 8 | incident duplicate webhook/job và viết postmortem ngắn |
| 9 | on-call simulation từ alert → triage → mitigation → follow-up |
| 10 | handoff project cho “developer mới” bằng clean checkout README |

## 7. Debugging protocol

Mọi debugging note đi theo:

```text
Symptom → Scope → Hypotheses → Evidence needed
→ Smallest experiment → Observation → Conclusion → Prevention
```

Không chấp nhận “thử đổi code đến khi chạy”. Người học phải giữ ít nhất một hypothesis sai và giải thích evidence đã bác bỏ nó.

## 8. Incident report ngắn

```markdown
# Incident
- User impact:
- Detection:
- Timeline:
- Technical cause:
- Contributing factors:
- Mitigation:
- Corrective actions:
- Test/monitor preventing recurrence:
```

Không chấm điểm theo việc “không gây lỗi”; chấm theo tốc độ thu thập evidence, reasoning và chất lượng corrective action.

## 9. Git evidence tối thiểu cuối khóa

- Commit history chia theo capability, không phải một commit toàn project.
- Ít nhất ba PR-style change set có self-review.
- Một lần xử lý review feedback.
- Một migration change có compatibility note.
- Một bug fix có reproduction test.
- Release tag/note và known limitations.

## 10. Interview mapping

Mỗi câu trả lời phỏng vấn phải dựa trên artifact của chính học viên:

```text
Context → Invariant/problem → Decision → Alternative
→ Trade-off → Failure encountered → Evidence → What I would change at scale
```

Nếu không chỉ ra code/test/diagram liên quan, câu trả lời chỉ được tính ở mức lý thuyết.

