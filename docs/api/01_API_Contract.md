# D1 – API Contract | Sweet Cake

> Phiên bản: 1.0 – Bản bàn giao khởi tạo từ danh sách API mục 5.2  
> Trạng thái: **Draft cần BE và FE xác nhận trước khi triển khai thật**.

## 1. Phạm vi và nguyên tắc

Tài liệu này chuyển danh sách endpoint tại mục 5.2 thành danh mục hợp đồng API để BE triển khai, FE tích hợp và nhóm kiểm thử bằng Postman.

- Base path: `/api`.
- Định dạng trao đổi mặc định: JSON; riêng `POST /images` dùng `multipart/form-data`.
- Quy ước lỗi trong tài liệu nguồn: `{ "code": "...", "message": "..." }`.
- Public: không cần đăng nhập.
- Buyer/Admin: JWT qua `Authorization: Bearer <JWT>`; server kiểm tra role.
- Guest theo dõi đơn: header `X-Track-Token`.
- Webhook thanh toán: xác thực bằng secret cấu hình trong `.env`.
- Đăng xuất xử lý phía client bằng cách xóa JWT; **không có endpoint logout**.
- Giỏ hàng nằm trên thiết bị/client theo mục 5.1; không có collection `carts` và mục 5.2 không định nghĩa API cart riêng. Cách lưu phía client (ví dụ localStorage) là chi tiết triển khai FE, không phải quy định CSDL đã chốt.

**Lưu ý quan trọng:** Mục 5.2 chưa mô tả đầy đủ schema request/response cho mọi endpoint. Các trường được ghi rõ trong nguồn được giữ nguyên; chỗ chưa có thông tin được đánh dấu **BE/FE cần chốt**, không tự suy diễn thành yêu cầu đã thống nhất.

## 2. Quy ước request/response cần thống nhất

### 2.1 Headers

| Trường hợp | Header |
|---|---|
| JSON | `Content-Type: application/json` |
| Buyer | `Authorization: Bearer {{buyerToken}}` |
| Admin | `Authorization: Bearer {{adminToken}}` |
| Guest theo dõi đơn | `X-Track-Token: {{trackToken}}` |
| Upload ảnh | `Content-Type: multipart/form-data` (Postman tự sinh boundary) |
| Webhook | Header/secret xác thực: **BE cần chốt tên header và cách ký** |

### 2.2 Success envelope

Mục 5.2 chưa quy định envelope thành công dùng chung. Đề xuất để BE/FE xác nhận:

```json
{
  "success": true,
  "data": {},
  "message": "Thành công"
}
```

Không xem đây là quy ước đã chốt cho đến khi BE/FE đồng ý.

### 2.3 Error envelope

Nguồn quy định lỗi trả `{code, message}`. Ví dụ:

```json
{
  "code": "PRICE_CHANGED",
  "message": "Giá đơn hàng đã thay đổi. Vui lòng kiểm tra và xác nhận lại."
}
```

Mã lỗi nghiệp vụ đã nêu tại mục 5.2: `PRICE_CHANGED`, `PRODUCT_HIDDEN`, `VOUCHER_INVALID`, `SLOT_UNAVAILABLE`, `INVALID_TRANSITION`, `TICKET_REQUIRED`, `PHOTO_REQUIRED`, `CANCEL_REQUEST_PENDING`.

Các mã HTTP dự kiến cần BE xác nhận theo từng endpoint: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `500`. Không gán cứng mã HTTP cho từng lỗi nghiệp vụ khi mục 5.2 chưa quy định.

## 3. Quy tắc nghiệp vụ và bảo mật được kế thừa từ mục 5.2

1. Buyer là chủ đơn truy cập bằng JWT; Guest truy cập đơn bằng `X-Track-Token`.
2. Server cấp tracking token khi tạo đơn hoặc khi tra cứu đúng mã đơn và SĐT.
3. Tracking token có `orderId`, hạn ngắn; token cấp lúc tạo đơn có cờ `justPlaced`.
4. Chỉ token có `justPlaced` mới dùng cho `POST /orders/:id/link-account` và `POST /orders/:id/set-password`.
5. Token dùng cho đặt mật khẩu trả JWT để tự động đăng nhập.
6. API `POST /orders` phải tính lại giá ở server, so sánh `expectedTotal`; nếu lệch trả `PRICE_CHANGED` để khách xác nhận.
7. Tạo đơn phải giữ chỗ khung giờ nguyên tử, xử lý lượt voucher và sinh QR đầu tiên.
8. `POST /orders/:id/payment/qr`: tối đa 1 + `maxQrRetries` mã; nếu không giữ lại được khung giờ thì trả `SLOT_UNAVAILABLE` và hủy đơn cũ theo mô tả nguồn.
9. `POST /payments/webhook` idempotent theo `txnId`; thanh toán muộn cho đơn đã hủy phải ghi `latePayment` và tạo refund 100%.
10. Khách chỉ hủy trực tiếp ở `pending_payment` / `pending_approval`; đơn đã thanh toán tạo refund 100% và hoàn lượt voucher theo mô tả nguồn.
11. Yêu cầu hủy ở `accepted` / `baking` tối đa một yêu cầu mỗi đơn.
12. Chuyển trạng thái Admin phải theo luồng hợp lệ, không quay lui; `baking` cần phiếu sản xuất và không có yêu cầu hủy chờ; `done` cần ít nhất một ảnh.
13. Ảnh thực tế chỉ trả khi đơn có trạng thái từ `done` trở lên.
14. Upload ảnh giới hạn JPG/PNG/WebP, tối đa 5 MB; quyền theo `purpose`.
15. Job nền chạy mỗi phút để xử lý QR hết hạn, payment deadline, giải phóng slot và hoàn lượt voucher; cần chống hoàn voucher hai lần bằng `voucher.restored`.
16. Địa chỉ chỉ hỗ trợ TP.HCM theo mô tả API sổ địa chỉ.
17. OTP mô phỏng gồm 6 chữ số, hiệu lực 5 phút.

## 4. Danh mục API chi tiết

Quy ước:
- `Path`: tham số trên URL.
- `Query`: tham số query string.
- `Body`: JSON body, trừ khi ghi khác.
- “Chưa nêu trong 5.2” nghĩa là cần BE/FE thống nhất, không phải không cần dữ liệu.
- Các endpoint gộp trong một dòng nguồn đã được tách thành từng request riêng.

### 4.1 Auth và tài khoản

| Method | Endpoint | Actor | Request đã xác định trong 5.2 | Kết quả / lưu ý |
|---|---|---|---|---|
| POST | `/auth/register` | Public | Body: họ tên, SĐT, mật khẩu, nhập lại mật khẩu, email tùy chọn | Đăng ký. Nếu SĐT đã có tài khoản chưa đặt mật khẩu thì từ chối kèm thông báo BR23. |
| POST | `/auth/login` | Public | Body: SĐT, mật khẩu | Trả JWT và role; từ chối tài khoản bị khóa hoặc chưa có mật khẩu. |
| POST | `/auth/forgot-password` | Public | Body chi tiết chưa nêu; luồng OTP 6 số mô phỏng | OTP hiệu lực 5 phút. |
| POST | `/auth/reset-password` | Public | Body chi tiết chưa nêu; OTP và mật khẩu mới cần được chốt | Đặt lại mật khẩu. |
| GET | `/users/me` | Buyer | JWT | Xem hồ sơ cá nhân. |
| PATCH | `/users/me` | Buyer | Body: `fullName`, `email`, `birthday`; SĐT chỉ xem | Cập nhật hồ sơ; không cho sửa SĐT. |
| PUT | `/users/me/password` | Buyer | Body: mật khẩu cũ, mật khẩu mới, nhập lại mật khẩu mới | Đổi mật khẩu; ghi `passwordChangedAt`. |
| GET | `/users/me/addresses` | Buyer | JWT | Danh sách địa chỉ; phạm vi TP.HCM. |
| POST | `/users/me/addresses` | Buyer | Body theo cấu trúc địa chỉ nhúng ở mục 5.1: `recipientName`, `phone`, `street`, `ward`, `district`, `city` (chỉ TP.HCM), `isDefault`; schema tạo mới cần BE/FE xác nhận | Thêm địa chỉ. |
| PATCH | `/users/me/addresses/:addressId` | Buyer | Path: `addressId`; body dùng các trường địa chỉ được phép cập nhật trong schema mục 5.1 | Sửa địa chỉ. |
| DELETE | `/users/me/addresses/:addressId` | Buyer | Path: `addressId` | Xóa địa chỉ. |
| PATCH | `/users/me/addresses/:addressId/default` | Buyer | Path: `addressId` | Đặt địa chỉ mặc định. |
| GET | `/users/me/vouchers?state=` | Buyer | Query: `state` | Voucher khả dụng / đã dùng / hết hạn; giá trị enum cần chốt. |
| POST | `/orders/:id/link-account` | Tracking (justPlaced) | Path: `id`; SĐT theo đơn | Guest đồng ý tạo tài khoản bằng SĐT đơn; tạo user chưa có mật khẩu và gắn `userId` cho đơn vừa đặt. |
| POST | `/orders/:id/set-password` | Tracking (justPlaced) | Path: `id`; mật khẩu nhập 2 lần | Đặt mật khẩu; trả JWT để tự động đăng nhập. |

### 4.2 Sản phẩm, tùy biến và giá

| Method | Endpoint | Actor | Request đã xác định trong 5.2 | Kết quả / lưu ý |
|---|---|---|---|---|
| GET | `/products` | Public | Query: `q`, `kind`, `category`, `occasion`, `filling`, `minPrice`, `maxPrice`, `featured`, `sort`, `page`, `limit` | Danh sách sản phẩm visible. Trường sản phẩm theo mục 5.1 gồm `basePrice`, `salePrice` (tùy chọn), `status` (`visible`/`hidden`), `imageIds`; schema item/pagination chi tiết cần chốt. |
| GET | `/products/filters` | Public | Không có request bổ sung | Danh mục, dịp, nhân để lọc. |
| GET | `/products/:id` | Public | Path: `id` | Chi tiết; sản phẩm ẩn trả 404. |
| GET | `/products/:id/reviews` | Public | Path: `id` | Đánh giá đang hiển thị. |
| GET | `/customization` | Public | Không có request bổ sung | Các tùy chọn đang bật. |
| POST | `/orders/quote` | Public | Body: danh sách dòng hàng, `voucherCode` tùy chọn, `receiveMethod` | Tính giá server; mỗi dòng trả `valid`, `reason`, `unitPrice`, `priceChanged`; tổng gồm `subtotal`, `discount`, `deliveryFee`, `total`. Dòng hàng đơn theo mục 5.1 dùng `productId`, `kind`, `name`, `imageId`, `basePrice`, `salePrice`, `config`, `variant`, `surcharges`, `unitPrice`, `qty`, `lineTotal`; body chi tiết của quote cần BE/FE chốt. |
| POST | `/vouchers/validate` | Public | Body: mã voucher; trường bổ sung cần chốt | Kiểm tra mã khi nhập; dùng chung logic với quote. |

### 4.3 Khung giờ và cấu hình công khai

| Method | Endpoint | Actor | Request đã xác định trong 5.2 | Kết quả / lưu ý |
|---|---|---|---|---|
| GET | `/time-slots?date=` | Public | Query: `date` | Trả khung giờ và trạng thái `open` / `full` / `closed`; chỉ trong cửa sổ 24 giờ đến 7 ngày theo mô tả nguồn. |
| GET | `/settings/public` | Public | Không có request bổ sung | Phí giao, chi nhánh, hotline, thời hạn QR, chính sách hoàn tiền. |

### 4.4 Đơn hàng phía khách

| Method | Endpoint | Actor | Request đã xác định trong 5.2 | Kết quả / lưu ý |
|---|---|---|---|---|
| POST | `/orders` | Public; nếu có JWT thì gắn userId | Body đơn hàng; phải có `expectedTotal`; cấu trúc đã nêu trong mục 5.1 gồm `receiver`, `receiveMethod`, `shippingAddress`/`pickupBranch`, `receiveDate`, `slotId`, `slotLabel`, `note`, `items`, tiền/voucher snapshot; schema chi tiết cần chốt | Tính lại giá, giữ slot nguyên tử, trừ lượt voucher, sinh QR đầu tiên; trả đơn và `X-Track-Token`. |
| GET | `/orders` | Buyer | Query: `group`, `status`, `from`, `to`, `page`; `group=processing/history` | Danh sách đơn của Buyer. |
| POST | `/orders/track` | Public | Body: `code`, `phone` | Tra cứu bằng mã đơn + SĐT; trả đơn và tracking token. Dùng POST để SĐT không nằm trên URL. |
| GET | `/orders/:id` | Theo dõi (Buyer chủ đơn hoặc Guest token) | Path: `id`; Buyer JWT hoặc `X-Track-Token` | Chi tiết, timeline, trạng thái yêu cầu hủy, hoàn tiền; ảnh thực tế chỉ trả khi status ≥ `done`; FE polling. |
| POST | `/orders/:id/payment/qr` | Theo dõi | Path: `id`; xác thực tracking cần chốt rõ Buyer/Guest | Tạo QR mới theo giới hạn; kiểm tra trạng thái/hạn/giữ slot; có thể trả `SLOT_UNAVAILABLE`. |
| POST | `/orders/:id/cancel` | Theo dõi | Path: `id`; body `reasonCode` | Chỉ hủy ở `pending_payment` / `pending_approval`; đơn đã thanh toán hoàn 100% và hoàn lượt voucher theo mô tả nguồn. |
| POST | `/orders/:id/cancel-request` | Theo dõi | Path: `id`; body chi tiết chưa nêu | Yêu cầu hủy ở `accepted` / `baking`; tối đa 1 yêu cầu/đơn. |
| POST | `/payments/webhook` | Hệ thống | Body: `orderCode`, `txnId`, `amount`, `status`; xác thực secret | Idempotent theo `txnId`; thanh toán muộn cho đơn cancelled ghi `latePayment`, tạo refund 100%. |

### 4.5 Đơn hàng Admin

| Method | Endpoint | Actor | Request đã xác định trong 5.2 | Kết quả / lưu ý |
|---|---|---|---|---|
| GET | `/admin/orders` | Admin | Query: `status`, `from`, `to`, `hasCancelRequest`, `refundStatus`, `q`, `page` | Danh sách; trả cờ `hasPendingCancelRequest`. |
| GET | `/admin/orders/:id` | Admin | Path: `id` | Dữ liệu pop-up chi tiết. |
| POST | `/admin/orders/:id/confirm-payment` | Admin | Path: `id`; body chưa nêu | Xác nhận thanh toán thủ công khi webhook lỗi. |
| POST | `/admin/orders/:id/accept` | Admin | Path: `id` | Chuyển `pending_approval` → `accepted`. |
| POST | `/admin/orders/:id/reject` | Admin | Path: `id`; body `reason` | Từ chối, chuyển cancelled, hoàn 100%, hoàn lượt voucher, tạo thông báo. |
| POST | `/admin/orders/:id/production-ticket` | Admin | Path: `id` | Lập phiếu một lần. |
| GET | `/admin/orders/:id/production-ticket` | Admin | Path: `id` | Xem/in phiếu; đơn hủy trả cờ `cancelled` để hiện “ĐƠN ĐÃ HỦY”. |
| PUT | `/admin/orders/:id/photos` | Admin | Path: `id`; body danh sách `photoIds` | Gắn ảnh thực tế; JPG/PNG/WebP, ≤ 5 MB. |
| PATCH | `/admin/orders/:id/status` | Admin | Path: `id`; body trạng thái đích cần chốt tên field | Chuyển bước hợp lệ: `baking`, `done`, `delivering`, `delivered`; không quay lui. `baking` cần phiếu và không có yêu cầu hủy chờ; `done` cần ≥1 ảnh. |
| POST | `/admin/orders/:id/cancel-request/decision` | Admin | Body: `decision` (`accept`/`reject`), `reason`, `cause`, `refundAmount?`, `adjustReason?` | Server đề xuất refund theo refundPolicy và trạng thái lúc gửi; nếu điều chỉnh số tiền phải có `adjustReason`. |
| POST | `/admin/orders/:id/cancel` | Admin | Body: `reason`, `cause` (`shop_fault`/`other`), `refundAmount?`, `adjustReason?` | Hủy chủ động đặc biệt. |
| POST | `/admin/orders/:id/refund/confirm` | Admin | Path: `id`; body chi tiết chưa nêu | Xác nhận đã chuyển hoàn tiền; ghi `processedAt`, người xử lý; dùng cả thanh toán muộn. |

### 4.6 Voucher, đánh giá, ảnh và thông báo

| Method | Endpoint | Actor | Request đã xác định trong 5.2 | Kết quả / lưu ý |
|---|---|---|---|---|
| GET | `/admin/vouchers` | Admin | Query chưa nêu | Danh sách voucher. |
| POST | `/admin/vouchers` | Admin | Schema voucher chưa nêu | Tạo voucher. |
| PUT | `/admin/vouchers/:id` | Admin | Path: `id`; schema cập nhật chưa nêu | Cập nhật voucher. |
| PATCH | `/admin/vouchers/:id/active` | Admin | Path: `id`; body bật/tắt cần chốt | Bật/tắt voucher. |
| DELETE | `/admin/vouchers/:id` | Admin | Path: `id` | Xóa voucher. |
| POST | `/reviews` | Buyer | Body review cần chốt; ràng buộc đơn delivered, đúng chủ đơn, chưa đánh giá sản phẩm đó | Gửi đánh giá. |
| PATCH | `/reviews/:id` | Buyer | Path: `id`; body field sửa cần chốt | Sửa trong 7 ngày; cập nhật rating và reviewCount. |
| DELETE | `/reviews/:id` | Buyer | Path: `id` | Xóa trong 7 ngày; cập nhật rating và reviewCount. |
| GET | `/admin/reviews` | Admin | Query: `status`, `productId` | Danh sách kiểm duyệt. |
| PATCH | `/admin/reviews/:id/visibility` | Admin | Path: `id`; body visibility cần chốt | Ẩn/hiện đánh giá. |
| POST | `/images` | Buyer/Admin theo purpose | `multipart/form-data`; file và `purpose` (`product`/`review`/`cake`) | Kiểm tra định dạng và ≤5 MB; product/cake chỉ Admin, review chỉ Buyer. |
| GET | `/images/:id` | Public theo purpose và quyền | Path: `id`; với ảnh cake cần Admin hoặc chủ đơn/tracking token và đơn ≥ done | Lấy ảnh từ GridFS. |
| GET | `/notifications` | Buyer | Query: `type`, `page` | Danh sách thông báo; polling. |
| GET | `/notifications/unread-count` | Buyer | Không có request bổ sung | Số thông báo chưa đọc. |
| PATCH | `/notifications/:id/read` | Buyer | Path: `id` | Đánh dấu đã đọc. |
| PATCH | `/notifications/read-all` | Buyer | Không có request bổ sung | Đánh dấu tất cả đã đọc. |

### 4.7 Quản trị sản phẩm, cấu hình và báo cáo

| Method | Endpoint | Actor | Request đã xác định trong 5.2 | Kết quả / lưu ý |
|---|---|---|---|---|
| GET | `/admin/products` | Admin | Query chưa nêu | Danh sách gồm cả sản phẩm ẩn. |
| GET | `/admin/products/:id` | Admin | Path: `id` | Chi tiết sản phẩm. |
| POST | `/admin/products` | Admin | Schema sản phẩm chưa nêu | Tạo sản phẩm. |
| PUT | `/admin/products/:id` | Admin | Path: `id`; schema sản phẩm chưa nêu | Cập nhật sản phẩm. |
| PATCH | `/admin/products/:id/status` | Admin | Path: `id`; body trạng thái cần chốt | Đổi trạng thái hiển thị. |
| DELETE | `/admin/products/:id` | Admin | Path: `id` | Xóa sản phẩm. |
| GET | `/admin/customization` | Admin | Không có request bổ sung | Xem cấu hình size, nhân, cốt, màu kem, độ ngọt, phụ phí. |
| PUT | `/admin/customization` | Admin | Schema cấu hình chưa nêu | Cập nhật tùy chọn. |
| GET | `/admin/time-slots` | Admin | Query: `date` | Xem khung giờ. |
| PUT | `/admin/time-slots/:id` | Admin | Path: `id`; body sức chứa/đóng khung cần chốt | Đổi sức chứa, đóng khung. |
| GET | `/admin/settings` | Admin | Không có request bổ sung | Xem cấu hình hệ thống. |
| PUT | `/admin/settings` | Admin | Schema settings chưa nêu | Cập nhật cấu hình hệ thống. |
| GET | `/admin/reports/overview` | Admin | Query: `from`, `to` | Doanh thu, số đơn theo trạng thái. |
| GET | `/admin/reports/slots` | Admin | Query chưa nêu | Năng suất theo khung giờ. |
| GET | `/admin/reports/trends` | Admin | Query chưa nêu | Xu hướng nhân/màu kem/mẫu bán chạy. |
| GET | `/admin/users` | Admin | Query chưa nêu | Xem tài khoản. |
| PATCH | `/admin/users/:id/lock` | Admin | Path: `id`; body khóa/mở khóa cần chốt | Khóa/mở khóa tài khoản. |

### 4.8 Nội dung công khai và yêu cầu thiết kế

| Method | Endpoint | Actor | Request đã xác định trong 5.2 | Kết quả / lưu ý |
|---|---|---|---|---|
| GET | `/posts` | Public | Query: `q`, `tag`, `page` | Danh sách bài viết. |
| GET | `/posts/:id` | Public | Path: `id` | Chi tiết bài viết kèm bài liên quan. |
| GET | `/faqs` | Public | Query: `q` | Danh sách FAQ. |
| POST | `/custom-requests` | Public | Schema yêu cầu thiết kế chưa nêu | Gửi yêu cầu thiết kế bánh riêng. |

## 5. Kiểm tra khớp với tài liệu CSDL mục 5.1

Các điểm đã chuẩn hóa theo tài liệu nguồn:
- Không có collection `carts`; giỏ hàng nằm trên thiết bị/client. Không bổ sung API cart.
- Hồ sơ người dùng dùng trường `birthday` (không dùng `dateOfBirth`).
- Địa chỉ nhúng dùng `street`, `ward`, `district`, `city` (giá trị TP.HCM), `recipientName`, `phone`, `isDefault`; không đổi tên thành `province`/`streetAddress`.
- Sản phẩm dùng `basePrice`, `salePrice`, `status` (`visible`/`hidden`), `imageIds`; không dùng một trường `price`/`visible` thay thế trong schema chuẩn.
- Dòng hàng đơn dùng `qty` và `config`; đơn dùng `receiver` và `slotId`. Các ví dụ Postman được chỉnh các tên trường đã được mục 5.1 xác định.
- Mock response sản phẩm được chỉnh về các trường CSDL đã mô tả. Envelope thành công vẫn chỉ là ví dụ vì mục 5.2 chưa quy định.

Lưu ý: mục 5.1–5.2 không mô tả đầy đủ mọi request/response. Các giá trị ví dụ còn lại trong Postman chỉ là dữ liệu minh họa, không được xem là schema đã được phê duyệt.

## 6. Các điểm BE/FE phải chốt trước khi xem Contract là Final


- [ ] Success envelope: có dùng `{success, data, message}` không?
- [ ] Quy ước HTTP status cho từng nhóm thành công/lỗi.
- [ ] Schema request/response chi tiết cho address, product, customization, order item/order create, voucher, review, notification, settings, report (không có collection/API cart theo mục 5.1–5.2).
- [ ] Enum hợp lệ cho `kind`, `occasion`, `filling`, `sort`, `receiveMethod`, `state`, `group`, `status`, `reasonCode`, `decision`, `cause`, `purpose`.
- [ ] Quy tắc xác thực cho endpoint “Theo dõi”: Buyer JWT hay Guest `X-Track-Token`, và ưu tiên khi có cả hai.
- [ ] Tên header/kiểu xác thực webhook.
- [ ] Cấu trúc response và cách trả tracking token của `POST /orders` và `POST /orders/track`.
- [ ] Tên field trạng thái đích của `PATCH /admin/orders/:id/status`.
- [ ] Tên field upload file và response của `POST /images`.
- [ ] Các lỗi nghiệp vụ áp dụng cho endpoint nào, HTTP status tương ứng.
- [ ] CORS, giới hạn polling, timeout, pagination mặc định/tối đa.
- [ ] Cách xử lý xóa sản phẩm/voucher đã được đơn hàng tham chiếu.

## 7. Tác vụ nền (không phải API FE gọi)

Job chạy mỗi phút theo mục 5.2:
- QR hiện tại hết hạn nhưng đơn còn lượt tạo lại: `slotHeld = false`, giảm `used` ở `timeSlots`.
- Đơn quá `payment.deadlineAt` hoặc QR cuối hết hạn: chuyển `cancelled` (by `system`), giải phóng slot nếu còn giữ, hoàn lượt voucher.
- Hoàn lượt voucher phải kiểm tra `voucher.restored` để tránh hoàn hai lần.

## 8. Tiêu chí nghiệm thu D1

- Tất cả endpoint mục 5.2 xuất hiện trong Contract và được tách riêng khi một dòng có nhiều endpoint.
- Mỗi endpoint có method, URL, actor, auth, request/query/path, response mẫu hoặc ghi rõ phần chưa chốt, lỗi liên quan.
- Postman Collection có request cho toàn bộ endpoint.
- Environment import được và không chứa token/secret thật.
- Mock data khớp với response contract đã được BE/FE xác nhận.
- FE có thể dùng mock để phát triển và chuyển sang API thật bằng cách đổi base URL/cấu hình.
- BE và FE xác nhận phiên bản Contract trước khi tích hợp.

