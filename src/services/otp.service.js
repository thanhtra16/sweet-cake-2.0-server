
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { User, OTPCode } = require("../models");

const OTP_EXPIRES_MINUTES = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

// hàm tạo hash cho reset token
const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// Sinh OTP ngẫu nhiên gồm đúng 6 chữ số
const generateOTP = () => {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
};

// Yêu cầu tạo OTP để đặt lại mật khẩu
const requestPasswordReset = async (phone) => {
  // Chỉ xử lý tài khoản đã đăng ký và có mật khẩu
  const user = await User.findOne({ phone }).select("+passwordHash");

  // Không tiết lộ số điện thoại có tồn tại hay không
  if (!user || !user.passwordHash) {
    return { accepted: true };
  }

  const now = new Date();

  // Kiểm tra thời gian chờ trước khi gửi lại OTP
  const previousOTP = await OTPCode.findOne({
    phone,
    purpose: "password_reset",
    used: false,
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });

  if (previousOTP) {
    const elapsedSeconds =
      (now.getTime() - previousOTP.createdAt.getTime()) / 1000;

    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      return { accepted: true };
    }
  }
  // Vô hiệu hóa các OTP cũ của số điện thoại này
  await OTPCode.updateMany(
    {
      phone,
      purpose: "password_reset",
      used: false,
    },
    {
      $set: {
        used: true,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    }
  );

  // Sinh OTP và mã hóa trước khi lưu
  const otp = generateOTP();
  const codeHash = await bcrypt.hash(otp, 10);

  await OTPCode.create({
    phone,
    purpose: "password_reset",
    codeHash,
    expiresAt: new Date(
      Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000
    ),
  });

  // Chỉ hiển thị OTP trong môi trường development
  if (process.env.NODE_ENV === "development") {
    console.log("-----------------------------------");
    console.log(`[DEV OTP] Số điện thoại: ${phone}`);
    console.log(`[DEV OTP] Mã OTP: ${otp}`);
    console.log(`[DEV OTP] Hết hạn sau: ${OTP_EXPIRES_MINUTES} phút`);
    console.log("-----------------------------------");
  }

  return { accepted: true };
};

// hàm verifyResetOTP
const verifyResetOTP = async (phone, otp) => {
  const now = new Date();

  // Tìm OTP còn hạn và chưa sử dụng
  const otpRecord = await OTPCode.findOne({
    phone,
    purpose: "password_reset",
    used: false,
    expiresAt: { $gt: now },
  })
    .select("+codeHash")
    .sort({ createdAt: -1 });

  if (!otpRecord) {
    const error = new Error("OTP không hợp lệ hoặc đã hết hạn");
    error.statusCode = 400;
    throw error;
  }

  // Giới hạn tối đa 5 lần nhập sai
  if (otpRecord.attempts >= 5) {
    otpRecord.used = true;
    await otpRecord.save();

    const error = new Error("Bạn đã nhập sai OTP quá 5 lần");
    error.statusCode = 429;
    throw error;
  }

  // So sánh OTP nhập vào với OTP đã mã hóa
  const isMatch = await bcrypt.compare(otp, otpRecord.codeHash);

  if (!isMatch) {
    otpRecord.attempts += 1;

    if (otpRecord.attempts >= 5) {
      otpRecord.used = true;
    }

    await otpRecord.save();

    const error = new Error(
      otpRecord.used
        ? "Bạn đã nhập sai OTP quá 5 lần"
        : "OTP không chính xác"
    );

    error.statusCode = otpRecord.used ? 429 : 400;
    throw error;
  }

  // Sinh reset token ngẫu nhiên
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Lưu hash của reset token, không lưu token gốc
  otpRecord.used = true;
  otpRecord.resetTokenHash = hashResetToken(resetToken);
  otpRecord.resetTokenExpiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  );

  await otpRecord.save();

  return { resetToken };
};

// Hàm đặt lại mật khẩu bằng reset token

// Đặt lại mật khẩu sau khi xác minh OTP thành công
const resetPassword = async (
  phone,
  resetToken,
  newPassword
) => {
  // Tìm reset token còn hạn
  const otpRecord = await OTPCode.findOne({
    phone,
    purpose: "password_reset",
    used: true,
    resetTokenExpiresAt: { $gt: new Date() },
  }).select("+resetTokenHash");

  if (!otpRecord || !otpRecord.resetTokenHash) {
    const error = new Error("Reset token không hợp lệ hoặc đã hết hạn");
    error.statusCode = 400;
    throw error;
  }

  // So sánh reset token nhận được với hash đã lưu
  const inputTokenHash = hashResetToken(resetToken);

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(inputTokenHash, "hex"),
    Buffer.from(otpRecord.resetTokenHash, "hex")
  );

  if (!isMatch) {
    const error = new Error("Reset token không chính xác");
    error.statusCode = 400;
    throw error;
  }

  // Tìm tài khoản và cập nhật mật khẩu
  const user = await User.findOne({ phone }).select("+passwordHash");

  if (!user) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  await user.save();

  // Xóa reset token để không thể sử dụng lại
  otpRecord.resetTokenHash = null;
  otpRecord.resetTokenExpiresAt = null;
  await otpRecord.save();

  return { success: true };
};


module.exports = {
  requestPasswordReset,
  verifyResetOTP,
  resetPassword,
};
