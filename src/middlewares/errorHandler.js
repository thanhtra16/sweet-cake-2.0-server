// Middleware này xử lý lỗi chung của toàn bộ Backend.
const { errorResponse } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  return errorResponse(
    res,
    err.message || "Internal Server Error",
    statusCode
  );
};

module.exports = errorHandler;