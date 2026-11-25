const express = require("express");
const router = express.Router();
const adminOrderController = require("../controllers/adminOrder.controller");
const { auth } = require("../middlewares/auth");
const { requireAdmin } = require("../middlewares/requireAdmin");

// Tạm bỏ qua xác thực để test giao diện Admin trên local (sau khi test xong nhớ mở lại dòng dưới)
// router.use(auth, requireAdmin);
// router.use((req, res, next) => {
//   req.user = {
//     _id: "650000000000000000000001",
//     role: "admin",
//     fullName: "Admin SweetCake"
//   };
//   next();
// });

// Bắt buộc đăng nhập và có quyền Admin
router.use(auth, requireAdmin);

router.get("/", adminOrderController.getOrders);
router.get("/:id", adminOrderController.getOrderById);
router.post("/:id/confirm-payment", adminOrderController.confirmPayment);
router.post("/:id/accept", adminOrderController.acceptOrder);
router.post("/:id/reject", adminOrderController.rejectOrder);

// ==================== BỔ SUNG PHẦN 2: LẬP PHIẾU, ẢNH & STATE MACHINE ====================
router.post("/:id/production-ticket", adminOrderController.createProductionTicket);
router.get("/:id/production-ticket", adminOrderController.getProductionTicket);
router.put("/:id/photos", adminOrderController.updateOrderPhotos);
router.patch("/:id/status", adminOrderController.updateOrderStatus);

// ==================== BỔ SUNG PHẦN 3: XỬ LÝ YÊU CẦU HỦY & HOÀN TIỀN ====================
router.post("/:id/cancel-request/decision", adminOrderController.decideCancelRequest);
router.post("/:id/special-cancel", adminOrderController.specialCancel);
router.post("/:id/refund/confirm", adminOrderController.confirmRefund);

module.exports = router;