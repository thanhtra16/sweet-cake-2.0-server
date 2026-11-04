# SWEET CAKE 2.0 – SERVER

## 1. Giới thiệu

Đây là repository chứa mã nguồn xử lý phía máy chủ (Backend) của dự án **Sweet Cake 2.0 – Website bán bánh**.

- **Repository:** [sweet-cake-2.0-server](https://github.com/thanhtra16/sweet-cake-2.0-server)
- **Công nghệ:** Node.js, Express.js, MongoDB.
- **Vai trò:** Xây dựng API, xử lý nghiệp vụ phía máy chủ và quản lý dữ liệu cho website Sweet Cake 2.0.

## 2. Yêu cầu môi trường

Các công cụ cần thiết để cài đặt và chạy dự án:

- Node.js
- npm
- MongoDB (Local hoặc MongoDB Atlas)
- Git
- Visual Studio Code (khuyến nghị)

Kiểm tra phiên bản Node.js và npm:

```bash
node -v
npm -v
```

## 3. Cài đặt dự án

**Bước 1: Clone repository**

```bash
git clone https://github.com/thanhtra16/sweet-cake-2.0-server.git
```

**Bước 2: Di chuyển vào thư mục dự án**

```bash
cd sweet-cake-2.0-server
```

**Bước 3: Cài đặt thư viện**

```bash
npm install
```

## 4. Cấu hình môi trường

Tạo file `.env` tại thư mục gốc của dự án.

Nếu repository có file `.env.example`, sao chép nội dung cấu hình bằng lệnh:

```bash
cp .env.example .env
```

Sau đó cập nhật các biến môi trường phù hợp với môi trường chạy dự án, bao gồm:

- Port chạy server.
- MongoDB connection string.
- JWT secret.
- API key hoặc thông tin cấu hình dịch vụ bên thứ ba (nếu có).

**Lưu ý:**

- Không commit file `.env` thật lên GitHub.
- Không công khai mật khẩu database, JWT secret, API key hoặc token.
- Đảm bảo file `.env` được khai báo trong `.gitignore`.

## 5. Chạy dự án

Khởi chạy server bằng lệnh sau nếu dự án đã khai báo script `dev` trong `package.json`:

```bash
npm run dev
```

Hoặc sử dụng script chạy tương ứng được khai báo trong `package.json`.

Địa chỉ server mặc định dự kiến:

```text
http://localhost:3000
```

*Lưu ý: Port thực tế phụ thuộc vào cấu hình của dự án.*

## 6. Quy ước làm việc với Git

### 6.1. Quy ước đặt tên nhánh (Branch Naming)

Nhóm sử dụng các nhánh với mục đích như sau:

- `main`: Chứa phiên bản ổn định của dự án.
- `dev`: Nhánh tích hợp code.
- `feature/ten-chuc-nang`: Phát triển chức năng mới.
- `fix/ten-loi`: Sửa lỗi trong dự án.
- `docs/ten-tai-lieu`: Cập nhật tài liệu.

**Ví dụ:**

```text
feature/dang-nhap-jwt
feature/api-san-pham
feature/api-don-hang
feature/api-thanh-toan
fix/kiem-tra-don-hang
docs/cap-nhat-readme
```

### 6.2. Quy ước Commit Message

Nhóm sử dụng quy ước **Conventional Commits** để thống nhất nội dung commit.

**Cấu trúc:**

```text
type(scope): description
```

**Các loại commit:**

- `feat`: Thêm chức năng mới.

  Ví dụ: `feat(auth): them API dang nhap`

- `fix`: Sửa lỗi.

  Ví dụ: `fix(order): sua loi kiem tra don hang`

- `docs`: Cập nhật tài liệu.

  Ví dụ: `docs(readme): cap nhat huong dan cai dat`

- `style`: Chỉnh sửa định dạng code.

  Ví dụ: `style(auth): dinh dang lai code dang nhap`

- `refactor`: Tái cấu trúc mã nguồn.

  Ví dụ: `refactor(order): toi uu xu ly don hang`

- `test`: Thêm hoặc sửa kiểm thử.

  Ví dụ: `test(product): them kiem thu API san pham`

- `chore`: Cấu hình hoặc bảo trì dự án.

  Ví dụ: `chore(deps): cap nhat thu vien du an`

**Ví dụ commit trong dự án Sweet Cake 2.0:**

```text
feat(auth): them API dang nhap
feat(user): them API cap nhat thong tin nguoi dung
feat(product): them API quan ly san pham
feat(order): them chuc nang tao don hang
feat(payment): them chuc nang thanh toan
fix(order): sua loi huy don hang
test(product): them kiem thu API san pham
docs(readme): cap nhat huong dan cai dat
```

**Quy định:**

- Mỗi commit phải mô tả đúng nội dung thay đổi.
- Ưu tiên sử dụng tiếng Việt không dấu trong phần mô tả commit.
- Không sử dụng nội dung chung chung như `update`, `test`, `fix bug`, `code`.
- Không gộp các thay đổi không liên quan vào cùng một commit.

### 6.3. Quy trình Pull Request

Các thành viên thực hiện Pull Request để tích hợp code vào nhánh `dev`.

**Quy trình thực hiện:**

1. Cập nhật code mới nhất từ nhánh `dev`.
2. Tạo nhánh chức năng mới từ `dev`.
3. Phát triển chức năng và kiểm tra code.
4. Commit các thay đổi theo đúng quy ước.
5. Push nhánh chức năng lên GitHub.
6. Tạo Pull Request từ nhánh chức năng vào `dev`.
7. Kiểm tra lại nội dung thay đổi và mô tả Pull Request.
8. Tiến hành merge sau khi hoàn tất kiểm tra.

**Quy định:**

- Không push trực tiếp lên nhánh `main` hoặc `dev`.
- Kiểm tra code trước khi tạo Pull Request.
- Đảm bảo các thay đổi hoạt động đúng trước khi merge.

### 6.4. Ví dụ quy trình làm việc

Ví dụ: Phát triển chức năng đăng nhập bằng JWT.

**Bước 1: Chuyển sang nhánh dev và cập nhật code mới nhất**

```bash
git checkout dev
git pull origin dev
```

**Bước 2: Tạo nhánh chức năng**

```bash
git checkout -b feature/dang-nhap-jwt
```

**Bước 3: Thực hiện code và commit**

```bash
git add .
git commit -m "feat(auth): them API dang nhap"
```

**Bước 4: Push nhánh lên GitHub**

```bash
git push -u origin feature/dang-nhap-jwt
```

**Bước 5: Tạo Pull Request trên GitHub**

- **Base:** `dev`
- **Compare:** `feature/dang-nhap-jwt`

Sau khi kiểm tra các thay đổi, tiến hành merge Pull Request vào nhánh `dev`.

## 7. Quy tắc chung

- Không đưa file `.env` thật lên GitHub.
- Không commit thư mục `node_modules`.
- Không công khai mật khẩu database, JWT secret, API key hoặc token.
- Kiểm tra API trước khi tạo Pull Request.
- Tuân thủ quy ước đặt tên branch và commit message.
- Không push trực tiếp lên nhánh `main` và `dev`.
- Cập nhật README khi có thay đổi về cách cài đặt, cấu hình hoặc chạy dự án.
- Chủ động trao đổi với các thành viên khi phát sinh xung đột trong quá trình phát triển.

---

**Sweet Cake 2.0 – Server**

*Backend source code for the Sweet Cake 2.0 project.*
