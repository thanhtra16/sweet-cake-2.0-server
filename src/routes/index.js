// File tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const postRoutes = require("./post.routes");
const faqRoutes = require("./faq.routes");
const notificationRoutes = require("./notification.routes");
const adminRoutes = require("./admin.routes");
const adminCustomizationRoutes = require("./adminCustomization.routes");
const adminOrderRoutes = require("./adminOrder.routes");
const adminProductsRoutes = require("./adminProducts.routes");
const imagesRoutes = require("./images.routes");
const productsRoutes = require("./products.routes");
const orderRoutes = require("./order.routes");

// API kiểm tra server
router.use("/", healthRoutes);

// API đăng ký, đăng nhập
router.use("/auth", authRoutes);

// API tài khoản
router.use("/users", userRoutes);

// API bài viết, FAQ, thông báo
router.use("/posts", postRoutes);
router.use("/faqs", faqRoutes);
router.use("/notifications", notificationRoutes);

// API Admin
router.use("/admin", adminRoutes);
router.use("/admin/customizations", adminCustomizationRoutes);
router.use("/admin/orders", adminOrderRoutes);
router.use("/admin/products", adminProductsRoutes);

// API hình ảnh, sản phẩm, đơn hàng
router.use("/images", imagesRoutes);
router.use("/products", productsRoutes);
router.use("/orders", orderRoutes);

module.exports = router;