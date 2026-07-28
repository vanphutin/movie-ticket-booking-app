# Coding guidelines policy

## Current status

Repository chưa có source, module marker hoặc runnable project tooling. Vì vậy:

- Không tạo `AGENTS.md` ở repository root.
- Không tạo nested `AGENTS.md` cho path dự đoán.
- Không khai báo command format/lint/test là runnable.
- Không thêm ESLint, Prettier, Jest hoặc NestJS config trước ticket scaffold.

## Planned baseline

Khi module root đầu tiên được tạo bởi ticket đã đạt Definition of Ready:

1. Chạy module inventory từ repository thực tế.
2. Xác nhận module roots; không suy từ topology logic.
3. Tạo một nested `AGENTS.md` tại từng module root.
4. Ghi Clean Architecture boundary theo `ARCH-017..026`.
5. Ưu tiên TypeScript strict, Prettier, ESLint và Jest nếu stack thực tế là NestJS.
6. Command trong `codex-guidelines` phải chạy được từ module root.
7. Formatter SHOULD hỗ trợ changed-files-first khi tool cho phép.
8. Tooling/config change phải nằm trong ticket scaffold hoặc remediation riêng và có test.
9. Relational analysis/design dùng PostgreSQL 16 vocabulary và không thiết kế từ TypeORM
   decorator.
10. Khi relational module được scaffold, TypeORM + `pg` là implementation adapter mặc
    định; TypeORM chỉ nằm trong infrastructure/persistence, `synchronize` phải là `false`,
    và migration phải hiện thực reviewed PostgreSQL design.
11. Constraint/transaction/concurrency/migration claim phải có integration evidence trên
    PostgreSQL 16 thật.

## Required module rules

Mỗi nested guideline sau này MUST kiểm soát tối thiểu:

- `domain` không import framework/ORM/provider.
- `application` chỉ phụ thuộc domain và ports.
- concrete adapter không được import ngược vào domain/application.
- controller/consumer không chứa business invariant.
- service không import internal source/entity/repository của service khác.
- migration/database/test command là service-local.
- contract và generated artifact có owner, source và deterministic command.
- TypeORM persistence entity/repository/DataSource/QueryRunner không được import vào
  domain/application; database invariant không được chuyển thành ORM-only check.

## Planned commands, not executable

Tên công cụ dự kiến:

- Format: Prettier.
- Lint: ESLint với TypeScript-aware rules.
- Test: Jest; integration/database/concurrency tests dùng boundary thật theo risk.

Command cụ thể chỉ được ghi khi package manager, workspace layout và scripts tồn tại.
