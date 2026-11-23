/**
 * Lỗi nghiệp vụ có mã HTTP + `handle()` bọc controller async.
 * Dùng độc lập, không phụ thuộc errorHandler có sẵn.
 */
class HttpError extends Error {
  constructor(status, message, code, extra) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
        code: err.code,
        ...(err.extra || {}),
      });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: 'Có lỗi xảy ra, vui lòng thử lại sau.' });
  }
};

module.exports = { HttpError, handle };
