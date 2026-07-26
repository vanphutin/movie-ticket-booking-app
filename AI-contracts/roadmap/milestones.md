# Milestones and capabilities

Milestone là reviewable outcome. Artifact tồn tại không đủ để đạt milestone; exit gate
phải có evidence `OBSERVED` và không còn blocking finding.

| Milestone | Phase | Capability IDs | Deliverable / exit gate |
|---|---|---|---|
| M0 Contract baseline | P0 | CAP-CON-01 | effective contract map, ticket graph và `FG-001 VERIFIED` |
| M1 Trusted identity edge | P1 | CAP-IDN-01, CAP-SEC-01 | auth/profile via Gateway, deny/replay/trace evidence |
| M2 Movie catalog | P2 | CAP-CAT-01 | movie/trailer migration/API/query evidence |
| M3 Scheduling & publication | P2/P3 | CAP-SCH-01, CAP-EVT-01 | valid showtime + atomic versioned event |
| M4 Safe booking | P4 | CAP-BKG-01, CAP-CONC-01 | snapshot/hold/confirm, exactly-one-winner |
| M5 Reliable payment/ticket | P5 | CAP-PAY-01, CAP-WRK-01 | verified webhook, one ticket, retry/DLQ |
| M6 Operable system | P6 | CAP-OBS-01, CAP-OPS-01 | traces, bounded failure, restore/runbook |
| M7 Release evidence | P7 | CAP-REL-01 | clean release, traceability, demo/interview |

Capability state canonical nằm ở `state/capability-status.yml`; deliverable không tự làm capability `VERIFIED`.
