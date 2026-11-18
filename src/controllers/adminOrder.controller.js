const adminOrderService = require("../services/adminOrder.service");
const Order = require("../models/order");

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
    const order = await adminOrderService.confirmPaymentManual(req.params.id, adminId);
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

// 1. Lập Phiếu làm bánh (Lập 1 lần, kiểm tra cờ ĐƠN ĐÃ HỦY)
async function createProductionTicket(req, res, next) {
  try {
    const adminId = req.user ? req.user._id : null;
    const orderId = req.params.id;

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

// 2. Xem / in Phiếu làm bánh (Kèm trạng thái cờ ĐƠN ĐÃ HỦY)
async function getProductionTicket(req, res, next) {
  try {
    const orderId = req.params.id;
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

// 3. Cập nhật hình ảnh sản phẩm thực tế (PUT photos / photoIds)
async function updateOrderPhotos(req, res, next) {
  try {
    const orderId = req.params.id;
    const { photoIds } = req.body;

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

// 4. Cập nhật trạng thái qua State Machine (PATCH status)
async function updateOrderStatus(req, res, next) {
  try {
    const orderId = req.params.id;
    const { nextStatus, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "ĐƠN ĐÃ HỦY - Không thể thay đổi trạng thái đơn hàng." });
    }

    // --- RÀNG BUỘC STATE MACHINE ---
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
};