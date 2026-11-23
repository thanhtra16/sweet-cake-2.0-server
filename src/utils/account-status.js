const { HttpError } = require('./http-error');

const isLocked = (user) => Boolean(user) && user.status === 'locked';

/**
 * Gọi trong luồng đăng nhập và trong middleware auth (sau khi nạp user từ token)
 * để tài khoản bị khóa không đăng nhập / không dùng được token cũ.
 */
function assertAccountActive(user) {
  if (isLocked(user)) {
    throw new HttpError(
      403,
      'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ cửa hàng để được hỗ trợ.',
      'ACCOUNT_LOCKED'
    );
  }
}

module.exports = { isLocked, assertAccountActive };
