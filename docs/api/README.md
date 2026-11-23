# D1 – Sweet Cake API Documentation

## Nội dung bàn giao

1. `01_API_Contract.md`: danh mục endpoint, request đã xác định, quy tắc bảo mật/nghiệp vụ và các điểm cần BE/FE chốt.
2. `02_SweetCake_API.postman_collection.json`: Postman Collection có 81 request khởi tạo, bao phủ các endpoint được liệt kê trong mục 5.2 (các endpoint gộp trong một dòng đã được tách thành request riêng).
3. `03_SweetCake_Environment.json`: Postman Environment Local.
4. `04_Mock_Data/`: JSON response mẫu để FE tham khảo/mock giao diện.

## Import vào Postman

1. Mở Postman → **Import**.
2. Chọn `02_SweetCake_API.postman_collection.json`.
3. Chọn Import lần nữa → chọn `03_SweetCake_Environment.json`.
4. Chọn Environment **Sweet Cake - Local** ở góc phải.
5. Sửa `baseUrl` nếu backend chạy ở host/port khác.
6. Sau khi đăng nhập bằng tài khoản test, điền `buyerToken` hoặc `adminToken`. Tracking flow điền `trackToken`.
7. Điền các ID cần thiết (`productId`, `orderId`, `timeSlotId`...) trước khi gửi request.

## Cảnh báo trước khi kiểm thử

- Collection là bộ khung request ban đầu. Tên trường trong body đã được chuẩn hóa theo mục 5.1 ở các phần nguồn quy định rõ; các body vẫn chỉ là ví dụ vì mục 5.2 chưa mô tả đầy đủ schema request. Đối chiếu và chốt với BE/FE trước khi kiểm thử tích hợp.
- Không điền token, mật khẩu, secret thật vào file đưa lên Git.
- Webhook là endpoint mô phỏng hệ thống thanh toán; cần BE cung cấp cách xác thực secret và quy trình test riêng.
- `POST /images` cần chuyển Body sang `form-data`, thêm trường file kiểu File và `purpose` kiểu Text.
- Không có endpoint logout theo mục 5.2.
- Giỏ hàng nằm trên thiết bị/client theo mục 5.1; không tạo collection `carts` và không có API cart trong collection. Việc dùng localStorage là lựa chọn triển khai phía FE, chưa phải quy định trong tài liệu nguồn.
- Success envelope trong mock (`success`, `data`, `message`) là cấu trúc minh họa cần BE/FE xác nhận. Nguồn 5.2 chỉ chốt lỗi `{code, message}`.

## Git

Nên commit toàn bộ thư mục `D1_API_Documentation/` cùng một commit để giữ các tài liệu đồng bộ. Không commit `.env`, token thật, mật khẩu hoặc secret webhook.
