# Docs Viewer — Trung tâm tài liệu dự án

Giao diện HTML/CSS/JS thuần để xem **toàn bộ** tài liệu của repo (AI-contracts, docs,
file gốc) một cách trực quan. Không cần server, không cần cài dependency.

## Cách dùng

1. Mở trực tiếp `docs-viewer/index.html` bằng trình duyệt (double-click).
2. Khi tài liệu trong repo thay đổi, chạy lệnh sau để cập nhật dữ liệu (đã tích hợp tự động vào control plane sync):

```bash
node tools/control-plane/sync-control-plane.mjs
# Hoặc chạy trực tiếp script viewer:
node docs-viewer/build-data.js
```

## Tính năng

- **Trang tổng quan**: thống kê, thứ tự đọc bắt buộc của AI Contracts, nhóm tài liệu,
  danh sách cập nhật gần đây.
- **Cây tài liệu** bên trái: nhóm theo thư mục, có bộ lọc nhanh, thu gọn/mở rộng.
- **Đọc markdown**: heading, bảng, danh sách lồng nhau, callout (`[!NOTE]`...),
  code block, mermaid diagram, mục lục bên phải, nút Trước/Sau.
- **Tìm kiếm toàn văn** (`Ctrl+K`): tìm theo tên file, tiêu đề, nội dung; kết quả
  có ngữ cảnh và highlight từ khóa trong trang.
- **Cross-link contract ID**: click vào `BUS-009`, `API-BKG-004`, `TKT-W04-D01`,
  `CCR-004`... trong nội dung để nhảy tới file định nghĩa và highlight vị trí.
- **Dark/Light theme**, trạng thái thu gọn sidebar được nhớ qua `localStorage`.

## Ghi chú

- `docs-data.js` là file generate — không sửa tay.
- File được index: `*.md`, `*.yml`, `*.yaml` (loại trừ `.git`, `node_modules`,
  `docs-viewer`, `note.txt` và file ẩn).
- Viewer cũ `AI-contracts/viewer/` vẫn giữ nguyên vai trò workbench riêng cho
  AI-contracts; viewer này bao trùm toàn bộ tài liệu ở mức đọc/tra cứu.
- Debug parser trên console trình duyệt: `window.__dv.parseMarkdown('# test')`.
