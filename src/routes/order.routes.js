const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const { auth } = require("../middlewares/auth");
const { trackToken } = require("../middlewares/trackToken");

// Ưu tiên xác thực Buyer (Bearer token), nếu không có thì xác thực Guest (X-Track-Token)
const authOrTrackToken = (req, res, next) => {
  const hasBearer = (req.headers.authorization || "").startsWith("Bearer ");
  if (hasBearer) {
    return auth(req, res, next);
  }
  return trackToken(req, res, next);
};

router.post("/track", orderController.trackOrder);
router.get("/", auth, orderController.getOrders);
router.get("/:id", authOrTrackToken, orderController.getOrderById);
router.post("/:id/cancel", authOrTrackToken, orderController.cancelOrder);
router.post("/:id/cancel-request", authOrTrackToken, orderController.createCancelRequest);

module.exports = router;