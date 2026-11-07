// file tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");

// Đăng ký các nhóm API
router.use("/", healthRoutes);

module.exports = router;