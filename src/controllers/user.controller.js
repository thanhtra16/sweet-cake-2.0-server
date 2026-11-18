
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { User } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

// Chỉ trả về thông tin được phép công khai
const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  phone: user.phone,
  email: user.email,
  birthday: user.birthday,
  role: user.role,
  addresses: user.addresses,
});

// GET /api/users/me
// Lấy thông tin tài khoản đang đăng nhập
const getMe = async (req, res) => {
  return successResponse(
    res,
    { user: publicUser(req.user) },
    "Lấy thông tin tài khoản thành công"
  );
};

// PATCH /api/users/me
// Cập nhật thông tin cá nhân
const updateMe = async (req, res) => {
  const { fullName, email, birthday } = req.body || {};

  // Không cho phép tự sửa các trường nhạy cảm
  const allowedFields = ["fullName", "email", "birthday"];
  const invalidFields = Object.keys(req.body || {}).filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return errorResponse(
      res,
      "Có trường thông tin không được phép cập nhật",
      400,
      { invalidFields }
    );
  }

  if (fullName !== undefined) {
    if (typeof fullName !== "string" || !fullName.trim()) {
      return errorResponse(res, "Họ tên không hợp lệ", 400);
    }
    req.user.fullName = fullName.trim();
  }

  if (email !== undefined) {
    req.user.email = email?.trim().toLowerCase() || null;
  }

  if (birthday !== undefined) {
    const date = birthday ? new Date(birthday) : null;

    if (date && Number.isNaN(date.getTime())) {
      return errorResponse(res, "Ngày sinh không hợp lệ", 400);
    }

    req.user.birthday = date;
  }

  await req.user.save();

  return successResponse(
    res,
    { user: publicUser(req.user) },
    "Cập nhật thông tin tài khoản thành công"
  );
};

// PUT /api/users/me/password
// Đổi mật khẩu
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return errorResponse(
      res,
      "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới",
      400
    );
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return errorResponse(
      res,
      "Mật khẩu mới phải có ít nhất 6 ký tự",
      400
    );
  }

  // Lấy passwordHash vì Model đang đặt select: false
  const user = await User.findById(req.user._id).select("+passwordHash");

  if (!user || !user.passwordHash) {
    return errorResponse(res, "Tài khoản không có mật khẩu", 400);
  }

  const isCorrect = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!isCorrect) {
    return errorResponse(res, "Mật khẩu hiện tại không chính xác", 400);
  }

  const isSamePassword = await bcrypt.compare(
    newPassword,
    user.passwordHash
  );

  if (isSamePassword) {
    return errorResponse(
      res,
      "Mật khẩu mới không được trùng mật khẩu hiện tại",
      400
    );
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();

  await user.save();

  return successResponse(
    res,
    null,
    "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
  );
};

// Kiểm tra dữ liệu địa chỉ
const validateAddress = (data) => {
  const requiredFields = [
    "recipientName",
    "phone",
    "street",
    "ward",
    "district",
  ];

  for (const field of requiredFields) {
    if (
      typeof data[field] !== "string" ||
      !data[field].trim()
    ) {
      return `Trường ${field} không được để trống`;
    }
  }

  if (data.city !== undefined && data.city !== "TP.HCM") {
    return "Sweet Cake hiện chỉ hỗ trợ địa chỉ tại TP.HCM";
  }

  if (!/^(0|\+84)\d{9}$/.test(data.phone)) {
    return "Số điện thoại người nhận không hợp lệ";
  }

  return null;
};

// GET /api/users/me/addresses
const getAddresses = async (req, res) => {
  return successResponse(
    res,
    { addresses: req.user.addresses },
    "Lấy danh sách địa chỉ thành công"
  );
};

// POST /api/users/me/addresses
const createAddress = async (req, res) => {
  const data = req.body || {};
  const validationError = validateAddress(data);

  if (validationError) {
    return errorResponse(res, validationError, 400);
  }

  const isDefault = Boolean(data.isDefault);

  // Nếu địa chỉ mới là mặc định, bỏ mặc định của địa chỉ cũ
  if (isDefault) {
    req.user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  // Nếu đây là địa chỉ đầu tiên, tự động đặt làm mặc định
  const shouldBeDefault =
    isDefault || req.user.addresses.length === 0;

  req.user.addresses.push({
    recipientName: data.recipientName.trim(),
    phone: data.phone.trim(),
    street: data.street.trim(),
    ward: data.ward.trim(),
    district: data.district.trim(),
    city: "TP.HCM",
    isDefault: shouldBeDefault,
  });

  await req.user.save();

  return successResponse(
    res,
    { addresses: req.user.addresses },
    "Thêm địa chỉ thành công",
    201
  );
};

// PATCH /api/users/me/addresses/:addressId
const updateAddress = async (req, res) => {
  const { addressId } = req.params;
  const data = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    return errorResponse(res, "ID địa chỉ không hợp lệ", 400);
  }

  const address = req.user.addresses.id(addressId);

  if (!address) {
    return errorResponse(res, "Không tìm thấy địa chỉ", 404);
  }

  const allowedFields = [
    "recipientName",
    "phone",
    "street",
    "ward",
    "district",
    "city",
    "isDefault",
  ];

  const invalidFields = Object.keys(data).filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return errorResponse(
      res,
      "Có trường địa chỉ không được phép cập nhật",
      400,
      { invalidFields }
    );
  }

  const mergedData = {
    recipientName: data.recipientName ?? address.recipientName,
    phone: data.phone ?? address.phone,
    street: data.street ?? address.street,
    ward: data.ward ?? address.ward,
    district: data.district ?? address.district,
    city: data.city ?? address.city,
  };

  const validationError = validateAddress(mergedData);

  if (validationError) {
    return errorResponse(res, validationError, 400);
  }

  if (data.isDefault === true) {
    req.user.addresses.forEach((item) => {
      item.isDefault = false;
    });
  }

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      address[field] = data[field];
    }
  }

  address.city = "TP.HCM";

  await req.user.save();

  return successResponse(
    res,
    { addresses: req.user.addresses },
    "Cập nhật địa chỉ thành công"
  );
};

// DELETE /api/users/me/addresses/:addressId
const deleteAddress = async (req, res) => {
  const { addressId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    return errorResponse(res, "ID địa chỉ không hợp lệ", 400);
  }

  const address = req.user.addresses.id(addressId);

  if (!address) {
    return errorResponse(res, "Không tìm thấy địa chỉ", 404);
  }

  const wasDefault = address.isDefault;

  address.deleteOne();

  // Nếu xóa địa chỉ mặc định, chọn địa chỉ đầu tiên còn lại
  if (wasDefault && req.user.addresses.length > 0) {
    req.user.addresses[0].isDefault = true;
  }

  await req.user.save();

  return successResponse(
    res,
    { addresses: req.user.addresses },
    "Xóa địa chỉ thành công"
  );
};

module.exports = {
  getMe,
  updateMe,
  changePassword,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
