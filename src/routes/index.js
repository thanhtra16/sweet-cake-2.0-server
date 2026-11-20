
// File tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
<<<<<<< HEAD
const orderRoutes = require("./order.routes");
const adminOrderRoutes = require("./adminOrder.routes");
=======
const postRoutes = require("./post.routes");
const faqRoutes = require("./faq.routes");
const notificationRoutes = require("./notification.routes");
>>>>>>> ecd03e8bcf0111a753722f980b0fd6957d203076

// API kiểm tra server
router.use("/", healthRoutes);

// API đăng ký, đăng nhập
router.use("/auth", authRoutes);

<<<<<<< HEAD
router.use("/orders", orderRoutes);

router.use("/admin/orders", adminOrderRoutes);
module.exports = router;
=======
// API bài viết
router.use("/posts", postRoutes);

// API câu hỏi thường gặp
router.use("/faqs", faqRoutes);

// API thông báo
router.use("/notifications", notificationRoutes);

module.exports = router;
>>>>>>> ecd03e8bcf0111a753722f980b0fd6957d203076
