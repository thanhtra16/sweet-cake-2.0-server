
const express = require("express");
const router = express.Router();

const { auth, requireRole } = require("../middlewares/auth");

const {
  getUsers,
  getUserById,
  lockUser,
  unlockUser,
} = require("../controllers/admin.controller");

// Tất cả API bên dưới đều yêu cầu đăng nhập với quyền Admin
router.use(auth, requireRole("admin"));

// Lấy danh sách khách hàng
router.get("/users", getUsers);

// Xem chi tiết khách hàng
router.get("/users/:id", getUserById);

// Khóa tài khoản khách hàng
router.patch("/users/:id/lock", lockUser);

// Mở khóa tài khoản khách hàng
router.patch("/users/:id/unlock", unlockUser);

module.exports = router;
