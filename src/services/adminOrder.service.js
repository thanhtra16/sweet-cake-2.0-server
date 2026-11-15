const { Order, Setting } = require("../models");
const AppError = require("../utils/AppError");
const { transitionOrder } = require("./orderStatus.service");

async function getAdminOrders(query = {}) {
  const { status, from, to, hasCancelRequest, search, page = 1, limit = 15 } = query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (hasCancelRequest === 'true' || hasCancelRequest === true) {
    filter["cancelRequest.status"] = "pending";
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
      { "receiver.name": new RegExp(cleanSearch, "i") },
      { "receiver.phone": new RegExp(cleanSearch, "i") },
    ];
  }

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    page: pageNum,
    limit: limitNum,
    total,
  };
}

async function getAdminOrderById(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }
  return order;
}

async function confirmPaymentManual(orderId, adminId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  if (order.status !== "pending_payment") {
    throw new AppError(409, "INVALID_STATUS", "Đơn hàng không ở trạng thái chờ thanh toán.");
  }

  // Cập nhật trạng thái thanh toán thành paid trước khi chuyển trạng thái đơn
  order.payment.status = "paid";
  order.payment.paidAt = new Date();
  await order.save();

  const settings = await Setting.findOne().lean() || {};

  const updated = await transitionOrder(order._id.toString(), "pending_approval", {
    actor: { type: "admin", id: adminId },
    settings,
  });

  return updated;
}

async function acceptOrder(orderId, adminId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  const settings = await Setting.findOne().lean() || {};

  const updated = await transitionOrder(order._id.toString(), "accepted", {
    actor: { type: "admin", id: adminId },
    settings,
  });

  return updated;
}

async function rejectOrCancelOrder(orderId, { reasonCode, reason, cause, via }, adminId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  const settings = await Setting.findOne().lean() || {};

  const updated = await transitionOrder(order._id.toString(), "cancelled", {
    actor: { type: "admin", id: adminId },
    reasonCode: reasonCode || "other",
    reason: reason || "Admin hủy/từ chối đơn hàng",
    cause: cause || "other",
    via: via || (order.cancelRequest && order.cancelRequest.status === "pending" ? "cancel_request" : null),
    settings,
  });

  // Nếu xử lý qua yêu cầu hủy của khách, cập nhật trạng thái cancelRequest thành accepted
  if (order.cancelRequest && order.cancelRequest.status === "pending") {
    updated.cancelRequest.status = "approved";
    updated.cancelRequest.decidedBy = adminId;
    updated.cancelRequest.decidedAt = new Date();
    await updated.save();
  }

  return updated;
}

module.exports = {
  getAdminOrders,
  getAdminOrderById,
  confirmPaymentManual,
  acceptOrder,
  rejectOrCancelOrder,
};