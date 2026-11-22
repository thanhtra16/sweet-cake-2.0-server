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

// Quên mật khẩu: yêu cầu OTP -> xác minh OTP -> đặt lại mật khẩu
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPasswordController);

module.exports = router;