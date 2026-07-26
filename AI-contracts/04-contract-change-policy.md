# Contract change policy

1. Tạo `templates/contract-change-request.md` với ID `CCR-NNN`.
2. Nêu old/new contract, reason, actor/service/endpoint/event/schema consumer bị ảnh hưởng.
3. Phân tích compatibility, migration, rollback, test, docs và ticket impact.
4. Trạng thái: `DRAFT → IN_REVIEW → APPROVED | REJECTED | SUPERSEDED`.
5. Chỉ `APPROVED` mới được sửa baseline. Breaking change phải có consumer inventory, transition window và rollback/forward-fix.
6. Ticket implementation bị block khi requirement mâu thuẫn hoặc CCR chưa quyết định.

Không dùng sửa contract để hợp thức hóa code sai. Emergency security change vẫn cần CCR hồi tố trước khi release gate.
