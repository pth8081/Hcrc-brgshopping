# Phiên bản

Phiên bản hiện tại: **1.04**

## Định dạng đánh số (từ sau 1.0.0)

Định dạng `X.YY` — 1 chữ số trước dấu chấm, 2 chữ số sau (00–99):
- Mỗi lần phát hành thêm tính năng/sửa lỗi đáng kể, tăng 2 số sau lên 1 đơn vị:
  `1.00 → 1.01 → 1.02 → ...`
- Khi 2 số sau vượt quá `99`, tăng số trước lên 1 và quay lại `00`:
  `1.99 → 2.00`.

Lưu ý: `package.json` vẫn phải dùng SemVer 3 phần chuẩn của npm (không cho phép
số 0 đứng đầu như `04`), nên phiên bản `1.04` ở đây tương ứng `1.4.0` trong
`package.json` — cùng một phiên bản, chỉ khác cách viết.

Các phiên bản trước `1.0.0` (`0.1.0` → `1.0.0`) dùng Semantic Versioning
(MAJOR.MINOR.PATCH) như lúc phát hành, giữ nguyên không đổi số để không làm
sai lệch lịch sử.

## Changelog

### 1.04 — Quản lý người dùng, captcha, dọn nội dung, sửa responsive màn hình ngang
- Trang quản trị: thêm tab "Người dùng" — tạo tài khoản, đổi vai trò, khoá/mở
  tài khoản, đặt lại mật khẩu hộ người dùng khác. Mọi tài khoản tự đổi được
  mật khẩu của mình.
- Captcha đăng nhập/đăng ký sinh ngay trên server (không phụ thuộc dịch vụ
  bên ngoài như reCAPTCHA), dùng 1 lần, hết hạn sau 5 phút.
- Bỏ nội dung "bản demo"/nhắc công nghệ Node.js hiển thị cho khách (chân
  trang, banner trang chủ, email liên hệ mẫu).
- Sửa bố cục khi xoay ngang điện thoại: nút chat che nội dung (giá sản
  phẩm, nút bấm), banner trang chủ chiếm hết màn hình khiến không thấy sản
  phẩm nào.
- Sửa lỗi: đổi mật khẩu sai trả về mã lỗi khiến trình duyệt hiểu nhầm là hết
  phiên đăng nhập và tự đăng xuất ngoài ý muốn.

### 1.03 — Hướng dẫn HTTPS với chứng chỉ .pem có sẵn
- Hướng dẫn tách file `.pem` dùng chung cho HAProxy (gộp chứng chỉ + khoá
  riêng) thành 2 file riêng để chạy HTTPS trực tiếp trên PM2.

### 1.02 — Đăng nhập mạng xã hội, đặt hàng không cần tài khoản, chat đa kênh
- Đăng nhập bằng Google/Facebook (tuỳ chọn — tự ẩn nút khi chưa cấu hình).
- Đặt hàng không cần tài khoản (giỏ hàng lưu ở trình duyệt), tra cứu đơn
  bằng mã đơn + số điện thoại, không cần đăng nhập.
- Widget chat: chat trực tiếp trên web (admin trả lời trong trang quản
  trị) cộng liên kết Zalo/Messenger (tuỳ chọn, tự ẩn khi chưa cấu hình).

### 1.01 — Tối ưu hiệu năng cơ sở dữ liệu
- Thêm index cho các cột khoá ngoại/trạng thái hay dùng để lọc (danh mục
  sản phẩm, đơn hàng, giỏ hàng).

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
