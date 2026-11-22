
// File tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const productsRoutes = require("./products.routes");
const postRoutes = require("./post.routes");
const faqRoutes = require("./faq.routes");
const notificationRoutes = require("./notification.routes");
const adminRoutes = require("./admin.routes");

// Đăng ký các nhóm API
router.use("/", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productsRoutes);

// API bài viết
router.use("/posts", postRoutes);

// API câu hỏi thường gặp
router.use("/faqs", faqRoutes);

// API thông báo
router.use("/notifications", notificationRoutes);

// API Admin quản lý khách hàng
router.use("/admin", adminRoutes);

module.exports = router;
