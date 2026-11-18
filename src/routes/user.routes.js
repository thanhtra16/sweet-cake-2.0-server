
const express = require("express");
const router = express.Router();

const {
  getMe,
  updateMe,
  changePassword,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/user.controller");

const { auth } = require("../middlewares/auth");

// Tất cả API trong file này yêu cầu đăng nhập
router.use(auth);

// Thông tin cá nhân
router.get("/me", getMe);
router.patch("/me", updateMe);

// Đổi mật khẩu
router.put("/me/password", changePassword);

// Sổ địa chỉ
router.get("/me/addresses", getAddresses);
router.post("/me/addresses", createAddress);
router.patch("/me/addresses/:addressId", updateAddress);
router.delete("/me/addresses/:addressId", deleteAddress);

module.exports = router;
