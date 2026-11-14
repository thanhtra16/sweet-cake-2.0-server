const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const routes = require("./routes");

const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// 1. Bảo mật HTTP headers
app.use(helmet());

// 2. Cho phép Frontend gọi API
app.use(cors());

// 3. Đọc dữ liệu JSON từ request body
app.use(express.json());

// 4. Đọc dữ liệu dạng URL encoded
app.use(express.urlencoded({ extended: true }));

// 5. Ghi log các HTTP request
app.use(morgan("dev"));

// 6. Đăng ký các API
app.use("/api", routes);

// 7. Xử lý đường dẫn không tồn tại
app.use(notFound);

// 8. Xử lý lỗi chung
app.use(errorHandler);

module.exports = app;