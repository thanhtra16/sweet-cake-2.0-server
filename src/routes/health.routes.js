// Route dùng để khai báo đường dẫn API và kết nối với Controller tương ứng.
const express = require("express");
const router = express.Router();

const { checkHealth } = require("../controllers/health.controller");

// GET /api/health
router.get("/health", checkHealth);

module.exports = router;