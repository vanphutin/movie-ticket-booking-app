# Traceability policy

Chuỗi bắt buộc:

`PRD → BUS → ARCH/ADR → API/DATA/EVT/SEC/QUALITY → Phase → Milestone → Capability → Learning gate → Ticket → Design → Code → Test → Evidence → Finding → Commit/PR → Weekly gate`.

Ticket mang `contract_ids`; code/commit/PR ghi ticket ID; test name/metadata ghi ticket + AC; manifest liên kết test/artifact; finding liên kết contract/file/line; gate tổng hợp capability/evidence.

Matrix phải trả lời service owner, layer/port/adapter, nơi implement, contract bảo vệ,
test/evidence, ticket/review/PR, capability thiếu và consumer chịu ảnh hưởng. Projection
nếu có không phải canonical; canonical links nằm trong ticket/manifests/state và không
được sinh bằng cách thay đổi progress history.

Learning gate là readiness prerequisite, không đứng trên technical contract theo authority
và không phải runtime/test evidence.

Chuỗi post-MVP:

`MVP ticket → MVP verification → optimization review → baseline evidence → finding → optimization ticket/defer → before/after → regression → module/weekly gate`.
