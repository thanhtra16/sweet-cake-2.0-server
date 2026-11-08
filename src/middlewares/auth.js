const { User } = require("../models");
const { verifyToken } = require("../utils/jwt");
const { errorResponse } = require("../utils/response");

const auth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return errorResponse(res, "Chưa đăng nhập", 401);

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return errorResponse(res, "Token không hợp lệ hoặc đã hết hạn", 401);
  }

  const user = await User.findById(payload.id);
  if (!user) return errorResponse(res, "Phiên đăng nhập không hợp lệ", 401);
  if (user.isLocked) return errorResponse(res, "Tài khoản đã bị khóa", 403);

  // Token cấp trước khi đổi mật khẩu thì không còn hiệu lực
  if (
    user.passwordChangedAt &&
    payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
  ) {
    return errorResponse(res, "Phiên đăng nhập đã hết hạn", 401);
  }

  req.user = user;
  next();
};

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, "Không đủ quyền truy cập", 403);
    }
    next();
  };

module.exports = { auth, requireRole };