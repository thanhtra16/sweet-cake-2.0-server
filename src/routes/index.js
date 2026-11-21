// file tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const imagesRoutes = require("./images.routes");
const productsRoutes = require("./products.routes");
const ordersRoutes = require("./orders.routes");
const adminProductsRoutes = require("./adminProducts.routes");
const adminCustomizationRoutes = require("./adminCustomization.routes");

// Đăng ký các nhóm API
router.use("/", healthRoutes);

router.use("/auth", authRoutes);
router.use("/images", imagesRoutes);
router.use("/products", productsRoutes);
router.use("/orders", ordersRoutes);

router.use("/admin/products", adminProductsRoutes);
router.use("/admin/customization", adminCustomizationRoutes);

module.exports = router;
