const mongoose = require("mongoose");
const adminOrderService = require("../services/adminOrder.service");
const { Order } = require("../models");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getOrders(req, res, next) {
  try {
    const result = await adminOrderService.getAdminOrders(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function getOrderById(req, res, next) {
  try {
    const order = await adminOrderService.getAdminOrderById(req.params.id);
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

async function confirmPayment(req, res, next) {
  try {
    const adminId = req.user ? req.user._id : null;
    const order = await adminOrderService.confirmPaymentManual(req.params.id, adminId, req.body || {});
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

async function acceptOrder(req, res, next) {
  try {
    const adminId = req.user ? req.user._id : null;
    const order = await adminOrderService.acceptOrder(req.params.id, adminId);
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

async function rejectOrder(req, res, next) {
  try {
    const adminId = req.user ? req.user._id : null;
    const order = await adminOrderService.rejectOrCancelOrder(req.params.id, req.body, adminId);
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

// ==================== BỔ SUNG PHẦN 2: LẬP PHIẾU, ẢNH VÀ STATE MACHINE ====================

async function createProductionTicket(req, res, next) {
  try {
    const adminId = req.user ? req.user._id : null;
    const orderId = req.params.id;

    if (!isValidId(orderId)) {
      return res.status(400).json({ success: false, message: "ID đơn hàng không hợp lệ." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "ĐƠN ĐÃ HỦY - Không thể lập phiếu làm bánh." });
    }

    if (order.productionTicket && order.productionTicket.createdAt) {
      return res.status(400).json({ success: false, message: "Phiếu làm bánh đã được lập cho đơn hàng này trước đó." });
    }

    order.productionTicket = {
      createdBy: adminId,
      createdAt: new Date(),
    };

    await order.save();
    return res.status(200).json({
      success: true,
      message: "Lập phiếu làm bánh thành công",
      productionTicket: order.productionTicket,
    });
  } catch (err) {
    return next(err);
  }
}

async function getProductionTicket(req, res, next) {
  try {
    const orderId = req.params.id;

    if (!isValidId(orderId)) {
      return res.status(400).json({ success: false, message: "ID đơn hàng không hợp lệ." });
    }

    const order = await Order.findById(orderId).populate("items.productId slotId");

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (!order.productionTicket || !order.productionTicket.createdAt) {
      return res.status(400).json({ success: false, message: "Đơn hàng này chưa được lập phiếu làm bánh." });
    }

    return res.status(200).json({
      success: true,
      isCancelled: order.status === "cancelled",
      code: order.code,
      receiver: order.receiver,
      receiveDate: order.receiveDate,
      slotLabel: order.slotLabel,
      note: order.note,
      items: order.items,
      productionTicket: order.productionTicket,
    });
  } catch (err) {
    return next(err);
  }
}

async function updateOrderPhotos(req, res, next) {
  try {
    const orderId = req.params.id;
    const { photoIds } = req.body;

    if (!isValidId(orderId)) {
      return res.status(400).json({ success: false, message: "ID đơn hàng không hợp lệ." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "ĐƠN ĐÃ HỦY - Không thể cập nhật hình ảnh sản phẩm." });
    }

    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ success: false, message: "photoIds phải là một mảng các ObjectId." });
    }

    order.photoIds = photoIds;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật hình ảnh sản phẩm thành công",
      photoIds: order.photoIds,
    });
  } catch (err) {
    return next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const orderId = req.params.id;
    const { nextStatus, reason } = req.body;

    if (!isValidId(orderId)) {
      return res.status(400).json({ success: false, message: "ID đơn hàng không hợp lệ." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "ĐƠN ĐÃ HỦY - Không thể thay đổi trạng thái đơn hàng." });
    }

    if (nextStatus === "baking") {
      if (!order.productionTicket || !order.productionTicket.createdAt) {
        return res.status(400).json({
          error: "TICKET_REQUIRED",
          message: "Yêu cầu phải lập Phiếu làm bánh trước khi chuyển sang trạng thái đang làm bánh (baking).",
        });
      }
    }

    if (nextStatus === "delivering") {
      if (!order.photoIds || order.photoIds.length === 0) {
        return res.status(400).json({
          error: "PHOTO_REQUIRED",
          message: "Yêu cầu phải tải lên ít nhất một hình ảnh sản phẩm thực tế trước khi giao hàng (delivering).",
        });
      }
    }

    const oldStatus = order.status;
    order.status = nextStatus;

    order.statusHistory.push({
      from: oldStatus,
      to: nextStatus,
      actor: "admin",
      time: new Date(),
      reason: reason || "",
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Chuyển trạng thái đơn hàng sang '${nextStatus}' thành công`,
      status: order.status,
      statusHistory: order.statusHistory,
    });
  } catch (err) {
    return next(err);
  }
}

// ==================== BỔ SUNG PHẦN 3: XỬ LÝ YÊU CẦU HỦY & HOÀN TIỀN ====================

async function decideCancelRequest(req, res, next) {
  try {
    const adminId = req.user ? req.user._id : null;
    const order = await adminOrderService.decideCancelRequest(req.params.id, req.body, adminId);
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

async function specialCancel(req, res, next) {
  try {
    const adminId = req.user ? req.user._id : null;
    const order = await adminOrderService.specialCancelOrder(req.params.id, req.body, adminId);
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

async function confirmRefund(req, res, next) {
  try {
    const adminId = req.user ? req.user._id : null;
    const order = await adminOrderService.confirmRefund(req.params.id, req.body, adminId);
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getOrders,
  getOrderById,
  confirmPayment,
  acceptOrder,
  rejectOrder,
  createProductionTicket,
  getProductionTicket,
  updateOrderPhotos,
  updateOrderStatus,
  decideCancelRequest,
  specialCancel,
  confirmRefund,
};