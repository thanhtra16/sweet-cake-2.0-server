
// File tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const productsRoutes = require("./products.routes");
const notificationRoutes = require("./notification.routes");
const adminRoutes = require("./admin.routes");
const adminUserRoutes = require("./admin-user.routes");
const adminTimeSlotRoutes = require("./admin-time-slot.routes");
const adminVoucherRoutes = require("./admin-voucher.routes");

// Đăng ký các nhóm API
router.use("/", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productsRoutes);

// API thông báo
router.use("/notifications", notificationRoutes);

// API Admin
router.use("/admin", adminRoutes);

// API quản trị khách hàng
router.use("/admin/users", adminUserRoutes);

// API quản lý khung giờ nhận bánh
router.use("/admin/time-slots", adminTimeSlotRoutes);

// API quản lý Voucher
router.use("/admin/vouchers", adminVoucherRoutes);

module.exports = router;
