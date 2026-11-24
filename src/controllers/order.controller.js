const orderService = require("../services/order.service");
const pricingService = require("../services/pricing.service");

/**
 * Lấy ngữ cảnh xác thực từ request.
 *
 * Buyer: req.user được gắn bởi auth middleware.
 * Guest: req.user = null.
 *
 * TrackToken: dùng cho các thao tác trên đơn đã tạo.
 */
function extractAuthContext(req) {
  const userId = req.user ? req.user._id : null;

  const trackPayload = req.trackedOrder
    ? {
        orderId: req.trackedOrder._id,
        code: req.trackedOrder.code,
      }
    : null;

  return {
    userId,
    trackPayload,
  };
}

/**
 * GET /api/orders
 * Lấy danh sách đơn hàng của Buyer.
 */
async function getOrders(req, res, next) {
  try {
    const userId = req.user ? req.user._id : null;

    const result = await orderService.getCustomerOrders(userId, req.query);

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/orders
 * Tạo đơn hàng mới cho Guest hoặc Buyer.
 */
async function createOrder(req, res, next) {
  try {
    const authContext = extractAuthContext(req);

    const result = await orderService.createOrder(req.body, authContext);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/orders/track
 * Tra cứu đơn bằng mã đơn và số điện thoại.
 */
async function trackOrder(req, res, next) {
  try {
    const result = await orderService.trackOrderByCodeAndPhone(req.body);

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/orders/:id
 * Buyer hoặc Guest có TrackToken xem chi tiết đơn.
 */
async function getOrderById(req, res, next) {
  try {
    const authContext = extractAuthContext(req);

    const order = await orderService.getCustomerOrderById(
      req.params.id,
      authContext,
    );

    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/orders/:id/cancel
 * Khách hàng hủy đơn.
 */
async function cancelOrder(req, res, next) {
  try {
    const authContext = extractAuthContext(req);

    const order = await orderService.cancelOrderByCustomer(
      req.params.id,
      req.body,
      authContext,
    );

    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/orders/:id/cancel-request
 * Gửi yêu cầu hủy đơn.
 */
async function createCancelRequest(req, res, next) {
  try {
    const authContext = extractAuthContext(req);

    const order = await orderService.createCancelRequest(
      req.params.id,
      req.body,
      authContext,
    );

    return res.status(201).json(order);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/orders/:id/reorder
 * Xem trước hoặc tạo đơn mua lại.
 */
async function reorder(req, res, next) {
  try {
    const authContext = extractAuthContext(req);

    const result = await orderService.reorderFromOrder(
      req.params.id,
      req.body,
      authContext,
    );

    return res.status(req.body?.mode === "create" ? 201 : 200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/orders/quote
 * Tính giá tạm tính cho đơn hàng.
 */
async function quoteOrder(req, res, next) {
  try {
    const data = await pricingService.quote(req.body);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getOrders,
  createOrder,
  trackOrder,
  getOrderById,
  cancelOrder,
  createCancelRequest,
  reorder,
  quoteOrder,
};
