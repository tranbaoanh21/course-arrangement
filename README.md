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
2. Thêm mã môn, tên môn và tất cả lớp có thể đăng ký.
3. Mỗi lớp có thể có một hoặc nhiều buổi, nhập bằng tiết bắt đầu–kết thúc từ tiết 2 đến tiết 12. Hệ thống tự đổi sang giờ theo công thức `X + 5:00` đến `Y + 5:50`.
4. Chọn **Tạo 3 phương án** để hệ thống loại lịch trùng giờ và xếp theo:
   - số ngày học tăng dần;
   - tổng thời gian trống tăng dần.
5. Có thể chuyển sang **Tự chọn lớp**, nhấn từng lớp để xem trực tiếp trên thời khóa biểu.
6. Lưu phương án mong muốn vào tài khoản.

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
5. Không khai báo `LOCAL_SCHEDULE_OVERRIDE_EMAIL` và `LOCAL_REQUIRED_SECTIONS` trên production. Code cũng chủ động vô hiệu hóa ngoại lệ này khi `NODE_ENV=production`.
6. Chạy `npm run check` trước mỗi lần deploy.

Có thể build một container production bằng `Dockerfile` ở thư mục gốc. `docker-compose.yml` chỉ dành cho phát triển local; mật khẩu trong file này không được dùng trên production.

Các chức năng cần dịch vụ bên ngoài và chưa nằm trong MVP: xác minh email, quên mật khẩu, sao lưu database tự động và giám sát lỗi production.

## Cấu trúc chính

```text
client/src/components/       Giao diện và thời khóa biểu
server/src/routes/           REST API
server/src/services/         Thuật toán xếp lịch
server/database/schema.sql   Schema MySQL
server/test/                 Kiểm thử thuật toán
```
