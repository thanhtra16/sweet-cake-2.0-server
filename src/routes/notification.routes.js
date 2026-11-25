
const express = require("express");
const router = express.Router();

const { auth, optionalAuth } = require("../middlewares/auth");

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notification.controller");

// Khách và người đăng nhập đều được xem thông báo
router.get("/", optionalAuth, getNotifications);

// Các thao tác bên dưới bắt buộc đăng nhập
router.get("/unread-count", auth, getUnreadCount);
router.patch("/read-all", auth, markAllAsRead);
router.patch("/:id/read", auth, markAsRead);

module.exports = router;
