'use strict';

/**
 * Lỗi nghiệp vụ có mã. errorHandler chỉ trả {code, message} ra ngoài (D1 mục 2.3);
 * `details` chỉ dùng nội bộ (log, test).
 */
class AppError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = AppError;
