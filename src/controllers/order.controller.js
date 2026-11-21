const orderService = require("../services/order.service");

function extractAuthContext(req) {
  const userId = req.user ? req.user._id : null;
  const trackPayload = req.trackedOrder
    ? { orderId: req.trackedOrder._id }
    : null;

  return { userId, trackPayload };
}

async function getOrders(req, res, next) {
  try {
    const userId = req.user._id;
    const result = await orderService.getCustomerOrders(userId, req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function trackOrder(req, res, next) {
  try {
    const result = await orderService.trackOrderByCodeAndPhone(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function getOrderById(req, res, next) {
  try {
    const authContext = extractAuthContext(req);
    const order = await orderService.getCustomerOrderById(
      req.params.id,
      authContext
    );
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const authContext = extractAuthContext(req);
    const order = await orderService.cancelOrderByCustomer(
      req.params.id,
      req.body,
      authContext
    );
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

async function createCancelRequest(req, res, next) {
  try {
    const authContext = extractAuthContext(req);
    const order = await orderService.createCancelRequest(
      req.params.id,
      req.body,
      authContext
    );
    return res.status(201).json(order);
  } catch (err) {
    return next(err);
  }
}

async function reorder(req, res, next) {
  try {
    const authContext = extractAuthContext(req);
    const result = await orderService.reorderFromOrder(
      req.params.id,
      req.body,
      authContext
    );
    return res.status(req.body?.mode === "create" ? 201 : 200).json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getOrders,
  trackOrder,
  getOrderById,
  cancelOrder,
  createCancelRequest,
  reorder,
};