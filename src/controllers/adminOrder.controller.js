const adminOrderService = require("../services/adminOrder.service");

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

module.exports = {
  getOrders,
  getOrderById,
  confirmPayment,
  acceptOrder,
  rejectOrder,
};