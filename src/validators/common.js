/**
 * Tạo middleware từ hàm `rules(req)` trả về object lỗi { field: 'thông báo' }.
 */
function validate(rules) {
  return (req, res, next) => {
    const errors = rules(req);
    if (Object.keys(errors).length > 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Dữ liệu không hợp lệ', errors });
    }
    return next();
  };
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

module.exports = { validate, str };
