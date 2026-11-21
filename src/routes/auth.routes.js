
const express = require("express");
const router = express.Router();

const {
  register,
  login,
  me,
  forgotPassword,
  verifyResetOtp,
  resetPasswordController,
} = require("../controllers/auth.controller");

const { auth } = require("../middlewares/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, me);

// Quên mật khẩu - yêu cầu OTP
router.post("/forgot-password", forgotPassword);

// Xác minh OTP quên mật khẩu
router.post("/verify-reset-otp", verifyResetOtp);

// Đặt lại mật khẩu
router.post("/reset-password", resetPasswordController);

module.exports = router;
