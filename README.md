# Lịch Gọn

Ứng dụng full-stack giúp sinh viên nhập các lớp có thể đăng ký và nhận ba thời khóa biểu cô đọng nhất.

## Công nghệ

- React + Vite + Tailwind CSS
- Express
- MySQL
- JWT trong cookie HTTP-only và bcrypt

## Chạy dự án

Yêu cầu Node.js 20+, npm và MySQL 8. Nếu dùng Docker:

```bash
docker compose up -d
npm install
npm run dev
```

Mở `http://127.0.0.1:5173`. API chạy ở `http://localhost:4000`.

Nếu dùng MySQL cài trực tiếp, chạy file `server/database/schema.sql`, sau đó sao chép `server/.env.example` thành `server/.env` và cập nhật thông tin kết nối.

## Luồng chính

1. Đăng ký hoặc đăng nhập.
2. Chọn **Import từ HCMUT**, query một môn trên trang đăng ký rồi copy toàn bộ trang để hệ thống đọc mã lớp, thứ và tiết học. Văn bản gốc chỉ được xử lý trên trình duyệt, không được gửi lên server. Vẫn có thể thêm môn thủ công.
3. Khi import, lớp đã đủ sĩ số bị loại khỏi thuật toán. Lớp đã nằm trong danh sách đăng ký của sinh viên vẫn được giữ kể cả khi ảnh chụp danh sách query hiển thị đã đủ.
4. Mỗi lớp có thể có một hoặc nhiều buổi, nhập bằng tiết bắt đầu–kết thúc từ tiết 2 đến tiết 12. Hệ thống tự đổi sang giờ theo công thức `X + 5:00` đến `Y + 5:50`.
5. Chọn **Tạo 3 phương án** để hệ thống loại lịch trùng giờ và xếp theo:
   - số ngày học tăng dần;
   - tổng thời gian trống tăng dần.
6. Có thể chuyển sang **Tự chọn lớp**, nhấn từng lớp để xem trực tiếp trên thời khóa biểu.
7. Lưu phương án mong muốn vào tài khoản.

## Các lệnh

```bash
npm run dev     # chạy frontend và backend
npm run build   # build frontend
npm run test    # kiểm thử thuật toán xếp lịch
npm run check   # chạy toàn bộ test và production build
```

## Chuẩn bị production

Ứng dụng được thiết kế để frontend và API chạy cùng một domain. Khi `NODE_ENV=production`, Express tự phục vụ thư mục `client/dist` và mọi request API vẫn đi qua `/api`.

1. Tạo MySQL production và chạy `server/database/schema.sql` một lần.
2. Khai báo các biến theo `server/.env.production.example` trong phần secret/environment của nền tảng deploy.
3. Tạo `JWT_SECRET` ngẫu nhiên có ít nhất 32 ký tự; không dùng secret local.
4. Đặt `CLIENT_ORIGIN` thành đúng URL HTTPS production.
5. Ngoại lệ khóa lớp theo tài khoản là tùy chọn. Trên production, chỉ bật bằng cặp `SCHEDULE_OVERRIDE_EMAIL` và `REQUIRED_SECTIONS`; không ghi email cá nhân vào source code.
6. Chạy `npm run check` trước mỗi lần deploy.

Có thể build một container production bằng `Dockerfile` ở thư mục gốc. `docker-compose.yml` chỉ dành cho phát triển local; mật khẩu trong file này không được dùng trên production.

Phương án miễn phí được khuyến nghị cho nhóm người dùng nhỏ là **Render Free + TiDB Cloud Starter**. Xem hướng dẫn từng bước tại [`docs/deployment-render-tidb.md`](docs/deployment-render-tidb.md). `render.yaml` sẽ tạo một web service Docker, sinh `JWT_SECRET` và hỏi thông tin kết nối database mà không ghi secret vào GitHub.

Các chức năng cần dịch vụ bên ngoài và chưa nằm trong MVP: xác minh email, quên mật khẩu, sao lưu database tự động và giám sát lỗi production.

## Cấu trúc chính

```text
client/src/components/       Giao diện và thời khóa biểu
server/src/routes/           REST API
server/src/services/         Thuật toán xếp lịch
server/database/schema.sql   Schema MySQL
server/test/                 Kiểm thử thuật toán
```
