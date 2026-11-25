
const mongoose = require("mongoose");
const { Notification } = require("../models");
const {
  successResponse,
  errorResponse,
} = require("../utils/response");

// GET /notifications
// Khách xem thông báo chung; người đăng nhập xem thông báo chung + riêng
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    const filter = userId
      ? { $or: [{ userId: null }, { userId }] }
      : { userId: null };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(
      res,
      { notifications },
      "Lấy danh sách thông báo thành công"
    );
  } catch (error) {
    next(error);
  }
};

// GET /notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    // Khách không có thông báo riêng để đếm
    if (!userId) {
      return successResponse(
        res,
        { unreadCount: 0 },
        "Lấy số thông báo chưa đọc thành công"
      );
    }

    const count = await Notification.countDocuments({
      userId,
      read: false,
    });

    return successResponse(
      res,
      { unreadCount: count },
      "Lấy số thông báo chưa đọc thành công"
    );
  } catch (error) {
    next(error);
  }
};

// PATCH /notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return errorResponse(res, "Vui lòng đăng nhập", 401);
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "ID thông báo không hợp lệ", 400);
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId,
      },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, "Không tìm thấy thông báo", 404);
    }

    return successResponse(
      res,
      { notification },
      "Đánh dấu thông báo đã đọc thành công"
    );
  } catch (error) {
    next(error);
  }
};

// PATCH /notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return errorResponse(res, "Vui lòng đăng nhập", 401);
    }

    const result = await Notification.updateMany(
      {
        userId,
        read: false,
      },
      { $set: { read: true } }
    );

    return successResponse(
      res,
      { modifiedCount: result.modifiedCount },
      "Đánh dấu tất cả thông báo đã đọc thành công"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
