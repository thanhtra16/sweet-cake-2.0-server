const notificationService = require("../services/notification.service");
const { errorResponse } = require("../utils/response");

/** Lỗi nghiệp vụ có statusCode (400/404...) thì trả theo định dạng chung, còn lại chuyển cho errorHandler. */
function handleError(error, res, next) {
  if (error.statusCode) {
    return errorResponse(res, error.message, error.statusCode);
  }
  return next(error);
}

/** req.user do middleware auth gắn vào (document User). */
function getUserId(req) {
  return req.user._id;
}

// GET /api/notifications
async function getMyNotifications(req, res, next) {
  try {
    const notifications = await notificationService.listByUser(getUserId(req));

    res.json({
      success: true,
      message: "Lấy danh sách thông báo thành công",
      data: { notifications },
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// PATCH /api/notifications/:id/read
async function markNotificationAsRead(req, res, next) {
  try {
    const notification = await notificationService.markAsRead(
      getUserId(req),
      req.params.id
    );

    res.json({
      success: true,
      message: "Đã đánh dấu thông báo là đã đọc",
      data: { notification },
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// PATCH /api/notifications/read-all
async function markAllNotificationsAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(getUserId(req));

    res.json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
