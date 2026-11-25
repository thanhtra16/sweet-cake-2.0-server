'use strict';

/**
 * Logic voucher dùng chung cho POST /vouchers/validate, POST /orders/quote và POST /orders (BR15).
 * Hàm evaluateVoucher là hàm thuần (không đọc DB) nên cả ba nơi gọi cùng một kết quả.
 */

const REASON = {
  NOT_FOUND: 'NOT_FOUND',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
  USED_UP: 'USED_UP',
  MIN_ORDER_NOT_MET: 'MIN_ORDER_NOT_MET',
  NO_VALID_ITEMS: 'NO_VALID_ITEMS',
};

const MESSAGE = {
  NOT_FOUND: 'Mã giảm giá không tồn tại.',
  INACTIVE: 'Mã giảm giá hiện không được áp dụng.',
  EXPIRED: 'Mã giảm giá đã hết hạn.',
  USED_UP: 'Mã giảm giá đã hết lượt sử dụng.',
  NO_VALID_ITEMS: 'Giỏ hàng chưa có sản phẩm hợp lệ để áp dụng mã.',
};

const normalizeCode = (code) => String(code == null ? '' : code).trim().toUpperCase();

function fail(reason, message) {
  return { valid: false, reason, message: message || MESSAGE[reason], discount: 0, voucher: null };
}

/**
 * @param {object|null} voucher  document vouchers (hoặc null nếu không tìm thấy)
 * @param {number} subtotal      Tạm tính do server tính (không nhận từ client)
 * @param {{now?: Date}} [opts]
 */
function evaluateVoucher(voucher, subtotal, { now = new Date() } = {}) {
  if (!voucher) return fail(REASON.NOT_FOUND);
  if (!voucher.active) return fail(REASON.INACTIVE);
  if (voucher.expiresAt && new Date(voucher.expiresAt) <= now) return fail(REASON.EXPIRED);
  if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) return fail(REASON.USED_UP);
  if (!(subtotal > 0)) return fail(REASON.NO_VALID_ITEMS);
  if (voucher.minOrder && subtotal < voucher.minOrder) {
    return fail(
      REASON.MIN_ORDER_NOT_MET,
      `Đơn hàng cần tối thiểu ${voucher.minOrder.toLocaleString('vi-VN')}đ để dùng mã này.`
    );
  }

  let discount = voucher.type === 'percent' ? Math.round((subtotal * voucher.value) / 100) : voucher.value;
  if (voucher.maxDiscount != null) discount = Math.min(discount, voucher.maxDiscount);
  discount = Math.min(discount, subtotal); // không giảm quá Tạm tính

  return {
    valid: true,
    reason: null,
    message: null,
    discount,
    voucher: { code: voucher.code, type: voucher.type, value: voucher.value, discount },
  };
}

/** Tra voucher theo mã (mã không phân biệt hoa thường). */
async function findVoucherByCode(code, deps = {}) {
  const Voucher = deps.Voucher || require('../models/voucher.model');
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return Voucher.findOne({ code: normalized }).lean();
}

/**
 * Trừ một lượt dùng một cách nguyên tử khi tạo đơn (chống hai khách cùng lấy lượt cuối).
 * Trả document sau khi tăng, hoặc null nếu không còn đủ điều kiện -> orderService ném VOUCHER_INVALID.
 * Việc hoàn lượt (kiểm tra order.voucher.restored) thuộc luồng hủy đơn, không nằm ở đây.
 */
async function reserveVoucherUse(code, { now = new Date(), Voucher } = {}) {
  const Model = Voucher || require('../models/voucher.model');
  return Model.findOneAndUpdate(
    {
      code: normalizeCode(code),
      active: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      $expr: { $gt: [{ $ifNull: ['$usageLimit', Number.MAX_SAFE_INTEGER] }, '$usedCount'] },
    },
    { $inc: { usedCount: 1 } },
    { new: true }
  ).lean();
}

module.exports = { REASON, normalizeCode, evaluateVoucher, findVoucherByCode, reserveVoucherUse };
