const AppError = require("../utils/AppError");
const { Order } = require("../models");
const { transitionOrder } = require("./orderStatus.service");
const { CUSTOMER_CANCEL_REASONS } = require("./orderStatus.rules");
const { signTrackToken } = require("../utils/jwt");

const STATUS_RANK = {
  pending_payment: 1,
  pending_approval: 2,
  accepted: 3,
  baking: 4,
  delivering: 5,
  delivered: 6,
  done: 7,
  cancelled: 0,
};

const STATUS_GROUPS = {
  active: [
    "pending_payment",
    "pending_approval",
    "accepted",
    "baking",
    "delivering",
    "delivered",
  ],
  completed: ["done"],
  cancelled: ["cancelled"],
};

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length === 11) {
    return "0" + digits.slice(2);
  }
  return digits;
}

function sanitizeOrderForCustomer(orderDoc) {
  const order = orderDoc.toObject ? orderDoc.toObject() : { ...orderDoc };
  const currentRank = STATUS_RANK[order.status] || 0;

  // Chỉ trả ảnh thực tế khi trạng thái >= Đã xong (done)
  if (currentRank < STATUS_RANK.done) {
    order.photoIds = [];
  }
  return order;
}

async function assertCustomerOrderAccess(orderId, { userId, trackPayload }) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  if (userId && order.userId && order.userId.toString() === userId.toString()) {
    return order;
  }

  if (
    trackPayload &&
    trackPayload.orderId &&
    trackPayload.orderId.toString() === order._id.toString()
  ) {
    return order;
  }

  throw new AppError(
    403,
    "ORDER_ACCESS_DENIED",
    "Bạn không có quyền truy cập đơn hàng này."
  );
}

async function getCustomerOrders(userId, query = {}) {
  const { group, status, from, to, page = 1, limit = 10 } = query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = { userId };

  if (status) {
    filter.status = status;
  } else if (group && STATUS_GROUPS[group]) {
    filter.status = { $in: STATUS_GROUPS[group] };
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const [rawItems, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Order.countDocuments(filter),
  ]);

  return {
    items: rawItems.map(sanitizeOrderForCustomer),
    page: pageNum,
    limit: limitNum,
    total,
  };
}

async function trackOrderByCodeAndPhone({ code, phone }) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanPhone = normalizePhone(phone);

  if (!cleanCode || !cleanPhone) {
    throw new AppError(
      400,
      "INVALID_TRACK_INPUT",
      "Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại."
    );
  }

  const altPhone = cleanPhone.startsWith("0")
    ? "+84" + cleanPhone.slice(1)
    : cleanPhone;

  const order = await Order.findOne({
    code: cleanCode,
    "receiver.phone": { $in: [cleanPhone, altPhone, String(phone).trim()] },
  });

  if (!order) {
    throw new AppError(
      404,
      "ORDER_NOT_FOUND",
      "Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại."
    );
  }

  const trackToken = signTrackToken(order);

  return {
    order: sanitizeOrderForCustomer(order),
    trackToken,
  };
}

async function getCustomerOrderById(orderId, authContext) {
  const order = await assertCustomerOrderAccess(orderId, authContext);
  return sanitizeOrderForCustomer(order);
}

async function cancelOrderByCustomer(orderId, { reasonCode, reason } = {}, authContext) {
  const code = reasonCode || "other";
  const cleanReason = String(reason || "").trim();

  if (!CUSTOMER_CANCEL_REASONS.includes(code)) {
    throw new AppError(400, "VALIDATION_ERROR", "Lý do hủy đơn không hợp lệ.");
  }
  if (code === "other" && !cleanReason) {
    throw new AppError(400, "CANCEL_REASON_REQUIRED", "Vui lòng nhập lý do hủy đơn.");
  }

  const order = await assertCustomerOrderAccess(orderId, authContext);

  const updated = await transitionOrder(order._id.toString(), "cancelled", {
    actor: {
      type: "customer",
      id: authContext.userId || null,
    },
    reasonCode: code,
    reason: cleanReason,
    via: "customer_direct_cancel",
  });

  return sanitizeOrderForCustomer(updated);
}

async function createCancelRequest(orderId, { reasonCode, reason } = {}, authContext) {
  const code = reasonCode || "other";
  const cleanReason = String(reason || "").trim();

  if (!CUSTOMER_CANCEL_REASONS.includes(code)) {
    throw new AppError(400, "VALIDATION_ERROR", "Lý do yêu cầu hủy không hợp lệ.");
  }
  if (code === "other" && !cleanReason) {
    throw new AppError(
      400,
      "CANCEL_REASON_REQUIRED",
      "Vui lòng nhập lý do yêu cầu hủy đơn."
    );
  }

  const order = await assertCustomerOrderAccess(orderId, authContext);

  if (order.cancelRequest && order.cancelRequest.status) {
    throw new AppError(
      409,
      "CANCEL_REQUEST_ALREADY_EXISTS",
      "Đơn hàng này đã có yêu cầu hủy trước đó, không thể gửi thêm."
    );
  }

  const allowedStatuses = ["accepted", "baking", "delivering"];
  if (!allowedStatuses.includes(order.status)) {
    throw new AppError(
      409,
      "INVALID_ORDER_STATUS_FOR_CANCEL_REQUEST",
      "Trạng thái đơn hiện tại không thể gửi yêu cầu hủy."
    );
  }

  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      "cancelRequest.status": { $in: [null, undefined] },
    },
    {
      $set: {
        cancelRequest: {
          reasonCode: code,
          reason: cleanReason || null,
          requestedAt: new Date(),
          atStatus: order.status,
          status: "pending",
          decidedBy: null,
          decidedAt: null,
          decisionReason: null,
        },
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new AppError(
      409,
      "CANCEL_REQUEST_ALREADY_EXISTS",
      "Đơn hàng này đã có yêu cầu hủy."
    );
  }

  return sanitizeOrderForCustomer(updated);
}

module.exports = {
  getCustomerOrders,
  trackOrderByCodeAndPhone,
  getCustomerOrderById,
  cancelOrderByCustomer,
  createCancelRequest,
};