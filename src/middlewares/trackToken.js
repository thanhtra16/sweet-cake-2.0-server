const { Order } = require("../models");
const { verifyTrackToken } = require("../utils/jwt");
const { errorResponse } = require("../utils/response");

// Cho Guest: xác thực header X-Track-Token, gắn đơn vào req.trackedOrder
const trackToken = async (req, res, next) => {
  const token = req.headers["x-track-token"];
  if (!token) return errorResponse(res, "Thiếu mã tra cứu đơn hàng", 401);

  let payload;
  try {
    payload = verifyTrackToken(token);
  } catch {
    return errorResponse(res, "Mã tra cứu không hợp lệ hoặc đã hết hạn", 401);
  }

  const order = await Order.findById(payload.orderId);
  if (!order) return errorResponse(res, "Không tìm thấy đơn hàng", 404);

  // Route dạng /orders/:code/... thì token phải đúng đơn đó
  if (req.params.code && req.params.code !== order.code) {
    return errorResponse(res, "Không có quyền truy cập đơn hàng này", 403);
  }

  req.trackedOrder = order;
  next();
};

module.exports = { trackToken };