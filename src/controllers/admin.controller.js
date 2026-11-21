
const mongoose = require("mongoose");
const { User } = require("../models");
const {
  successResponse,
  errorResponse,
} = require("../utils/response");

// Chỉ trả về thông tin công khai của khách hàng
const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  phone: user.phone,
  email: user.email,
  birthday: user.birthday,
  role: user.role,
  isLocked: user.isLocked,
  origin: user.origin,
  createdAt: user.createdAt,
});

// 1. Lấy danh sách khách hàng
const getUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, isLocked } = req.query;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const filter = { role: "buyer" };

    if (isLocked === "true") {
      filter.isLocked = true;
    } else if (isLocked === "false") {
      filter.isLocked = false;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("fullName phone email birthday role isLocked origin createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      User.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        users: users.map(publicUser),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Lấy danh sách khách hàng thành công"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 2. Xem chi tiết khách hàng
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "ID khách hàng không hợp lệ", 400);
    }

    const user = await User.findOne({
      _id: id,
      role: "buyer",
    }).select(
      "fullName phone email birthday role isLocked origin addresses createdAt"
    );

    if (!user) {
      return errorResponse(res, "Không tìm thấy khách hàng", 404);
    }

    return successResponse(
      res,
      { user: publicUser(user) },
      "Lấy thông tin khách hàng thành công"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 3. Khóa tài khoản khách hàng
const lockUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "ID khách hàng không hợp lệ", 400);
    }

    const user = await User.findOneAndUpdate(
      { _id: id, role: "buyer" },
      { $set: { isLocked: true } },
      { new: true, runValidators: true }
    ).select(
      "fullName phone email birthday role isLocked origin createdAt"
    );

    if (!user) {
      return errorResponse(res, "Không tìm thấy khách hàng", 404);
    }

    return successResponse(
      res,
      { user: publicUser(user) },
      "Khóa tài khoản khách hàng thành công"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 4. Mở khóa tài khoản khách hàng
const unlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "ID khách hàng không hợp lệ", 400);
    }

    const user = await User.findOneAndUpdate(
      { _id: id, role: "buyer" },
      { $set: { isLocked: false } },
      { new: true, runValidators: true }
    ).select(
      "fullName phone email birthday role isLocked origin createdAt"
    );

    if (!user) {
      return errorResponse(res, "Không tìm thấy khách hàng", 404);
    }

    return successResponse(
      res,
      { user: publicUser(user) },
      "Mở khóa tài khoản khách hàng thành công"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getUsers,
  getUserById,
  lockUser,
  unlockUser,
};
