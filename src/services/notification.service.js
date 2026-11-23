const mongoose = require("mongoose");
const Notification = require("../models/notifications");

/** Tạo lỗi có mã HTTP để errorHandler trả đúng status. */
function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/** Lấy toàn bộ thông báo của một khách hàng, mới nhất trước. */
async function listByUser(userId) {
  return Notification.find({ userId }).sort({ createdAt: -1 }).lean();
}

/** Đánh dấu một thông báo đã đọc (chỉ thông báo thuộc về chính khách hàng đó). */
async function markAsRead(userId, notificationId) {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw httpError(400, "Mã thông báo không hợp lệ");
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { read: true } },
    { new: true }
  ).lean();

  if (!notification) {
    throw httpError(404, "Không tìm thấy thông báo");
  }

  return notification;
}

/** Đánh dấu tất cả thông báo chưa đọc của khách hàng là đã đọc. */
async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { userId, read: false },
    { $set: { read: true } }
  );

  return { modifiedCount: result.modifiedCount };
}

module.exports = { listByUser, markAsRead, markAllAsRead };
