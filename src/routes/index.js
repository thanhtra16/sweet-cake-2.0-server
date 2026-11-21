
// File tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const imagesRoutes = require("./images.routes");
const productsRoutes = require("./products.routes");
const ordersRoutes = require("./orders.routes");
const userRoutes = require("./user.routes");
const postRoutes = require("./post.routes");
const faqRoutes = require("./faq.routes");
const blogRoutes = require("./blog.routes");
 
// const notificationRoutes = require("./notification.routes");
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
// router.use("/notifications", notificationRoutes);

// API Admin quản lý khách hàng
router.use("/admin", adminRoutes);

router.use("/images", imagesRoutes);

router.use("/products", productsRoutes);

router.use("/orders", ordersRoutes);

// API bài viết
router.use("/posts", postRoutes);

// API câu hỏi thường gặp
router.use("/faqs", faqRoutes);

// API thông báo
// router.use("/notifications", notificationRoutes);

// API Admin quản lý khách hàng
router.use("/admin", adminRoutes);

// API Blog

router.use("/blogs", blogRoutes);

module.exports = router;
