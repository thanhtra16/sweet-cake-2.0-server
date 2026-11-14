// Middleware này xử lý trường hợp người dùng gọi một API không tồn tại.
const notFound = (req, res, next) => {
  const error = new Error(
    `Không tìm thấy đường dẫn: ${req.originalUrl}`
  );

  error.statusCode = 404;

  next(error);
};

module.exports = notFound;