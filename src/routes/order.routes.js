// Khai báo các API liên quan đến đơn hàng
const express = require("express");
const router = express.Router();

const orderController = require("../controllers/order.controller");
const { auth, optionalAuth } = require("../middlewares/auth");
const { trackToken } = require("../middlewares/trackToken");
const { errorResponse } = require("../utils/response");

// Bắt buộc có một trong hai phương thức xác thực:
// 1. Buyer: Bearer access token
// 2. Guest: X-Track-Token hợp lệ
const authOrTrackToken = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const hasBearer = authorization.startsWith("Bearer ");
  const hasTrackToken = Boolean(req.headers["x-track-token"]);

  if (hasBearer) {
    return auth(req, res, next);
  }

  if (hasTrackToken) {
    return trackToken(req, res, next);
  }

  return errorResponse(
    res,
    "Vui lòng đăng nhập hoặc cung cấp mã tra cứu đơn hàng.",
    401,
  );
};

// Các route công khai
router.post("/quote", orderController.quoteOrder);
router.post("/track", orderController.trackOrder);
// Webhook mô phỏng dành cho môi trường demo.
router.post("/:id/payment/mock-webhook", orderController.mockPaymentWebhook);

// Tạo đơn hàng: Guest hoặc Buyer đều được phép
router.post("/", optionalAuth, orderController.createOrder);

// Danh sách đơn: chỉ Buyer đã đăng nhập mới được truy cập
router.get("/", auth, orderController.getOrders);

// Chi tiết và thao tác trên đơn:
// Buyer phải là chủ đơn; Guest phải có Track Token đúng đơn
router.get("/:id", authOrTrackToken, orderController.getOrderById);
router.post("/:id/payment/qr", authOrTrackToken, orderController.createPaymentQr);
router.post("/:id/cancel", authOrTrackToken, orderController.cancelOrder);
router.post(
  "/:id/cancel-request",
  authOrTrackToken,
  orderController.createCancelRequest,
);
router.post("/:id/reorder", authOrTrackToken, orderController.reorder);

module.exports = router;
