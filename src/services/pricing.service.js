'use strict';

/**
 * Pricing / quote service (BR1, BR5, BR6, BR7, BR8, BR10, BR14, BR15).
 * - computeQuote: hàm thuần, nhận dữ liệu đã nạp, dễ kiểm thử.
 * - quote: nạp dữ liệu từ MongoDB rồi gọi computeQuote (dùng cho POST /orders/quote và POST /orders).
 * Server luôn tính lại giá; giá trên giao diện chỉ để tham khảo (BR7).
 */

const AppError = require('../utils/AppError');
const voucherService = require('./voucher.service');

const MAX_QTY = 10; // BR10

const REASON = {
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_HIDDEN: 'PRODUCT_HIDDEN', // BR1
  INVALID_QTY: 'INVALID_QTY',
  SIZE_REQUIRED: 'SIZE_REQUIRED',
  SIZE_NOT_AVAILABLE: 'SIZE_NOT_AVAILABLE',
  OPTION_REQUIRED: 'OPTION_REQUIRED',
  OPTION_NOT_AVAILABLE: 'OPTION_NOT_AVAILABLE',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG', // BR8
  MESSAGE_NOT_ALLOWED: 'MESSAGE_NOT_ALLOWED', // BR8: sản phẩm không có size
  MESSAGE_BANNED_WORD: 'MESSAGE_BANNED_WORD', // BR8 (Could)
  VARIANT_REQUIRED: 'VARIANT_REQUIRED',
  VARIANT_INVALID: 'VARIANT_INVALID',
  PRODUCT_KIND_INVALID: 'PRODUCT_KIND_INVALID',
};

// Các tùy chọn của bánh ngoài size. filling luôn bắt buộc (BR4); các tùy chọn khác theo customization.required.
const CAKE_OPTIONS = [
  { key: 'filling', list: 'fillings', alwaysRequired: true },
  { key: 'base', list: 'bases' },
  { key: 'frostingColor', list: 'frostingColors' },
  { key: 'sweetness', list: 'sweetnessLevels' },
];

const round = (n) => Math.round(n); // BR6: làm tròn đến đồng

/**
 * Đếm ký tự lời nhắn (BR8): tính cả khoảng trắng, chuẩn hóa NFC để chữ tiếng Việt gõ dạng
 * tổ hợp vẫn đếm đúng, đếm theo ký tự hiển thị chứ không theo UTF-16.
 * FE dùng đúng công thức này cho bộ đếm "x/y ký tự".
 */
const countMessageChars = (message) => Array.from(String(message == null ? '' : message).normalize('NFC')).length;

const findActive = (list, name) => (list || []).find((o) => o.active !== false && o.name === name);

function invalidLine(reason, field = null) {
  return {
    valid: false, reason, field,
    unitPrice: 0, priceChanged: false,
    basePrice: null, salePrice: null, surcharges: [], variant: null, lineTotal: 0,
  };
}

/** Kiểm tra cấu hình bánh, trả {reason, field} nếu sai; đồng thời ghi phụ phí vào `surcharges`. */
function applyCakeConfig(config, product, customization, surcharges) {
  const sizes = product.availableSizes || [];
  const message = config.message == null ? '' : String(config.message);

  if (sizes.length > 0) {
    if (!config.size) return { reason: REASON.SIZE_REQUIRED, field: 'size' };
    const size = findActive(customization.sizes, config.size);
    if (!sizes.includes(config.size) || !size) return { reason: REASON.SIZE_NOT_AVAILABLE, field: 'size' };
    if (size.priceDiff) surcharges.push({ type: 'size', name: size.name, amount: size.priceDiff }); // BR3
    if (countMessageChars(message) > size.maxChars) return { reason: REASON.MESSAGE_TOO_LONG, field: 'message' };
  } else {
    // Sản phẩm không có kích thước (cupcake): không có size, không có lời nhắn.
    if (config.size) return { reason: REASON.SIZE_NOT_AVAILABLE, field: 'size' };
    if (message !== '') return { reason: REASON.MESSAGE_NOT_ALLOWED, field: 'message' };
  }

  if (message !== '') {
    const lower = message.toLowerCase();
    if ((customization.bannedWords || []).some((w) => w && lower.includes(String(w).toLowerCase()))) {
      return { reason: REASON.MESSAGE_BANNED_WORD, field: 'message' };
    }
  }

  for (const opt of CAKE_OPTIONS) {
    const chosen = config[opt.key];
    const required = opt.alwaysRequired || Boolean(customization.required && customization.required[opt.key]);
    if (!chosen) {
      if (required) return { reason: REASON.OPTION_REQUIRED, field: opt.key };
      continue;
    }
    const item = findActive(customization[opt.list], chosen);
    const restricted = opt.key === 'filling' && (product.availableFillings || []).length > 0;
    if (!item || (restricted && !product.availableFillings.includes(chosen))) {
      return { reason: REASON.OPTION_NOT_AVAILABLE, field: opt.key };
    }
    if (item.priceDiff) surcharges.push({ type: opt.key, name: item.name, amount: item.priceDiff });
  }
  return null;
}

/** Tính một dòng hàng. `line.unitPrice` (nếu có) là giá khách đã thấy, dùng để suy ra priceChanged. */
function priceLine(line, product, customization) {
  if (!product) return invalidLine(REASON.PRODUCT_NOT_FOUND);
  if (product.status !== 'visible') return invalidLine(REASON.PRODUCT_HIDDEN);
  if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_QTY) return invalidLine(REASON.INVALID_QTY, 'qty');

  const surcharges = [];
  let variant = null;

  if (product.kind === 'cake') {
    const err = applyCakeConfig(line.config || {}, product, customization, surcharges);
    if (err) return invalidLine(err.reason, err.field);
  } else if (product.kind === 'accessory') {
    // BR5: phụ kiện có biến thể nhưng biến thể không đổi giá.
    const variants = product.variants || [];
    if (variants.length > 0) {
      if (!line.variant) return invalidLine(REASON.VARIANT_REQUIRED, 'variant');
      const found = variants.find((v) => v.active !== false && String(v._id) === String(line.variant));
      if (!found) return invalidLine(REASON.VARIANT_INVALID, 'variant');
      variant = { _id: found._id, label: found.label };
    } else if (line.variant) {
      return invalidLine(REASON.VARIANT_INVALID, 'variant');
    }
  } else {
    return invalidLine(REASON.PRODUCT_KIND_INVALID);
  }

  // BR6: giá khuyến mãi thay giá cơ bản; phụ phí không được giảm.
  const basePart = product.salePrice != null ? product.salePrice : product.basePrice;
  const unitPrice = round(basePart + surcharges.reduce((s, x) => s + x.amount, 0));
  const priceChanged = Number.isFinite(line.unitPrice) && line.unitPrice !== unitPrice;

  return {
    valid: true, reason: null, field: null,
    unitPrice, priceChanged,
    basePrice: product.basePrice,
    salePrice: product.salePrice != null ? product.salePrice : null,
    surcharges, variant,
    lineTotal: unitPrice * line.qty,
  };
}

/**
 * Hàm thuần. data = { products: Map<string, product>, customization, settings, voucher|null, now }.
 * Dòng không hợp lệ không được cộng vào Tạm tính.
 * Voucher sai không ném lỗi ở đây: kết quả nằm trong `voucher` (quote vẫn hiển thị tổng không giảm).
 */
function computeQuote({ items, voucherCode, receiveMethod }, data) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Danh sách dòng hàng không được để trống.');
  }
  if (receiveMethod != null && !['delivery', 'pickup'].includes(receiveMethod)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Hình thức nhận bánh không hợp lệ.');
  }
  const { products, customization, settings, voucher = null, now = new Date() } = data;

  const lines = items.map((line) => priceLine(line, products.get(String(line.productId)), customization));
  const subtotal = lines.reduce((sum, l) => (l.valid ? sum + l.lineTotal : sum), 0);

  let discount = 0;
  let voucherResult = null;
  if (voucherCode) {
    voucherResult = voucherService.evaluateVoucher(voucher, subtotal, { now });
    voucherResult.code = voucherService.normalizeCode(voucherCode);
    discount = voucherResult.valid ? voucherResult.discount : 0;
  }

  const deliveryFee = receiveMethod === 'delivery' ? settings.deliveryFee : 0; // BR14
  return {
    valid: lines.every((l) => l.valid),
    items: lines,
    subtotal,
    discount,
    deliveryFee,
    total: subtotal - discount + deliveryFee, // BR6
    voucher: voucherResult,
  };
}

/** Nạp dữ liệu từ MongoDB rồi tính. deps cho phép thay model khi kiểm thử. */
async function quote(input, deps = {}) {
  const Product = deps.Product || require('../models/product.model');
  const Customization = deps.Customization || require('../models/customization.model');
  const Settings = deps.Settings || require('../models/settings.model');

  const ids = [...new Set((input.items || []).map((l) => String(l.productId)))];
  const [docs, customization, settings, voucher] = await Promise.all([
    Product.find({ _id: { $in: ids } }).lean(),
    Customization.findOne().lean(),
    Settings.findOne().lean(),
    input.voucherCode ? voucherService.findVoucherByCode(input.voucherCode, deps) : null,
  ]);
  return computeQuote(input, {
    products: new Map(docs.map((p) => [String(p._id), p])),
    customization,
    settings,
    voucher,
    now: deps.now || new Date(),
  });
}

/** Dùng trước khi tạo đơn: mọi dòng hợp lệ, voucher hợp lệ. */
function assertOrderable(q) {
  const bad = q.items.find((l) => !l.valid);
  if (bad) {
    if (bad.reason === REASON.PRODUCT_HIDDEN) {
      throw new AppError(409, 'PRODUCT_HIDDEN', 'Có sản phẩm trong đơn đã bị ẩn. Vui lòng xóa khỏi giỏ hàng.', { reason: bad.reason });
    }
    throw new AppError(400, 'VALIDATION_ERROR', 'Có dòng hàng không hợp lệ.', { reason: bad.reason, field: bad.field });
  }
  if (q.voucher && !q.voucher.valid) {
    throw new AppError(409, 'VOUCHER_INVALID', q.voucher.message, { reason: q.voucher.reason });
  }
}

/** BR7: tổng khách đã thấy phải khớp tổng server vừa tính, nếu lệch thì khách cần xác nhận lại. */
function assertExpectedTotal(q, expectedTotal) {
  if (!Number.isInteger(expectedTotal)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'expectedTotal phải là số nguyên.');
  }
  if (q.total !== expectedTotal) {
    throw new AppError(409, 'PRICE_CHANGED', 'Giá đơn hàng đã thay đổi. Vui lòng kiểm tra và xác nhận lại.', { total: q.total });
  }
}

module.exports = { REASON, MAX_QTY, countMessageChars, priceLine, computeQuote, quote, assertOrderable, assertExpectedTotal };
