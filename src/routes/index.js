
// file tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const productsRoutes = require("./products.routes");
const notificationRoutes = require("./notification.routes");

// Đăng ký các nhóm API
router.use("/", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productsRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
