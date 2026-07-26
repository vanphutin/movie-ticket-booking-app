# Git and PR workflow

1. Branch theo ticket: `feature/<ticket-id>-slug` hoặc `fix/<ticket-id>-slug`.
2. Commit nhỏ, imperative, có ticket/contract IDs trong body khi cần.
3. Không trộn refactor ngoài scope; generated/secret/binary evidence không commit tùy tiện.
4. PR dùng template, nêu scope/non-scope, contracts, design, tests, migrations, rollback, risk và evidence.
5. Self-review diff trước submit; feedback resolution trỏ finding/test/commit.
6. Merge/release chỉ sau gate tương ứng; không rewrite evidence history.
