// Khai báo các API liên quan đến đơn hàng
const express = require("express");
const router = express.Router();

const orderController = require("../controllers/order.controller");
const { auth } = require("../middlewares/auth");
const { trackToken } = require("../middlewares/trackToken");

// Nếu có Bearer token thì xác thực user, nếu không có thì vẫn cho đi tiếp
const optionalAuth = (req, res, next) => {
  const hasBearer = (req.headers.authorization || "").startsWith("Bearer ");
  if (hasBearer) {
    return auth(req, res, next);
  }
  return next();
};

// Ưu tiên xác thực Buyer (Bearer token), tiếp theo là Guest (X-Track-Token), nếu không có vẫn cho đi tiếp
const authOrTrackToken = (req, res, next) => {
  const hasBearer = (req.headers.authorization || "").startsWith("Bearer ");
  if (hasBearer) {
    return auth(req, res, next);
  }
  if (req.headers["x-track-token"]) {
    return trackToken(req, res, next);
  }
  return next();
};

// Các route tĩnh (đặt trước /:id)
router.post("/quote", orderController.quoteOrder);
router.post("/track", orderController.trackOrder);

// Các route quản lý & thao tác trên đơn hàng
router.get("/", optionalAuth, orderController.getOrders);
router.get("/:id", authOrTrackToken, orderController.getOrderById);
router.post("/:id/cancel", authOrTrackToken, orderController.cancelOrder);
router.post("/:id/cancel-request", authOrTrackToken, orderController.createCancelRequest);
router.post("/:id/reorder", authOrTrackToken, orderController.reorder);

module.exports = router;