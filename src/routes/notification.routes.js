
const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notification.controller");

// Tất cả API thông báo đều yêu cầu đăng nhập
router.use(auth);

// Lấy danh sách thông báo
router.get("/", getNotifications);

// Đếm thông báo chưa đọc
router.get("/unread-count", getUnreadCount);

// Đánh dấu tất cả đã đọc
router.patch("/read-all", markAllAsRead);

// Đánh dấu một thông báo đã đọc
router.patch("/:id/read", markAsRead);

