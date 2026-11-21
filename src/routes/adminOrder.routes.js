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

// ==================== BỔ SUNG PHẦN 2: LẬP PHIẾU, ẢNH & STATE MACHINE ====================
router.post("/:id/production-ticket", adminOrderController.createProductionTicket); // Lập phiếu làm bánh (1 lần)
router.get("/:id/production-ticket", adminOrderController.getProductionTicket);    // Xem/in phiếu làm bánh (có cờ ĐƠN ĐÃ HỦY)
router.put("/:id/photos", adminOrderController.updateOrderPhotos);                 // PUT cập nhật hình ảnh sản phẩm thực tế
router.patch("/:id/status", adminOrderController.updateOrderStatus);               // PATCH trạng thái qua State Machine (TICKET_REQUIRED, PHOTO_REQUIRED)
// ==================== BỔ SUNG PHẦN 3: XỬ LÝ YÊU CẦU HỦY & HOÀN TIỀN ====================
router.post("/:id/cancel-request/decision", adminOrderController.decideCancelRequest);
router.post("/:id/special-cancel", adminOrderController.specialCancel);
router.post("/:id/refund/confirm", adminOrderController.confirmRefund);

module.exports = router;