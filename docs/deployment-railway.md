# Triển khai Lịch Gọn lên Railway

## Kiến trúc

```text
GitHub main
    ↓ push
GitHub Actions: test + build + audit + Docker build
    ↓ checks pass
Railway Web Service: React static files + Express API
    ↓ private network
Railway MySQL + persistent volume + scheduled backups
```

Frontend và API chạy cùng một domain. Chỉ web service được public; MySQL chỉ giao tiếp với ứng dụng qua private network.

## 1. Tạo project

1. Đăng nhập Railway bằng GitHub.
2. Tạo một Empty Project.
3. Chọn region Singapore cho cả web service và MySQL.
4. Thêm MySQL từ `+ New → Database → MySQL`.
5. Thêm web service từ `+ New → GitHub Repo` và chọn `tranbaoanh21/course-arrangement`.

Railway sẽ đọc `Dockerfile` và `railway.json` trong repository.

## 2. Biến môi trường web service

```text
NODE_ENV=production
CLIENT_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=<secret ngẫu nhiên tối thiểu 32 ký tự>
```

Tên `MySQL` trong các reference variable phải trùng tên service database trên Railway. Không khai báo `LOCAL_SCHEDULE_OVERRIDE_EMAIL` hoặc `LOCAL_REQUIRED_SECTIONS`.

## 3. Khởi tạo và deploy

`railway.json` chạy migration trước khi bật phiên bản mới, kiểm tra `/api/health`, và chỉ chuyển traffic khi cả Express lẫn MySQL sẵn sàng.

Trong Networking của web service, chọn **Generate Domain**. Sau đó cập nhật `CLIENT_ORIGIN` thành URL HTTPS chính xác Railway vừa cấp và redeploy.

## 4. Bảo vệ production

- Bật **Wait for CI** để Railway chỉ deploy commit đã qua GitHub Actions.
- Bật backup hằng ngày và hằng tuần cho volume MySQL.
- Đặt usage alert và hard limit phù hợp ngân sách.
- Không bật TCP Proxy của MySQL nếu không cần truy cập bằng Workbench.
- Nếu phải dùng Workbench, chỉ bật tạm TCP Proxy rồi tắt sau khi hoàn thành.
- Bật branch protection cho `main`: yêu cầu CI thành công trước khi merge.

## 5. Domain riêng

Khi đã kiểm tra URL Railway:

1. Thêm custom domain trong Networking của web service.
2. Tạo cả bản ghi CNAME và TXT theo Railway cung cấp.
3. Đổi `CLIENT_ORIGIN` sang domain HTTPS chính thức.
4. Kiểm tra đăng ký, đăng nhập, CRUD môn, sinh lịch và lưu lịch.

## 6. Kiểm tra sau deploy

- `GET /api/health` trả về `200` và `{ "status": "ok" }`.
- Đăng ký được một tài khoản test mới.
- Thêm được môn có nhiều lớp và nhiều buổi.
- Sinh đủ ba phương án mà không trùng giờ.
- Lưu, tải lại và xóa lịch thành công.
- Cookie đăng nhập có `Secure`, `HttpOnly` và `SameSite=Lax`.
- Refresh một đường dẫn frontend vẫn trả về ứng dụng React.
