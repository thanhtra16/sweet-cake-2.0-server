
const multer = require("multer");
const { errorResponse } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  // Xử lý lỗi Multer
  if (err instanceof multer.MulterError) {
    let message = "Lỗi khi tải ảnh lên";

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Ảnh vượt quá dung lượng cho phép (5MB)";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Số lượng ảnh tải lên vượt quá giới hạn";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Trường ảnh không hợp lệ hoặc vượt quá số lượng cho phép";
    }

    return errorResponse(res, message, 400);
  }

  // Xử lý lỗi định dạng ảnh
  if (err.message === "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP") {
    return errorResponse(res, err.message, 400);
  }

  // Xử lý lỗi nghiệp vụ AppError và lỗi hệ thống
  const statusCode = err.status || err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    code: err.code || "INTERNAL_SERVER_ERROR",
    message: err.message || "Internal Server Error",
    errors: err.details || null,
  });
};

module.exports = errorHandler;
