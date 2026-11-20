const AppError = require("../utils/AppError");
const { Order, Product } = require("../models");
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

function generateOrderCode() {
  const now = new Date();
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SC${yymmdd}-${rand}`;
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

async function reorderFromOrder(orderId, payload = {}, authContext) {
  const {
    mode = "preview", // "preview" (kiểm tra hiển thị & tính giá) | "create" (tạo đơn mới)
    selectedItemIds = null, // null = mua nguyên đơn; mảng _id của orderItem = chọn riêng
    receiver,
    receiveMethod,
    shippingAddress,
    pickupBranch,
    receiveDate,
    slotId,
    slotLabel,
    note,
  } = payload;

  const oldOrder = await assertCustomerOrderAccess(orderId, authContext);

  let targetItems = oldOrder.items;
  if (Array.isArray(selectedItemIds)) {
    if (selectedItemIds.length === 0) {
      throw new AppError(400, "EMPTY_REORDER_ITEMS", "Vui lòng chọn ít nhất 1 sản phẩm để mua lại.");
    }
    const idSet = new Set(selectedItemIds.map(String));
    targetItems = oldOrder.items.filter((item) => idSet.has(item._id.toString()));
    if (targetItems.length === 0) {
      throw new AppError(400, "INVALID_REORDER_ITEMS", "Không tìm thấy sản phẩm được chọn trong đơn cũ.");
    }
  }

  const productIds = targetItems.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const evaluatedItems = [];
  const unavailableItems = [];

  for (const item of targetItems) {
    const product = productMap.get(item.productId.toString());

    if (!product || product.status !== "visible") {
      unavailableItems.push({
        orderItemId: item._id,
        productId: item.productId,
        name: item.name,
        reason: !product ? "Sản phẩm không còn tồn tại" : "Sản phẩm hiện đang tạm ẩn / ngừng bán",
      });
      continue;
    }

    if (item.variant && Array.isArray(product.variants) && product.variants.length > 0) {
      const matchedVariant = product.variants.find((v) => v.label === item.variant);
      if (matchedVariant && matchedVariant.active === false) {
        unavailableItems.push({
          orderItemId: item._id,
          productId: item.productId,
          name: item.name,
          reason: `Phân loại '${item.variant}' hiện đã ngừng bán`,
        });
        continue;
      }
    }

    const currentBasePrice = product.basePrice;
    const currentSalePrice = product.salePrice ?? null;
    const effectiveBase = currentSalePrice !== null ? currentSalePrice : currentBasePrice;
    const surchargesSum = Array.isArray(item.surcharges)
      ? item.surcharges.reduce((sum, val) => sum + (Number(val) || 0), 0)
      : 0;
    const newUnitPrice = effectiveBase + surchargesSum;
    const newLineTotal = newUnitPrice * item.qty;

    evaluatedItems.push({
      orderItemId: item._id,
      productId: product._id,
      kind: product.kind,
      name: product.name,
      imageId: (product.imageIds && product.imageIds[0]) || item.imageId || null,
      basePrice: currentBasePrice,
      salePrice: currentSalePrice,
      config: item.config || {},
      variant: item.variant || null,
      surcharges: item.surcharges || [],
      oldUnitPrice: item.unitPrice,
      unitPrice: newUnitPrice,
      priceChanged: newUnitPrice !== item.unitPrice,
      qty: item.qty,
      lineTotal: newLineTotal,
    });
  }

  const subtotal = evaluatedItems.reduce((sum, i) => sum + i.lineTotal, 0);

  if (mode === "preview") {
    return {
      canReorderAll: unavailableItems.length === 0 && evaluatedItems.length > 0,
      availableItems: evaluatedItems,
      unavailableItems,
      subtotal,
    };
  }

  if (evaluatedItems.length === 0) {
    throw new AppError(
      409,
      "ALL_ITEMS_UNAVAILABLE",
      "Tất cả sản phẩm được chọn hiện đều đã ngừng bán, không thể tạo đơn mới."
    );
  }

  if (!receiveDate || !slotId || !slotLabel) {
    throw new AppError(
      400,
      "MISSING_DELIVERY_SLOT",
      "Vui lòng chọn ngày nhận và khung giờ nhận bánh cho đơn mới."
    );
  }

  const finalMethod = receiveMethod || oldOrder.receiveMethod;
  const deliveryFee = finalMethod === "delivery" ? (oldOrder.deliveryFee || 0) : 0;
  const total = subtotal + deliveryFee;

  const newOrder = await Order.create({
    code: generateOrderCode(),
    userId: authContext.userId || oldOrder.userId || null,
    receiver: receiver || oldOrder.receiver,
    receiveMethod: finalMethod,
    shippingAddress: finalMethod === "delivery" ? (shippingAddress || oldOrder.shippingAddress) : undefined,
    pickupBranch: finalMethod === "pickup" ? (pickupBranch || oldOrder.pickupBranch) : null,
    receiveDate: new Date(receiveDate),
    slotId,
    slotLabel,
    note: note !== undefined ? note : oldOrder.note,
    items: evaluatedItems.map(({ orderItemId, oldUnitPrice, priceChanged, ...cleanItem }) => cleanItem),
    subtotal,
    discount: 0,
    deliveryFee,
    total,
    status: "pending_payment",
    statusHistory: [
      {
        from: null,
        to: "pending_payment",
        actor: "customer",
        time: new Date(),
        reason: `Mua lại từ đơn ${oldOrder.code}`,
      },
    ],
  });

  return {
    order: sanitizeOrderForCustomer(newOrder),
    unavailableItems,
  };
}

module.exports = {
  getCustomerOrders,
  trackOrderByCodeAndPhone,
  getCustomerOrderById,
  cancelOrderByCustomer,
  createCancelRequest,
  reorderFromOrder,
};