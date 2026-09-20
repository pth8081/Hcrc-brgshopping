# Hướng dẫn deploy lên VPS (dễ hiểu, làm theo từng bước)

Tài liệu này hướng dẫn đưa website chạy thật trên một VPS (máy chủ Linux
thuê ngoài — Ubuntu hoặc CentOS). Cứ làm lần lượt từ trên xuống, đừng nhảy
cóc.

## Chọn 1 trong 2 cách deploy

App được quản lý bởi **PM2** trong cả hai cách. Khác nhau ở chỗ ai đứng ra
"nhận" traffic từ internet trước:

| | **Cách 1: Chỉ PM2** | **Cách 2: PM2 + Nginx** |
|---|---|---|
| Có nginx không? | Không | Có |
| Ai lo chứng chỉ HTTPS? | Chính app Node lo | Nginx lo |
| Cài đặt | Đơn giản hơn, ít bước hơn | Nhiều bước hơn nhưng phổ biến hơn |
| Phù hợp khi | Muốn gọn nhẹ, không cần chạy thêm site nào khác trên máy | Sau này muốn chạy thêm site khác trên cùng VPS, hoặc muốn set-up "chuẩn" như đa số hướng dẫn trên mạng |

**Không chắc chọn cái nào → chọn Cách 2 (PM2 + Nginx).** Đây là kiểu phổ
biến nhất, nhiều tài liệu tham khảo hơn nếu sau này gặp lỗi cần tra cứu.

Các **Bước 1 → 4** dưới đây làm chung cho cả hai cách. Làm xong Bước 4 thì
tách sang [Cách 1](#cách-1-chỉ-dùng-pm2-không-có-nginx) hoặc
[Cách 2](#cách-2-pm2--nginx) tuỳ đã chọn ở trên.

## Trước khi bắt đầu, cần chuẩn bị sẵn

- [ ] Một VPS Linux (Ubuntu 22.04 trở lên, hoặc CentOS/RHEL 9 trở lên).
- [ ] Một tên miền (domain) đã trỏ về IP của VPS — **chỉ cần nếu muốn HTTPS
      thật** (khuyến nghị nếu website ra internet công cộng). Nếu chưa có
      domain, vẫn deploy được nhưng sẽ chỉ chạy HTTP, không có ổ khoá xanh.
- [ ] Một nơi chạy MSSQL (SQL Server) — có 2 lựa chọn:
  - Cài SQL Server for Linux ngay trên VPS này (xem
    [hướng dẫn cài của Microsoft](https://learn.microsoft.com/sql/linux/sql-server-linux-setup)).
  - Hoặc dùng một MSSQL có sẵn ở nơi khác (ví dụ Azure SQL Database) — chỉ
    cần VPS này gọi mạng tới được nó.
- [ ] Thông tin đăng nhập MSSQL (host, port, tên database, user, password)
      để điền vào file `.env` ở Bước 4.

---

## Bước 1: Chuẩn bị VPS

Đăng nhập vào VPS qua SSH, rồi tạo một user riêng để chạy app (không chạy
app bằng tài khoản `root`, vì nếu app có lỗ hổng thì thiệt hại sẽ giới hạn
trong tài khoản này thôi):

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy   # tuỳ chọn, chỉ cần nếu user này cũng dùng để quản trị máy
su - deploy
```

Từ đây về sau, các lệnh đều chạy dưới user `deploy` này.

## Bước 2: Cài Node.js và PM2

Ubuntu/Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v            # phải in ra v20.x
sudo npm install -g pm2
```

CentOS/RHEL: thay dòng đầu bằng
`curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -`, và
`apt install` thành `dnf install -y nodejs`.

## Bước 3: Lấy code và cài thư viện

```bash
git clone <URL repo của bạn> /home/deploy/brgshopping
cd /home/deploy/brgshopping
npm ci
```

Lưu ý: **không** dùng `npm ci --omit=dev`. Lệnh chạy migrate ở Bước 4 cần
gói `sequelize-cli` (nằm trong devDependencies) — nếu bỏ qua nó, lệnh migrate
vẫn chạy được nhưng sẽ tự tải một bản khác từ internet thay vì dùng đúng
bản đã khoá sẵn trong `package-lock.json`.

Cũng **không cần** chạy `npm run build:css` — file CSS
(`public/css/style.css`) đã được build sẵn và nằm trong repo rồi, không
cần internet để tạo lại.

## Bước 4: Cấu hình `.env`, tạo database, tạo tài khoản admin

```bash
cp .env.example .env
nano .env
```

Sửa các dòng sau trong file `.env` (các dòng khác cứ để mặc định, phần
riêng của từng cách deploy sẽ nói rõ ở dưới):

| Biến | Điền gì |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Một chuỗi ngẫu nhiên dài — tạo bằng lệnh `openssl rand -base64 48`. Tuyệt đối không để nguyên giá trị mẫu trong `.env.example`. |
| `MSSQL_HOST`, `MSSQL_PORT`, `MSSQL_DATABASE`, `MSSQL_USER`, `MSSQL_PASSWORD` | Thông tin MSSQL thật đã chuẩn bị ở phần "Trước khi bắt đầu" |
| `MSSQL_ENCRYPT` | Đặt `true` nếu MSSQL có chứng chỉ TLS thật (nên bật nếu MSSQL không nằm trên `localhost`) |
| `ADMIN_PASSWORD` | **Để trống, đừng điền gì.** Bước tạo tài khoản admin dưới đây sẽ tự sinh mật khẩu ngẫu nhiên và chỉ in ra một lần. |

Chạy tạo bảng và tài khoản admin:

```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

Lệnh trên sẽ in ra thứ tương tự:

```
===========================================================
 Admin account created — SAVE THIS PASSWORD, it is shown once:
 Email:    admin@brgshopping.local
 Password: 8f2iK3mN9xQz1pLr
===========================================================
```

**Chép ngay email + mật khẩu này lại một nơi an toàn** (ví dụ trình quản lý
mật khẩu). Mật khẩu này không được lưu lại ở đâu khác dưới dạng đọc được
(database chỉ lưu bản mã hoá), và dòng in trên màn hình sẽ trôi mất ngay
sau đó. Hiện app chưa có màn hình "đổi mật khẩu" — nếu làm mất, cách duy
nhất lấy lại là chạy `npx sequelize-cli db:seed:undo` rồi `db:seed:all` lại
lần nữa để tạo tài khoản admin mới (chỉ nên làm việc này trước khi có đơn
hàng thật gắn với tài khoản admin cũ).

Nếu có dữ liệu sản phẩm/khách hàng/đơn hàng cũ từ Odoo cần chuyển sang, làm
việc đó ngay bây giờ, trước khi có khách hàng thật vào web — xem
[`MIGRATION.md`](./MIGRATION.md).

**Xong Bước 4 rồi thì bấm sang mục tương ứng với cách bạn đã chọn ở trên.**

---

## Cách 1: Chỉ dùng PM2, không có Nginx

App sẽ trực tiếp lắng nghe traffic từ internet, không qua trung gian nào.

### 1.1. Cho phép Node dùng cổng 80/443 mà không cần chạy bằng root

Linux mặc định chỉ cho tài khoản `root` mở các cổng dưới 1024 (như 80,
443). Thay vì chạy cả app bằng `root`, ta chỉ cấp riêng quyền "mở cổng
thấp" cho chương trình Node:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"
```

Nhớ chạy lại lệnh này mỗi khi nâng cấp phiên bản Node.

### 1.2. Chọn A hoặc B: có HTTPS hay không

**A — Chạy HTTP thường (đơn giản nhất, nhưng KHÔNG khuyến nghị cho web
công khai).**

Trong `.env`, đặt `PORT=80`, để trống `TLS_KEY_PATH` và `TLS_CERT_PATH`.

```bash
pm2 start src/server.js --name brgshopping
pm2 save
pm2 startup   # lệnh này in ra một dòng lệnh khác, chạy nốt dòng đó 1 lần để PM2 tự khởi động lại sau khi VPS reboot
```

⚠️ Với cách này, **mọi thứ đi qua mạng đều không được mã hoá** — kể cả mật
khẩu đăng nhập. Chỉ chấp nhận được nếu web chạy nội bộ, không ra internet
công cộng. Nếu web của bạn công khai trên internet, hãy làm theo **B** bên
dưới thay vì A.

**B — App tự phục vụ HTTPS (khuyến nghị nếu chọn Cách 1 và web ra internet
công cộng).**

Xin chứng chỉ HTTPS miễn phí từ Let's Encrypt (lúc này cổng 80 phải đang
trống, chưa có gì chạy):

```bash
sudo apt install -y certbot   # CentOS/RHEL: dnf install -y certbot
sudo certbot certonly --standalone -d ten-mien-cua-ban.com
```

Cho phép user `deploy` đọc được chứng chỉ vừa xin (mặc định chỉ `root` đọc
được):

```bash
sudo setfacl -R -m u:deploy:rX /etc/letsencrypt/live /etc/letsencrypt/archive
```

Sửa tiếp trong `.env`:
```
PORT=443
TLS_KEY_PATH=/etc/letsencrypt/live/ten-mien-cua-ban.com/privkey.pem
TLS_CERT_PATH=/etc/letsencrypt/live/ten-mien-cua-ban.com/fullchain.pem
HTTP_REDIRECT_PORT=80
```

Khởi động app:
```bash
pm2 start src/server.js --name brgshopping
pm2 save
pm2 startup
```

Từ giờ app tự phục vụ HTTPS ở cổng 443, và ai gõ `http://` vào cổng 80 sẽ
được tự động chuyển sang `https://` (không cần nginx).

**Gia hạn chứng chỉ (mỗi 90 ngày):** chứng chỉ Let's Encrypt hết hạn sau 90
ngày. App chỉ đọc file chứng chỉ một lần lúc khởi động, nên sau khi gia hạn
cần restart app mới nhận chứng chỉ mới. Thiết lập gia hạn tự động:

```bash
sudo crontab -e
# thêm dòng này vào cuối file:
0 3 * * * certbot renew --pre-hook "su - deploy -c 'pm2 stop brgshopping'" --post-hook "su - deploy -c 'pm2 start brgshopping'" --quiet
```

(Dòng cron này tự tắt app trong vài giây để nhường cổng 80 cho certbot xác
minh domain, xong rồi bật lại app.)

### 1.3. Mở firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp    # nếu chỉ làm A ở trên thì chỉ cần allow 80
sudo ufw enable
```
CentOS/RHEL (`firewalld`):
```bash
sudo firewall-cmd --permanent --add-service=ssh --add-service=http --add-service=https
sudo firewall-cmd --reload
```

### 1.4. Kiểm tra

```bash
curl -Ik https://ten-mien-cua-ban.com/health   # hoặc http:// nếu làm A
```
Phải trả về `200`.

---

## Cách 2: PM2 + Nginx

### 2.1. Chạy app bằng PM2, chỉ lắng nghe nội bộ

Trong `.env`, giữ `PORT=3000` (giá trị mặc định), để trống `TLS_KEY_PATH`
và `TLS_CERT_PATH` — app chỉ cần nói chuyện HTTP thường với nginx trên
cùng máy, không cần tự lo HTTPS.

```bash
pm2 start src/server.js --name brgshopping
pm2 save
pm2 startup   # in ra một dòng lệnh, chạy nốt dòng đó 1 lần để PM2 tự khởi động lại sau khi VPS reboot
```

Các lệnh dùng hằng ngày: `pm2 status`, `pm2 logs brgshopping`,
`pm2 restart brgshopping`.

### 2.2. Cài nginx và trỏ nó vào app

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```
(CentOS/RHEL: `dnf install -y nginx certbot python3-certbot-nginx`)

Copy file mẫu [`deploy/nginx.conf.example`](../deploy/nginx.conf.example)
vào `/etc/nginx/sites-available/brgshopping` (Ubuntu/Debian) hoặc
`/etc/nginx/conf.d/brgshopping.conf` (CentOS/RHEL), rồi sửa `example.com`
trong file đó thành tên miền thật của bạn. Sau đó:

```bash
# Chỉ Ubuntu/Debian cần dòng này — CentOS/RHEL không có bước sites-enabled
sudo ln -s /etc/nginx/sites-available/brgshopping /etc/nginx/sites-enabled/

sudo nginx -t                 # kiểm tra config có lỗi cú pháp không, trước khi áp dụng
sudo systemctl reload nginx
sudo certbot --nginx -d ten-mien-cua-ban.com   # xin chứng chỉ HTTPS và tự sửa config nginx cho HTTPS + chuyển hướng HTTP->HTTPS
```

Certbot đã tự thiết lập gia hạn định kỳ (và tự reload nginx sau khi gia
hạn) — không cần làm gì thêm như Cách 1. Kiểm tra bằng:
```bash
sudo certbot renew --dry-run
```

### 2.3. Mở firewall

Chỉ 80/443 (nginx) và cổng SSH cần mở ra internet — cổng 3000 của app chỉ
cần nội bộ máy dùng được.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```
CentOS/RHEL (`firewalld`):
```bash
sudo firewall-cmd --permanent --add-service=ssh --add-service=http --add-service=https
sudo firewall-cmd --reload
```

### 2.4. Kiểm tra

```bash
curl -I https://ten-mien-cua-ban.com/health
```
Phải trả về `HTTP/2 200`.

---

## Bước 5: Sao lưu dữ liệu (backup)

Repo này **không** tự động sao lưu database. Cần tự thiết lập một trong
hai:
- Một job chạy hằng đêm dùng `sqlcmd`/`BACKUP DATABASE`, hoặc
- Tính năng backup có sẵn của nơi host MSSQL (ví dụ Azure SQL tự backup).

Quan trọng: **chép file backup ra khỏi VPS** (sang máy khác/cloud storage)
— backup nằm chung ổ đĩa với database thì mất ổ là mất luôn cả hai.

## Bước 6: Đăng nhập và hoàn thiện trước khi công bố

Mở website trên trình duyệt, đăng nhập bằng tài khoản admin đã tạo ở Bước
4, rồi nhập dữ liệu sản phẩm/danh mục thật trước khi công bố website ra
công chúng.

## Những phần tài liệu này CHƯA làm

- **Cổng thanh toán online.** Hiện tại việc xác nhận đã thanh toán là admin
  tự bấm xác nhận thủ công (COD/chuyển khoản/ví điện tử), chưa nối với
  VNPay/Momo thật. Cần tích hợp cổng thanh toán thật trước khi nhận tiền
  online thật.
- **Gửi email/SMS.** Thông báo đơn hàng hiện chỉ hiển thị trong app, chưa
  cấu hình gửi email/SMS ra ngoài. Cần thêm nhà cung cấp dịch vụ nếu muốn
  gửi thông báo cho khách qua email/SMS.
- **CI/kiểm thử tự động.** Việc kiểm tra tới nay là làm thủ công (test bằng
  curl và Playwright với MSSQL thật khi phát triển), chưa có bộ test tự
  động chạy trong pipeline CI.
