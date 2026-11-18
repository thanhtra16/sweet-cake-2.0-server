const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const postRoutes = require("./post.routes");
const faqRoutes = require("./faq.routes");
const notificationRoutes = require("./notification.routes");
const adminRoutes = require("./admin.routes");

// API kiểm tra server
router.use("/", healthRoutes);

// API đăng ký, đăng nhập
router.use("/auth", authRoutes);

// API tài khoản
router.use("/users", userRoutes);

// API bài viết
router.use("/posts", postRoutes);

// API câu hỏi thường gặp
router.use("/faqs", faqRoutes);

// API thông báo
router.use("/notifications", notificationRoutes);

// API Admin quản lý khách hàng
router.use("/admin", adminRoutes);

module.exports = router;