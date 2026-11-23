const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { signToken } = require("../utils/jwt");
const { successResponse, errorResponse } = require("../utils/response");
const {
  requestPasswordReset,
  verifyResetOTP,
  resetPassword,
} = require("../services/otp.service");

const PHONE_REGEX = /^(0|\+84)\d{9}$/;
const SALT_ROUNDS = 10;

const publicUser = (u) => ({
  id: u._id,
  fullName: u.fullName,
  phone: u.phone,
  email: u.email,
  birthday: u.birthday,
  role: u.role,
});

const register = async (req, res) => {
  const {
    fullName,
    phone,
    email,
    birthday,
    password,
  } = req.body || {};

  const errors = {};

  if (!fullName?.trim()) {
    errors.fullName = "Vui lòng nhập họ tên";
  }

  if (!PHONE_REGEX.test(phone || "")) {
    errors.phone = "Số điện thoại không hợp lệ";
  }

  if (!password || password.length < 6) {
    errors.password = "Mật khẩu tối thiểu 6 ký tự";
  }

  if (Object.keys(errors).length) {
    return errorResponse(
      res,
      "Dữ liệu không hợp lệ",
      400,
      errors
    );
  }

  const passwordHash = await bcrypt.hash(
    password,
    SALT_ROUNDS
  );

  let user = await User.findOne({ phone }).select(
    "+passwordHash"
  );

  if (user) {
    if (user.passwordHash) {
      return errorResponse(
        res,
        "Số điện thoại đã được đăng ký",
        409
      );
    }

    user.fullName = fullName;
    user.email = email || user.email;
    user.birthday = birthday || user.birthday;
    user.passwordHash = passwordHash;
    user.passwordChangedAt = new Date();
    user.origin = "register";

    await user.save();
  } else {
    try {
      user = await User.create({
        fullName,
        phone,
        email,
        birthday,
        passwordHash,
      });
    } catch (err) {
      if (err.code === 11000) {
        return errorResponse(
          res,
          "Số điện thoại đã được đăng ký",
          409
        );
      }

      throw err;
    }
  }

  return successResponse(
    res,
    {
      token: signToken(user),
      user: publicUser(user),
    },
    "Đăng ký thành công",
    201
  );
};

const login = async (req, res) => {
  const { phone, password } = req.body || {};

  const user = await User.findOne({ phone }).select(
    "+passwordHash"
  );

  const invalid = () =>
    errorResponse(
      res,
      "Số điện thoại hoặc mật khẩu không đúng",
      401
    );

  if (!user || !user.passwordHash) {
    return invalid();
  }

  if (
    !(await bcrypt.compare(
      password || "",
      user.passwordHash
    ))
  ) {
    return invalid();
  }

  if (user.isLocked) {
    return errorResponse(
      res,
      "Tài khoản đã bị khóa",
      403
    );
  }

  return successResponse(
    res,
    {
      token: signToken(user),
      user: publicUser(user),
    },
    "Đăng nhập thành công"
  );
};

const me = (req, res) =>
  successResponse(
    res,
    { user: publicUser(req.user) }
  );

// Đổi mật khẩu khi đã đăng nhập
const changePasswordController = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body || {};

    const errors = {};

    if (!currentPassword) {
      errors.currentPassword =
        "Vui lòng nhập mật khẩu hiện tại";
    }

    if (!newPassword || newPassword.length < 6) {
      errors.newPassword =
        "Mật khẩu mới phải có ít nhất 6 ký tự";
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword =
        "Mật khẩu xác nhận không khớp";
    }

    if (
      currentPassword &&
      newPassword &&
      currentPassword === newPassword
    ) {
      errors.newPassword =
        "Mật khẩu mới phải khác mật khẩu hiện tại";
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse(
        res,
        "Dữ liệu không hợp lệ",
        400,
        errors
      );
    }

    const user = await User.findById(
      req.user._id
    ).select("+passwordHash");

    if (!user || !user.passwordHash) {
      return errorResponse(
        res,
        "Không tìm thấy thông tin tài khoản",
        404
      );
    }

    const isCurrentPasswordValid =
      await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

    if (!isCurrentPasswordValid) {
      return errorResponse(
        res,
        "Mật khẩu hiện tại không chính xác",
        400,
        {
          currentPassword:
            "Mật khẩu hiện tại không chính xác",
        }
      );
    }

    user.passwordHash = await bcrypt.hash(
      newPassword,
      SALT_ROUNDS
    );

    user.passwordChangedAt = new Date();

    await user.save();

    return successResponse(
      res,
      null,
      "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Không thể đổi mật khẩu",
      error.statusCode || 500
    );
  }
};

// Yêu cầu OTP để đặt lại mật khẩu
const forgotPassword = async (req, res, next) => {
  try {
    const { phone } = req.body || {};

    if (!PHONE_REGEX.test(phone || "")) {
      return errorResponse(
        res,
        "Số điện thoại không hợp lệ",
        400,
        {
          phone:
            "Vui lòng nhập số điện thoại hợp lệ",
        }
      );
    }

    await requestPasswordReset(phone);

    return successResponse(
      res,
      null,
      "Nếu số điện thoại đã đăng ký, mã OTP sẽ được tạo"
    );
  } catch (error) {
    next(error);
  }
};

// Xác minh OTP quên mật khẩu
const verifyResetOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body || {};

    const errors = {};

    if (!PHONE_REGEX.test(phone || "")) {
      errors.phone =
        "Số điện thoại không hợp lệ";
    }

    if (!/^\d{6}$/.test(otp || "")) {
      errors.otp =
        "OTP phải gồm đúng 6 chữ số";
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse(
        res,
        "Dữ liệu không hợp lệ",
        400,
        errors
      );
    }

    const result = await verifyResetOTP(
      phone,
      otp
    );

    return successResponse(
      res,
      result,
      "Xác minh OTP thành công"
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Không thể xác minh OTP",
      error.statusCode || 500
    );
  }
};

// Đặt lại mật khẩu sau khi xác minh OTP
const resetPasswordController = async (req, res) => {
  try {
    const {
      phone,
      resetToken,
      newPassword,
      confirmPassword,
    } = req.body || {};

    const errors = {};

    if (!PHONE_REGEX.test(phone || "")) {
      errors.phone =
        "Số điện thoại không hợp lệ";
    }

    if (
      !resetToken ||
      typeof resetToken !== "string"
    ) {
      errors.resetToken =
        "Reset token không hợp lệ";
    }

    if (!newPassword || newPassword.length < 6) {
      errors.newPassword =
        "Mật khẩu tối thiểu 6 ký tự";
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword =
        "Mật khẩu nhập lại không khớp";
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse(
        res,
        "Dữ liệu không hợp lệ",
        400,
        errors
      );
    }

    await resetPassword(
      phone,
      resetToken,
      newPassword
    );

    return successResponse(
      res,
      null,
      "Đặt lại mật khẩu thành công"
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Không thể đặt lại mật khẩu",
      error.statusCode || 500
    );
  }
};

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  verifyResetOtp,
  resetPasswordController,
  changePasswordController,
};