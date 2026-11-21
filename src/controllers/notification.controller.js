
const mongoose = require("mongoose");
const { Notification } = require("../models");
const {
  successResponse,
  errorResponse,
} = require("../utils/response");

// 1. GET /notifications
// Lấy danh sách thông báo của người dùng đang đăng nhập
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    return successResponse(
      res,
      { notifications },
      "Lấy danh sách thông báo thành công"
    );
  } catch (error) {
    next(error);
  }
};

// 2. GET /notifications/unread-count
// Đếm số thông báo chưa đọc
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
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

// 3. PATCH /notifications/:id/read
// Đánh dấu một thông báo đã đọc
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "ID thông báo không hợp lệ", 400);
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: req.user._id,
      },
      { read: true },
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

// 4. PATCH /notifications/read-all
// Đánh dấu tất cả thông báo đã đọc
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: req.user._id,
        read: false,
      },
      { $set: { read: true } }
    );

    return successResponse(
      res,
      {
        modifiedCount: result.modifiedCount,
      },
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