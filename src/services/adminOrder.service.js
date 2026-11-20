const { Order, Setting } = require("../models");
const AppError = require("../utils/AppError");
const { transitionOrder } = require("./orderStatus.service");

// Gắn thêm cờ cảnh báo quá hạn hoàn tiền (> 3 ngày hoặc quá dueAt)
function enrichOrderFlags(orderDoc) {
  const order = orderDoc.toObject ? orderDoc.toObject() : { ...orderDoc };
  const now = new Date();

  let isRefundOverdue = false;
  if (order.refund && order.refund.status === "pending") {
    if (order.refund.dueAt) {
      isRefundOverdue = now > new Date(order.refund.dueAt);
    } else if (order.cancellation && order.cancellation.at) {
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      isRefundOverdue = now - new Date(order.cancellation.at) > threeDaysMs;
    }
  }

  return {
    ...order,
    isRefundOverdue,
  };
}

async function getAdminOrders(query = {}) {
  const { status, from, to, hasCancelRequest, refundOverdue, search, page = 1, limit = 15 } = query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (hasCancelRequest === "true" || hasCancelRequest === true) {
    filter["cancelRequest.status"] = "pending";
  }

  if (refundOverdue === "true" || refundOverdue === true) {
    filter["refund.status"] = "pending";
    filter["refund.dueAt"] = { $lt: new Date() };
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

  if (search) {
    const cleanSearch = String(search).trim();
    filter.$or = [
      { code: new RegExp(cleanSearch, "i") },
      { "receiver.fullName": new RegExp(cleanSearch, "i") },
      { "receiver.phone": new RegExp(cleanSearch, "i") },
    ];
  }

  const [rawItems, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Order.countDocuments(filter),
  ]);

  return {
    items: rawItems.map(enrichOrderFlags),
    page: pageNum,
    limit: limitNum,
    total,
  };
}

async function getAdminOrderById(orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }
  return enrichOrderFlags(order);
}

async function confirmPaymentManual(orderId, adminId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  if (order.status !== "pending_payment") {
    throw new AppError(409, "INVALID_STATUS", "Đơn hàng không ở trạng thái chờ thanh toán.");
  }

  const now = new Date();
  const updated = await transitionOrder(order._id.toString(), "pending_approval", {
    actor: { type: "admin", id: adminId },
    patch: {
      "payment.status": "paid",
      "payment.paidAt": now,
      "payment.confirmedBy": "admin",
    },
    now,
  });

  return enrichOrderFlags(updated);
}

async function acceptOrder(orderId, adminId) {
  const updated = await transitionOrder(orderId, "accepted", {
    actor: { type: "admin", id: adminId },
  });
  return enrichOrderFlags(updated);
}

async function rejectOrCancelOrder(orderId, { reasonCode, reason, cause } = {}, adminId) {
  const order = await Order.findById(orderId).lean();
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  if (order.cancelRequest && order.cancelRequest.status === "pending") {
    throw new AppError(
      409,
      "CANCEL_REQUEST_PENDING",
      "Đơn đang có yêu cầu hủy từ khách, vui lòng xử lý tại mục duyệt yêu cầu hủy."
    );
  }

  const updated = await transitionOrder(orderId, "cancelled", {
    actor: { type: "admin", id: adminId },
    reasonCode: reasonCode || "other",
    reason: reason || "",
    cause: cause || "other",
  });

  return enrichOrderFlags(updated);
}

// 1. Admin duyệt hoặc từ chối yêu cầu hủy của khách (POST /cancel-request/decision)
async function decideCancelRequest(orderId, { decision, decisionReason, cause } = {}, adminId) {
  if (!["accepted", "rejected"].includes(decision)) {
    throw new AppError(400, "VALIDATION_ERROR", "Quyết định phải là 'accepted' hoặc 'rejected'.");
  }

  const order = await Order.findById(orderId).lean();
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  if (!order.cancelRequest || order.cancelRequest.status !== "pending") {
    throw new AppError(409, "NO_PENDING_CANCEL_REQUEST", "Đơn hàng không có yêu cầu hủy nào đang chờ duyệt.");
  }

  const now = new Date();
  const cleanDecisionReason = String(decisionReason || "").trim();

  if (decision === "rejected") {
    if (!cleanDecisionReason) {
      throw new AppError(400, "DECISION_REASON_REQUIRED", "Vui lòng nhập lý do từ chối yêu cầu hủy.");
    }

    const updated = await Order.findOneAndUpdate(
      { _id: orderId, "cancelRequest.status": "pending" },
      {
        $set: {
          "cancelRequest.status": "rejected",
          "cancelRequest.decidedBy": adminId,
          "cancelRequest.decidedAt": now,
          "cancelRequest.decisionReason": cleanDecisionReason,
        },
      },
      { new: true }
    ).lean();

    return enrichOrderFlags(updated);
  }

  // Trường hợp decision === "accepted": chuyển đơn sang cancelled & tự tính suggestedAmount theo refundPolicy
  const updated = await transitionOrder(orderId, "cancelled", {
    actor: { type: "admin", id: adminId },
    reasonCode: order.cancelRequest.reasonCode || "other",
    reason: cleanDecisionReason || order.cancelRequest.reason || "Chấp nhận yêu cầu hủy của khách",
    cause: cause || "other",
    via: "cancel_request",
    patch: {
      "cancelRequest.status": "accepted",
      "cancelRequest.decidedBy": adminId,
      "cancelRequest.decidedAt": now,
      "cancelRequest.decisionReason": cleanDecisionReason || null,
    },
    now,
  });

  return enrichOrderFlags(updated);
}

// 2. Hủy đặc biệt từ phía cửa hàng - hoàn 100% (POST /special-cancel)
async function specialCancelOrder(orderId, { reason, cause = "shop_fault" } = {}, adminId) {
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) {
    throw new AppError(400, "CANCEL_REASON_REQUIRED", "Vui lòng nhập lý do hủy đặc biệt.");
  }

  const order = await Order.findById(orderId).lean();
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  const now = new Date();
  const patch = {};

  // Nếu đang có yêu cầu hủy treo thì đóng luôn kèm theo quyết định chấp nhận
  if (order.cancelRequest && order.cancelRequest.status === "pending") {
    patch["cancelRequest.status"] = "accepted";
    patch["cancelRequest.decidedBy"] = adminId;
    patch["cancelRequest.decidedAt"] = now;
    patch["cancelRequest.decisionReason"] = cleanReason;
  }

  const updated = await transitionOrder(orderId, "cancelled", {
    actor: { type: "admin", id: adminId },
    reasonCode: "other",
    reason: cleanReason,
    cause, // 'shop_fault' sẽ kích hoạt hoàn 100% trong orderStatus.rules.js
    patch,
    now,
  });

  return enrichOrderFlags(updated);
}

// 3. Xác nhận hoàn tiền thủ công cho khách (POST /refund/confirm)
async function confirmRefund(orderId, { amount, adjustReason } = {}, adminId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  if (!order.refund || order.refund.status !== "pending") {
    throw new AppError(409, "NO_PENDING_REFUND", "Đơn hàng không có khoản hoàn tiền nào đang chờ xác nhận.");
  }

  const finalAmount = amount !== undefined && amount !== null ? Number(amount) : order.refund.suggestedAmount;
  if (Number.isNaN(finalAmount) || finalAmount < 0 || finalAmount > order.total) {
    throw new AppError(400, "INVALID_REFUND_AMOUNT", "Số tiền hoàn không hợp lệ.");
  }

  const cleanAdjustReason = String(adjustReason || "").trim();
  if (finalAmount !== order.refund.suggestedAmount && !cleanAdjustReason) {
    throw new AppError(
      400,
      "ADJUST_REASON_REQUIRED",
      "Vui lòng nhập lý do điều chỉnh khi số tiền hoàn khác với mức đề xuất."
    );
  }

  order.refund.status = "processed";
  order.refund.amount = finalAmount;
  order.refund.adjustReason = cleanAdjustReason || null;
  order.refund.processedAt = new Date();
  order.refund.processedBy = adminId;

  if (order.payment && order.payment.status === "paid") {
    order.payment.status = "refunded";
  }

  await order.save();
  return enrichOrderFlags(order);
}

module.exports = {
  getAdminOrders,
  getAdminOrderById,
  confirmPaymentManual,
  acceptOrder,
  rejectOrCancelOrder,
  decideCancelRequest,
  specialCancelOrder,
  confirmRefund,
};