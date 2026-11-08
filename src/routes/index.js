// file tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");

// Đăng ký các nhóm API
router.use("/", healthRoutes);

router.use("/auth", authRoutes);

module.exports = router;