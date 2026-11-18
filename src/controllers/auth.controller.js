const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { signToken } = require("../utils/jwt");
const { successResponse, errorResponse } = require("../utils/response");

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
  const { fullName, phone, email, birthday, password } = req.body || {};

  const errors = {};
  if (!fullName?.trim()) errors.fullName = "Vui lòng nhập họ tên";
  if (!PHONE_REGEX.test(phone || "")) errors.phone = "Số điện thoại không hợp lệ";
  if (!password || password.length < 6) errors.password = "Mật khẩu tối thiểu 6 ký tự";
  if (Object.keys(errors).length) {
    return errorResponse(res, "Dữ liệu không hợp lệ", 400, errors);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  let user = await User.findOne({ phone }).select("+passwordHash");

  if (user) {
    if (user.passwordHash) {
      return errorResponse(res, "Số điện thoại đã được đăng ký", 409);
    }
    // Nhận lại tài khoản guest_checkout. TODO: yêu cầu OTP (OTPCode) trước bước này
    user.fullName = fullName;
    user.email = email || user.email;
    user.birthday = birthday || user.birthday;
    user.passwordHash = passwordHash;
    user.passwordChangedAt = new Date();
    user.origin = "register";
    await user.save();
  } else {
    try {
      user = await User.create({ fullName, phone, email, birthday, passwordHash });
    } catch (err) {
      if (err.code === 11000) {
        return errorResponse(res, "Số điện thoại đã được đăng ký", 409);
      }
      throw err;
    }
  }

  return successResponse(
    res,
    { token: signToken(user), user: publicUser(user) },
    "Đăng ký thành công",
    201
  );
};

const login = async (req, res) => {
  const { phone, password } = req.body || {};
  const user = await User.findOne({ phone }).select("+passwordHash");

  // Thông báo chung, không lộ SĐT có tồn tại hay không
  const invalid = () =>
    errorResponse(res, "Số điện thoại hoặc mật khẩu không đúng", 401);

  if (!user || !user.passwordHash) return invalid();
  if (!(await bcrypt.compare(password || "", user.passwordHash))) return invalid();
  if (user.isLocked) return errorResponse(res, "Tài khoản đã bị khóa", 403);

  return successResponse(
    res,
    { token: signToken(user), user: publicUser(user) },
    "Đăng nhập thành công"
  );
};

const me = (req, res) => successResponse(res, { user: publicUser(req.user) });

module.exports = { register, login, me };