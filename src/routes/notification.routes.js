const express = require("express");

const notificationController = require("../controllers/notification.controller");

const { auth } = require("../middlewares/auth");

const router = express.Router();

// Mọi API thông báo đều yêu cầu đăng nhập
router.use(auth);

router.get("/", notificationController.getMyNotifications);
router.patch("/read-all", notificationController.markAllNotificationsAsRead);
router.patch("/:id/read", notificationController.markNotificationAsRead);

module.exports = router;
