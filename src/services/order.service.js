const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const { Order, Product, TimeSlot, Voucher } = require("../models");
const pricingService = require("./pricing.service");
const voucherService = require("./voucher.service");
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

  // Chỉ hiển thị ảnh khi bánh đã hoàn thành và đang ở
  // các trạng thái tiếp theo của quy trình giao/nhận.
  const canViewPhotos = ["done", "delivering", "delivered"].includes(
    order.status,
  );

  if (!canViewPhotos) {
    order.photoIds = [];
  }

  return order;
}

function getDateKey(value) {
  if (!value) return null;

  // Nếu là chuỗi YYYY-MM-DD từ frontend,
  // giữ nguyên ngày, không chuyển qua UTC.
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Chuyển ngày MongoDB sang ngày Việt Nam (UTC+7).
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeOrderItems(items = []) {
  return items.map((item) => {
    // Tạm tương thích với schema order.js hiện tại:
    // variant: String, surcharges: [Number].
    const variant =
      item.variant && typeof item.variant === "object"
        ? item.variant.label || null
        : item.variant || null;

    const surcharges = Array.isArray(item.surcharges)
      ? item.surcharges.map((item) =>
          typeof item === "object"
            ? Number(item.amount) || 0
            : Number(item) || 0,
        )
      : [];

    return {
      productId: item.productId,
      kind: item.kind,
      name: item.name,
      imageId: item.imageId || null,
      basePrice: item.basePrice,
      salePrice: item.salePrice ?? null,
      config: item.config || {},
      variant,
      surcharges,
      unitPrice: item.unitPrice,
      qty: item.qty,
      lineTotal: item.lineTotal,
    };
  });
}

/**
 * Kiểm tra quyền truy cập đơn hàng.
 *
 * Buyer: chỉ truy cập đơn thuộc tài khoản của mình.
 * Guest: chỉ truy cập đơn có trackToken hợp lệ.
 */
async function assertCustomerOrderAccess(
  orderId,
  { userId, trackPayload } = {},
) {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  if (userId) {
    if (order.userId && order.userId.toString() === userId.toString()) {
      return order;
    }

    throw new AppError(
      403,
      "ORDER_ACCESS_DENIED",
      "Bạn không có quyền truy cập đơn hàng này.",
    );
  }

  if (trackPayload && trackPayload.orderId) {
    const orderIdMatches =
      trackPayload.orderId.toString() === order._id.toString();

    const codeMatches = !trackPayload.code || trackPayload.code === order.code;

    if (orderIdMatches && codeMatches) {
      return order;
    }

    throw new AppError(
      403,
      "ORDER_ACCESS_DENIED",
      "Bạn không có quyền truy cập đơn hàng này.",
    );
  }

  throw new AppError(
    401,
    "ORDER_ACCESS_REQUIRED",
    "Vui lòng đăng nhập hoặc sử dụng mã tra cứu đơn hàng.",
  );
}

/**
 * Tạo đơn hàng mới.
 *
 * - Server tự tính lại giá.
 * - Giữ slot bằng atomic update.
 * - Reserve voucher nếu có.
 * - Tạo Order trong cùng MongoDB Transaction.
 * - Chưa tạo QR vì Payment Service chưa được triển khai.
 */
async function createOrder(payload = {}, authContext = {}) {
  const {
    items,
    voucherCode,
    receiveMethod,
    receiver,
    shippingAddress,
    pickupBranch,
    receiveDate,
    slotId,
    note,
    expectedTotal,
  } = payload;

  const userId = authContext.userId || null;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(
      400,
      "EMPTY_ORDER",
      "Đơn hàng phải có ít nhất một sản phẩm.",
    );
  }

  if (!["delivery", "pickup"].includes(receiveMethod)) {
    throw new AppError(
      400,
      "INVALID_RECEIVE_METHOD",
      "Phương thức nhận hàng không hợp lệ.",
    );
  }

  if (!receiver || !receiver.fullName || !receiver.phone) {
    throw new AppError(
      400,
      "INVALID_RECEIVER",
      "Vui lòng nhập đầy đủ thông tin người nhận.",
    );
  }

  if (!receiveDate || !slotId) {
    throw new AppError(
      400,
      "MISSING_DELIVERY_SLOT",
      "Vui lòng chọn ngày và khung giờ nhận bánh.",
    );
  }

  if (receiveMethod === "delivery" && !shippingAddress) {
    throw new AppError(
      400,
      "MISSING_SHIPPING_ADDRESS",
      "Vui lòng nhập địa chỉ giao hàng.",
    );
  }

  if (receiveMethod === "pickup" && !pickupBranch) {
    throw new AppError(
      400,
      "MISSING_PICKUP_BRANCH",
      "Vui lòng chọn chi nhánh nhận bánh.",
    );
  }

  if (!mongoose.Types.ObjectId.isValid(slotId)) {
    throw new AppError(
      400,
      "INVALID_SLOT",
      "Khung giờ nhận bánh không hợp lệ.",
    );
  }

  const receiveDateKey = getDateKey(receiveDate);

  if (!receiveDateKey) {
    throw new AppError(
      400,
      "INVALID_RECEIVE_DATE",
      "Ngày nhận bánh không hợp lệ.",
    );
  }

  if (
    !Number.isSafeInteger(Number(expectedTotal)) ||
    Number(expectedTotal) < 0
  ) {
    throw new AppError(
      400,
      "INVALID_EXPECTED_TOTAL",
      "Tổng tiền đơn hàng không hợp lệ.",
    );
  }

  // Bước 1: Server tự tính lại giá từ dữ liệu hiện tại.
  // Không sử dụng giá do Client gửi lên.
  const quoteInput = {
    items,
    voucherCode,
    receiveMethod,
  };

  const quote = await pricingService.quote(quoteInput);

  pricingService.assertOrderable(quote);
  pricingService.assertExpectedTotal(quote, Number(expectedTotal));

  const session = await mongoose.startSession();

  let createdOrder = null;

  try {
    await session.withTransaction(async () => {
      // Bước 2: Kiểm tra và giữ slot bằng atomic update.
      const slot = await TimeSlot.findOneAndUpdate(
        {
          _id: slotId,
          closed: false,
          $expr: {
            $lt: ["$used", "$capacity"],
          },
        },
        {
          $inc: { used: 1 },
        },
        {
          new: true,
          session,
        },
      );

      if (!slot) {
        throw new AppError(
          409,
          "SLOT_UNAVAILABLE",
          "Khung giờ này đã đầy hoặc không còn khả dụng. Vui lòng chọn khung giờ khác.",
        );
      }

      // Đảm bảo slot thuộc đúng ngày nhận hàng.
      if (getDateKey(slot.date) !== receiveDateKey) {
        throw new AppError(
          400,
          "SLOT_DATE_MISMATCH",
          "Khung giờ nhận bánh không thuộc ngày đã chọn.",
        );
      }

      // Bước 3: Reserve voucher nếu có.
      let voucherSnapshot = null;
      let finalDiscount = quote.discount || 0;

      const normalizedVoucherCode = String(voucherCode || "")
        .trim()
        .toUpperCase();

      if (normalizedVoucherCode) {
        const now = new Date();

        // Reserve voucher bằng điều kiện atomic.
        // Chỉ tăng usedCount nếu voucher vẫn hoạt động,
        // chưa hết hạn và chưa vượt giới hạn sử dụng.
        const reservedVoucher = await Voucher.findOneAndUpdate(
          {
            code: normalizedVoucherCode,
            active: true,
            $and: [
              {
                $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
              },
              {
                $or: [
                  { usageLimit: null },
                  {
                    $expr: {
                      $gt: ["$usageLimit", "$usedCount"],
                    },
                  },
                ],
              },
            ],
          },
          {
            $inc: { usedCount: 1 },
          },
          {
            new: true,
            session,
          },
        );

        if (!reservedVoucher) {
          throw new AppError(
            409,
            "VOUCHER_UNAVAILABLE",
            "Mã giảm giá vừa hết lượt sử dụng hoặc không còn khả dụng.",
          );
        }

        // Đánh giá lại thông tin voucher vừa reserve.
        // Trừ 1 ở usedCount để không tính lượt vừa reserve
        // là một lượt đã sử dụng trước đó.
        const evaluation = voucherService.evaluateVoucher(
          {
            ...reservedVoucher.toObject(),
            usedCount: Math.max(0, reservedVoucher.usedCount - 1),
          },
          quote.subtotal,
          { now },
        );

        if (!evaluation.valid) {
          throw new AppError(
            400,
            evaluation.reason || "INVALID_VOUCHER",
            evaluation.message || "Mã giảm giá không hợp lệ.",
          );
        }

        finalDiscount = evaluation.discount;

        voucherSnapshot = {
          code: reservedVoucher.code,
          type: reservedVoucher.type,
          value: reservedVoucher.value,
          discount: finalDiscount,
          restored: false,
        };
      }

      // Bước 4: Tính tổng tiền cuối cùng.
      const deliveryFee =
        receiveMethod === "delivery" ? quote.deliveryFee || 0 : 0;

      const finalTotal = quote.subtotal - finalDiscount + deliveryFee;

      // Kiểm tra lại tổng tiền trước khi tạo đơn.
      // Tránh trường hợp dữ liệu voucher thay đổi sau khi quote.
      if (finalTotal !== Number(expectedTotal)) {
        throw new AppError(
          409,
          "PRICE_CHANGED",
          "Giá trị đơn hàng đã thay đổi. Vui lòng kiểm tra lại đơn hàng trước khi đặt.",
        );
      }

      // Bước 5: Tạo đơn.
      const orderData = {
        code: generateOrderCode(),
        userId,

        receiver: {
          fullName: String(receiver.fullName).trim(),
          phone: String(receiver.phone).trim(),
        },

        receiveMethod,
        shippingAddress:
          receiveMethod === "delivery" ? shippingAddress : undefined,

        pickupBranch: receiveMethod === "pickup" ? pickupBranch : null,

        receiveDate: new Date(receiveDate),
        slotId: slot._id,
        slotLabel: slot.label,

        note: note ? String(note).trim() : "",

        items: normalizeOrderItems(quote.items),

        subtotal: quote.subtotal,
        discount: finalDiscount,
        deliveryFee,
        total: finalTotal,

        voucher: voucherSnapshot,

        status: "pending_payment",

        statusHistory: [
          {
            from: null,
            to: "pending_payment",
            actor: "customer",
            time: new Date(),
            reason: "Khách hàng tạo đơn hàng.",
          },
        ],

        payment: {
          status: "pending",
          attempts: [],
          slotHeld: true,
          deadlineAt: null,
          txnId: null,
          paidAt: null,
          confirmedBy: null,
          latePayment: false,
        },
      };

      const [order] = await Order.create([orderData], { session });

      createdOrder = order;
    });
  } finally {
    await session.endSession();
  }

  if (!createdOrder) {
    throw new AppError(
      500,
      "ORDER_CREATION_FAILED",
      "Không thể tạo đơn hàng. Vui lòng thử lại.",
    );
  }

  // Tạo VietQR mô phỏng ngay sau khi tạo đơn (hiệu lực 10 phút).
  const paymentService = require("./payment.service");
  await paymentService.initializeQr(createdOrder);
  createdOrder = await Order.findById(createdOrder._id);

  // Guest cần trackToken để xem đơn sau khi đặt.
  const trackToken = signTrackToken(createdOrder);

  return {
    order: sanitizeOrderForCustomer(createdOrder),
    trackToken,
  };
}

async function getCustomerOrders(userId, query = {}) {
  const { group, status, phone, from, to, page = 1, limit = 20 } = query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (userId) {
    filter.userId = userId;
  } else if (phone && String(phone).trim()) {
    const cleanPhone = normalizePhone(phone);
    const altPhone = cleanPhone.startsWith("0")
      ? "+84" + cleanPhone.slice(1)
      : cleanPhone;

    filter["receiver.phone"] = {
      $in: [cleanPhone, altPhone, String(phone).trim()],
    };
  } else {
    throw new AppError(
      401,
      "ORDER_ACCESS_REQUIRED",
      "Vui lòng đăng nhập hoặc cung cấp số điện thoại để tra cứu đơn hàng.",
    );
  }

  if (status) {
    filter.status = status;
  } else if (group && STATUS_GROUPS[group]) {
    filter.status = {
      $in: STATUS_GROUPS[group],
    };
  }

  if (from || to) {
    filter.createdAt = {};

    if (from) {
      const fromDate = new Date(from);

      if (Number.isNaN(fromDate.getTime())) {
        throw new AppError(
          400,
          "INVALID_DATE_FILTER",
          "Ngày bắt đầu không hợp lệ.",
        );
      }

      filter.createdAt.$gte = fromDate;
    }

    if (to) {
      const endDate = new Date(to);

      if (Number.isNaN(endDate.getTime())) {
        throw new AppError(
          400,
          "INVALID_DATE_FILTER",
          "Ngày kết thúc không hợp lệ.",
        );
      }

      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const [rawItems, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),

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
  const cleanCode = String(code || "")
    .trim()
    .toUpperCase();

  const cleanPhone = normalizePhone(phone);

  if (!cleanCode || !cleanPhone) {
    throw new AppError(
      400,
      "INVALID_TRACK_INPUT",
      "Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại.",
    );
  }

  const altPhone = cleanPhone.startsWith("0")
    ? "+84" + cleanPhone.slice(1)
    : cleanPhone;

  const order = await Order.findOne({
    code: cleanCode,
    "receiver.phone": {
      $in: [cleanPhone, altPhone, String(phone).trim()],
    },
  });

  if (!order) {
    throw new AppError(
      404,
      "ORDER_NOT_FOUND",
      "Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại.",
    );
  }

  const trackToken = signTrackToken(order);

  return {
    order: sanitizeOrderForCustomer(order),
    trackToken,
  };
}

async function getCustomerOrderById(orderId, authContext) {
  let order = await assertCustomerOrderAccess(orderId, authContext);
  order = await require("./payment.service").expireIfNeeded(order);
  return sanitizeOrderForCustomer(order);
}

async function cancelOrderByCustomer(
  orderId,
  { reasonCode, reason } = {},
  authContext,
) {
  const code = reasonCode || "other";
  const cleanReason = String(reason || "").trim();

  if (!CUSTOMER_CANCEL_REASONS.includes(code)) {
    throw new AppError(400, "VALIDATION_ERROR", "Lý do hủy đơn không hợp lệ.");
  }

  if (code === "other" && !cleanReason) {
    throw new AppError(
      400,
      "CANCEL_REASON_REQUIRED",
      "Vui lòng nhập lý do hủy đơn.",
    );
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

async function createCancelRequest(
  orderId,
  { reasonCode, reason } = {},
  authContext,
) {
  const code = reasonCode || "other";
  const cleanReason = String(reason || "").trim();

  if (!CUSTOMER_CANCEL_REASONS.includes(code)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Lý do yêu cầu hủy không hợp lệ.",
    );
  }

  if (code === "other" && !cleanReason) {
    throw new AppError(
      400,
      "CANCEL_REASON_REQUIRED",
      "Vui lòng nhập lý do yêu cầu hủy đơn.",
    );
  }

  const order = await assertCustomerOrderAccess(orderId, authContext);

  const allowedStatuses = ["accepted", "baking", "delivering"];

  if (!allowedStatuses.includes(order.status)) {
    throw new AppError(
      409,
      "INVALID_ORDER_STATUS_FOR_CANCEL_REQUEST",
      "Trạng thái đơn hiện tại không thể gửi yêu cầu hủy.",
    );
  }

  if (order.cancelRequest && order.cancelRequest.status) {
    throw new AppError(
      409,
      "CANCEL_REQUEST_ALREADY_EXISTS",
      "Đơn hàng này đã có yêu cầu hủy trước đó, không thể gửi thêm.",
    );
  }

  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: { $in: allowedStatuses },
      $or: [
        { "cancelRequest.status": { $exists: false } },
        { "cancelRequest.status": null },
      ],
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
    { new: true },
  );

  if (!updated) {
    throw new AppError(
      409,
      "CANCEL_REQUEST_ALREADY_EXISTS",
      "Đơn hàng đã thay đổi trạng thái hoặc đã có yêu cầu hủy.",
    );
  }

  return sanitizeOrderForCustomer(updated);
}

async function reorderFromOrder(orderId, payload = {}, authContext) {
  const {
    mode = "preview",
    selectedItemIds = null,
    receiver,
    receiveMethod,
    shippingAddress,
    pickupBranch,
    receiveDate,
    slotId,
    note,
  } = payload;

  const oldOrder = await assertCustomerOrderAccess(orderId, authContext);

  let targetItems = oldOrder.items;

  if (Array.isArray(selectedItemIds)) {
    if (selectedItemIds.length === 0) {
      throw new AppError(
        400,
        "EMPTY_REORDER_ITEMS",
        "Vui lòng chọn ít nhất 1 sản phẩm để mua lại.",
      );
    }

    const idSet = new Set(selectedItemIds.map(String));

    targetItems = oldOrder.items.filter((item) =>
      idSet.has(item._id.toString()),
    );

    if (targetItems.length === 0) {
      throw new AppError(
        400,
        "INVALID_REORDER_ITEMS",
        "Không tìm thấy sản phẩm được chọn trong đơn cũ.",
      );
    }
  }

  const productIds = targetItems.map((item) => item.productId);

  const products = await Product.find({
    _id: { $in: productIds },
  }).lean();

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  const evaluatedItems = [];
  const unavailableItems = [];

  for (const item of targetItems) {
    const product = productMap.get(item.productId.toString());

    if (!product || product.status !== "visible") {
      unavailableItems.push({
        orderItemId: item._id,
        productId: item.productId,
        name: item.name,
        reason: !product
          ? "Sản phẩm không còn tồn tại"
          : "Sản phẩm hiện đang tạm ẩn / ngừng bán",
      });

      continue;
    }

    const oldVariant =
      item.variant && typeof item.variant === "object"
        ? item.variant.label
        : item.variant;

    if (oldVariant && Array.isArray(product.variants)) {
      const matchedVariant = product.variants.find(
        (variant) => variant.label === oldVariant,
      );

      if (!matchedVariant || matchedVariant.active === false) {
        unavailableItems.push({
          orderItemId: item._id,
          productId: item.productId,
          name: item.name,
          reason: `Phân loại '${oldVariant}' hiện không còn khả dụng`,
        });

        continue;
      }
    }

    const currentBasePrice = product.basePrice;
    const currentSalePrice = product.salePrice ?? null;
    const effectiveBase =
      currentSalePrice !== null ? currentSalePrice : currentBasePrice;

    const surchargesSum = Array.isArray(item.surcharges)
      ? item.surcharges.reduce((sum, surcharge) => {
          const amount =
            typeof surcharge === "object" ? surcharge.amount : surcharge;

          return sum + (Number(amount) || 0);
        }, 0)
      : 0;

    const newUnitPrice = effectiveBase + surchargesSum;
    const newLineTotal = newUnitPrice * item.qty;

    evaluatedItems.push({
      orderItemId: item._id,
      productId: product._id,
      kind: product.kind,
      name: product.name,
      imageId:
        (product.imageIds && product.imageIds[0]) || item.imageId || null,
      basePrice: currentBasePrice,
      salePrice: currentSalePrice,
      config: item.config || {},
      variant: oldVariant || null,
      surcharges: item.surcharges || [],
      oldUnitPrice: item.unitPrice,
      unitPrice: newUnitPrice,
      priceChanged: newUnitPrice !== item.unitPrice,
      qty: item.qty,
      lineTotal: newLineTotal,
    });
  }

  const subtotal = evaluatedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );

  if (mode === "preview") {
    return {
      canReorderAll: unavailableItems.length === 0 && evaluatedItems.length > 0,
      availableItems: evaluatedItems,
      unavailableItems,
      subtotal,
    };
  }

  if (mode !== "create") {
    throw new AppError(
      400,
      "INVALID_REORDER_MODE",
      "Chế độ mua lại không hợp lệ.",
    );
  }

  if (evaluatedItems.length === 0) {
    throw new AppError(
      409,
      "ALL_ITEMS_UNAVAILABLE",
      "Tất cả sản phẩm được chọn hiện đều đã ngừng bán, không thể tạo đơn mới.",
    );
  }

  // Không tạo Order trực tiếp ở đây.
  // Chuyển dữ liệu sang createOrder để dùng chung quy trình
  // tính giá, giữ slot và transaction.
  const checkoutItems = evaluatedItems.map((item) => ({
    productId: item.productId,
    qty: item.qty,
    config: item.config,
    variant: item.variant ? { label: item.variant } : null,
  }));

  const finalMethod = receiveMethod || oldOrder.receiveMethod;

  const result = await createOrder(
    {
      items: checkoutItems,
      receiveMethod: finalMethod,
      receiver: receiver || oldOrder.receiver,
      shippingAddress:
        finalMethod === "delivery"
          ? shippingAddress || oldOrder.shippingAddress
          : undefined,
      pickupBranch:
        finalMethod === "pickup"
          ? pickupBranch || oldOrder.pickupBranch
          : undefined,
      receiveDate,
      slotId,
      note: note !== undefined ? note : oldOrder.note,
      expectedTotal: payload.expectedTotal,
    },
    authContext,
  );

  return {
    ...result,
    unavailableItems,
  };
}

module.exports = {
  createOrder,
  getCustomerOrders,
  trackOrderByCodeAndPhone,
  getCustomerOrderById,
  cancelOrderByCustomer,
  createCancelRequest,
  reorderFromOrder,
};
