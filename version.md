# Phiên bản

Phiên bản hiện tại: **1.0.0**

Dự án theo [Semantic Versioning](https://semver.org/lang/vi/) (MAJOR.MINOR.PATCH):
- **MAJOR** — thay đổi phá vỡ tương thích (đổi schema DB không tương thích ngược, đổi API bắt buộc).
- **MINOR** — thêm tính năng mới, tương thích ngược.
- **PATCH** — sửa lỗi, không thêm tính năng.

## Changelog

### 1.0.0 — Gợi ý sản phẩm theo hành vi
- "Đã xem gần đây" (localStorage), "Sản phẩm liên quan", "Bán chạy nhất".
- Ghi log lượt xem/tìm kiếm; gợi ý từ khoá tìm kiếm theo thời gian thực.
- "Khách mua sản phẩm này cũng mua" (suy từ đơn hàng chung).
- "Dành cho bạn" và xếp hạng lại trang chủ theo sở thích người dùng (chấm điểm theo danh mục đã xem/đã mua).
- Sửa lỗi: `products.sku` với nhiều giá trị NULL vi phạm UNIQUE constraint trên SQL Server; sửa query "bán chạy nhất" bị SQL Server từ chối do ORDER BY ngầm của Sequelize khi dùng GROUP BY + JOIN + LIMIT.

### 0.6.0 — Tin tức & Khuyến mại
- Module Tin tức: đăng/sửa/xoá bài viết (admin), trang danh sách + chi tiết công khai.
- Module Khuyến mại: chương trình giảm giá theo mã, validate và tính giảm giá phía server khi thanh toán, banner trang chủ.

### 0.5.0 — Xử lý đơn hàng đầy đủ
- Lịch sử trạng thái đơn hàng (audit log), trang chi tiết đơn (khách hàng + admin) có in hoá đơn.
- Admin cập nhật trạng thái đơn/thanh toán; khách tự huỷ đơn khi còn chờ xác nhận (tự hoàn kho).
- Thông báo trong ứng dụng theo lịch sử đơn hàng.

### 0.4.0 — Di trú dữ liệu thật từ Odoo
- Viết lại script ETL cho nguồn thật là Odoo/PostgreSQL (không phải MySQL như giả định ban đầu).
- Di trú phần storefront (danh mục, sản phẩm, khách hàng, đơn hàng) từ Odoo sang MSSQL.

### 0.3.0 — Bảo mật
- Rà soát và vá lỗ hổng XSS, whitelist hoá các giá trị nội suy vào DOM.
- Bật Content-Security-Policy nghiêm ngặt, không dùng `unsafe-inline`.

### 0.2.0 — Giao diện Tailwind CSS
- Chuyển giao diện sang Tailwind CSS v4, biên dịch sẵn và tự chứa (không phụ thuộc CDN/internet lúc chạy) để phù hợp máy chủ không có internet.
- Khớp giao diện theo tham chiếu thực tế của BRGMart (thương hiệu đỏ, menu kéo, banner, lưới danh mục, footer accordion).

### 0.1.0 — Khởi tạo dự án
- Scaffold Node.js + Express + MSSQL (Sequelize migrations làm nguồn chân lý cho schema).
- Auth (đăng ký/đăng nhập/JWT), CRUD danh mục/sản phẩm/giỏ hàng/đơn hàng, trang quản trị cơ bản.
- Frontend vanilla JS (không framework/bundler) phục vụ tĩnh qua Express.
