const AppError = require("../utils/AppError");

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError(403, "FORBIDDEN", "Yêu cầu quyền quản trị viên (Admin)."));
  }
  next();
}

module.exports = { requireAdmin };