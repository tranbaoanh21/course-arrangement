# Triển khai miễn phí bằng Render và TiDB Cloud

## Kiến trúc

```text
GitHub main
    ↓ CI thành công
Render Free: React static files + Express API
    ↓ MySQL qua TLS
TiDB Cloud Starter
```

Frontend và API chạy cùng một domain Render. TiDB Cloud Starter cung cấp database tương thích MySQL; không cần đổi ứng dụng sang PostgreSQL.

## 1. Tạo TiDB Cloud Starter

1. Mở <https://tidbcloud.com> và đăng nhập bằng GitHub hoặc Google.
2. Tạo organization/project nếu màn hình yêu cầu.
3. Chọn **Create → TiDB Cloud Starter**.
4. Chọn region gần Singapore nếu có và giữ spending limit bằng `0` để không phát sinh phí.
5. Tạo instance, mở **Connect**, chọn kết nối public/standard và đặt mật khẩu database.
6. Trong phần IP Access List, cho phép kết nối từ mọi IP bằng `0.0.0.0/0`. Render Free không có outbound IP cố định. Bảo vệ database bằng mật khẩu mạnh và TLS.
7. Ghi tạm bốn giá trị được TiDB cung cấp: host, port, username và password. Không gửi hoặc commit password lên GitHub.

Với Starter, port thường là `4000`, database mặc định là `test`, và username có thể chứa prefix do TiDB sinh. Hãy dùng chính xác giá trị trên màn hình **Connect**.

## 2. Tạo Render Blueprint

1. Mở <https://dashboard.render.com> và đăng nhập bằng GitHub.
2. Cấp cho Render quyền đọc repository `tranbaoanh21/course-arrangement`.
3. Chọn **New → Blueprint**.
4. Chọn repository trên và xác nhận file `render.yaml`.
5. Render sẽ yêu cầu các giá trị chưa có trong GitHub:

   - `DB_HOST`: host từ TiDB, không kèm `mysql://` và không kèm port.
   - `DB_USER`: username đầy đủ từ TiDB.
   - `DB_PASSWORD`: mật khẩu database vừa đặt.
   - `SCHEDULE_OVERRIDE_EMAIL`: email tài khoản duy nhất cần khóa lớp; để trống nếu không dùng.
   - `REQUIRED_SECTIONS`: danh sách `MÃ_MÔN:MÃ_LỚP` phân cách bằng dấu phẩy; để trống nếu không dùng.

6. Chọn **Apply** và đợi build/deploy hoàn tất.

`JWT_SECRET` được Render tự sinh. `DB_PORT=4000`, `DB_NAME=test` và TLS đã nằm trong Blueprint. Render tự cung cấp hostname public, ứng dụng sẽ dùng hostname đó làm `CLIENT_ORIGIN` nên không cần nhập URL thủ công.

Khi container khởi động, nó tự chạy toàn bộ migration còn thiếu rồi mới bật Express. Không cần dán schema bằng tay.

## 3. Kiểm tra sau deploy

Giả sử Render cấp URL `https://lich-gon-hcmut.onrender.com`:

1. Mở `https://lich-gon-hcmut.onrender.com/api/health`; kết quả cần là `{ "status": "ok" }`.
2. Mở trang chính và đăng ký một tài khoản test mới.
3. Đăng nhập, thêm một môn có ít nhất hai lớp và tạo ba phương án.
4. Lưu lịch, refresh trang và xác nhận lịch vẫn còn.
5. Xóa tài khoản test hoặc dữ liệu test nếu không dùng nữa.

## 4. Giới hạn miễn phí cần biết

- Render Free ngủ sau một khoảng thời gian không có request. Lần mở đầu tiên sau khi ngủ có thể mất khoảng một phút.
- Dữ liệu không nằm trên filesystem Render mà nằm trong TiDB, nên việc Render ngủ hoặc deploy lại không làm mất tài khoản và lịch đã lưu.
- TiDB sẽ chặn hoặc giới hạn truy cập khi vượt quota miễn phí nếu spending limit vẫn là `0`; hệ thống không tự trừ tiền.
- Không đặt các biến `LOCAL_*` trên production. Nếu cần khóa lớp cho một tài khoản, dùng cặp `SCHEDULE_OVERRIDE_EMAIL` và `REQUIRED_SECTIONS`.

## 5. Mỗi lần cập nhật code

```bash
git add <cac-file-da-sua>
git commit -m "mo ta thay doi"
git push
```

GitHub Actions chạy test, build và audit. Khi checks thành công, Render tự deploy commit mới theo cấu hình `autoDeployTrigger: checksPass`.
