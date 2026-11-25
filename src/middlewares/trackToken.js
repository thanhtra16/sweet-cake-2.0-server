const mongoose = require("mongoose");
const { Order } = require("../models");
const { verifyTrackToken } = require("../utils/jwt");
const { errorResponse } = require("../utils/response");

// Guest: xác thực X-Track-Token và chỉ cho phép truy cập đúng đơn hàng.
const trackToken = async (req, res, next) => {
  const token = req.headers["x-track-token"];

  if (!token) {
    return errorResponse(res, "Thiếu mã tra cứu đơn hàng", 401);
  }

  let payload;

  try {
    payload = verifyTrackToken(token);
  } catch {
    return errorResponse(res, "Mã tra cứu không hợp lệ hoặc đã hết hạn", 401);
  }

  // Kiểm tra loại token và cấu trúc payload.
  if (
    !payload ||
    payload.type !== "track" ||
    !payload.orderId ||
    !payload.code ||
    !mongoose.Types.ObjectId.isValid(payload.orderId)
  ) {
    return errorResponse(res, "Mã tra cứu không hợp lệ", 401);
  }

  // URL phải trỏ đúng đơn hàng được ghi trong token.
  if (req.params.id && String(req.params.id) !== String(payload.orderId)) {
    return errorResponse(res, "Không có quyền truy cập đơn hàng này", 403);
  }

  try {
    const order = await Order.findById(payload.orderId);

    if (!order) {
      return errorResponse(res, "Không tìm thấy đơn hàng", 404);
    }

    // Đối chiếu mã đơn trong token với mã đơn thực tế.
    if (String(order.code) !== String(payload.code)) {
      return errorResponse(res, "Không có quyền truy cập đơn hàng này", 403);
    }

    req.trackedOrder = order;

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = { trackToken };
