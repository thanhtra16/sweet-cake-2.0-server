const express = require("express");
const router = express.Router();
const adminOrderController = require("../controllers/adminOrder.controller");
const { auth } = require("../middlewares/auth");
const { requireAdmin } = require("../middlewares/requireAdmin"); // Hoặc middleware check role admin tương ứng của nhóm

// Áp dụng middleware xác thực và quyền Admin cho toàn bộ route quản lý đơn hàng
router.use(auth, requireAdmin);

router.get("/", adminOrderController.getOrders);
router.get("/:id", adminOrderController.getOrderById);
router.post("/:id/confirm-payment", adminOrderController.confirmPayment);
router.post("/:id/accept", adminOrderController.acceptOrder);
router.post("/:id/reject", adminOrderController.rejectOrder);

module.exports = router;