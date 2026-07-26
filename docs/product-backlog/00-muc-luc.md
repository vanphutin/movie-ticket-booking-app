# PRODUCT BACKLOG DOCUMENT - Movie Ticket Booking Microservices

> **Phiên bản:** 2.0  
> **Đối tượng đọc:** Backend Fresher/Junior developer, Mentor, Reviewer  
> **Stack:** NestJS microservices · TypeScript · PostgreSQL per service · Redis/BullMQ · Docker Compose · GitHub Actions · payOS-style integration · pgvector (Catalog stretch)

## Mục lục

| # | Phần | File | Nội dung chính |
|--:|------|------|---------------|
| 1 | Product Overview | `01-product-overview.md` | Vision, users, goals, success criteria |
| 2 | Actors & Permissions | `02-actors-permissions.md` | Guest, Customer, Staff, Admin, System |
| 3 | MVP Scope | `03-mvp-scope.md` | In scope, out of scope, stretch goals |
| 4 | Product Epics | `04-product-epics.md` | Epics + dependency map |
| 5 | Backlog: Epic 1-3 | `05-backlog-part1.md` | Catalog, Cinema Mgmt, Auth |
| 6 | Backlog: Epic 4-5 | `05-backlog-part2.md` | Seat Hold, Booking, Ticket |
| 7 | Backlog: Epic 6-8 | `05-backlog-part3.md` | Payment, Webhook, Jobs |
| 8 | Backlog: Epic 9-10 | `05-backlog-part4.md` | AI Search, AI Content |
| 9 | Backlog: Epic 11-12 | `05-backlog-part5.md` | Logging, Testing, Release |
| 10 | API Backlog Summary | `06-api-backlog-summary.md` | Endpoint overview |
| 11 | Milestone Plan | `07-milestone-plan.md` | Roadmap 10 tuần chi tiết |
| 12 | Definition of Ready & Done | `08-dor-dod.md` | DoR/DoD |
| 13 | Risk Register | `09-risk-register.md` | Risks and mitigation |
| 14 | Final Portfolio Evidence | `10-final-evidence.md` | Evidence, pitch, Q&A, demo flow |

## Tổng quan nhanh

- Roadmap 10 tuần cường độ cao với tuần 1-3 theory + mini labs, tuần 4-10 project delivery.
- Trọng tâm mới: học backend foundation trước framework, sau đó dùng NestJS như công cụ triển khai.
- Movie Ticket Booking vẫn là project xuyên suốt để tránh học lý thuyết rời rạc; implementation dùng Gateway, Identity, Catalog, Booking và Worker theo ownership rõ ràng.
