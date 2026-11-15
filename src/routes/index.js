// file tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const orderRoutes = require("./order.routes");
const adminOrderRoutes = require("./adminOrder.routes");

// Đăng ký các nhóm API
router.use("/", healthRoutes);

router.use("/auth", authRoutes);

router.use("/orders", orderRoutes);

router.use("/admin/orders", adminOrderRoutes);
module.exports = router;