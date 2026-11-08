'use strict';

/**
 * Áp dụng kế hoạch chuyển trạng thái (orderStatus.rules.js) lên DB.
 * Mọi nơi đổi trạng thái đơn đều phải đi qua transitionOrder: Admin đổi trạng thái, khách hủy đơn,
 * xác nhận thanh toán, job tự hủy quá hạn (BR17), chấp nhận yêu cầu hủy.
 */

const AppError = require('../utils/AppError');
const { planTransition } = require('./orderStatus.rules');

const FORBIDDEN_PATCH_KEYS = ['status', 'statusHistory', '_id'];

function defaultRepo() {
  const Order = require('../models/order.model');
  return {
    findById: (id) => Order.findById(id).lean(),
    // Chỉ cập nhật khi đơn vẫn đang ở trạng thái `from`: hai request đồng thời không thể cùng chuyển một đơn.
    updateIfStatus: (id, from, update) => Order.findOneAndUpdate({ _id: id, status: from }, update, { new: true }).lean(),
  };
}

/** Hiệu ứng phụ chạy một lần sau khi đổi trạng thái thành công. Mỗi hiệu ứng tự bảo đảm idempotent. */
const defaultEffects = {
  async RELEASE_SLOT({ slotId }) {
    const TimeSlot = require('../models/timeSlot.model');
    await TimeSlot.updateOne({ _id: slotId, used: { $gt: 0 } }, { $inc: { used: -1 } });
  },
  async RESTORE_VOUCHER({ orderId, code }) {
    const Order = require('../models/order.model');
    const Voucher = require('../models/voucher.model');
    // Đánh dấu restored trước, chỉ hoàn khi đánh dấu thành công: không bao giờ hoàn hai lần (BR15).
    const marked = await Order.updateOne({ _id: orderId, 'voucher.restored': { $ne: true } }, { $set: { 'voucher.restored': true } });
    if (marked.modifiedCount === 1) {
      await Voucher.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    }
  },
};

/**
 * @param {string} orderId
 * @param {string} to
 * @param {object} opts  { actor:{type,id}, reasonCode, reason, cause, via, patch, now }
 *   patch: các trường cần ghi cùng lúc với đổi trạng thái (ví dụ payment.status, payment.paidAt,
 *          payment.confirmedBy, payment.txnId khi xác nhận thanh toán; cancelRequest.* khi quyết định yêu cầu hủy).
 * @param {object} deps  { repo, getSettings, effects, notify, logger } để thay thế khi kiểm thử
 */
async function transitionOrder(orderId, to, opts = {}, deps = {}) {
  const repo = deps.repo || defaultRepo();
  const logger = deps.logger || console;
  const now = opts.now || new Date();
  const patch = opts.patch || {};

  for (const key of Object.keys(patch)) {
    if (FORBIDDEN_PATCH_KEYS.includes(key) || key.startsWith('statusHistory')) {
      throw new AppError(500, 'INTERNAL_ERROR', `patch không được ghi đè ${key}.`);
    }
  }

  const order = await repo.findById(orderId);
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');

  let settings = {};
  if (to === 'cancelled') {
    const getSettings = deps.getSettings || (() => require('../models/settings.model').findOne().lean());
    settings = (await getSettings()) || {};
  }

  const plan = planTransition(order, to, { ...opts, now, settings });

  const updated = await repo.updateIfStatus(orderId, plan.from, {
    $set: { ...plan.set, ...patch, updatedAt: now },
    $push: { statusHistory: plan.historyEntry },
  });
  if (!updated) {
    throw new AppError(409, 'INVALID_TRANSITION', 'Trạng thái đơn vừa được thay đổi, vui lòng tải lại.', { from: plan.from, to });
  }

  // Từ đây trạng thái đã đổi: lỗi ở hiệu ứng phụ hay thông báo chỉ ghi log, không làm hỏng kết quả.
  const effects = deps.effects || defaultEffects;
  for (const effect of plan.effects) {
    try {
      await effects[effect.type](effect);
    } catch (err) {
      logger.error(`[orderStatus] hiệu ứng ${effect.type} lỗi cho đơn ${orderId}:`, err);
    }
  }
  if (plan.notification && deps.notify) {
    try {
      await deps.notify(plan.notification);
    } catch (err) {
      logger.error(`[orderStatus] gửi thông báo lỗi cho đơn ${orderId}:`, err);
    }
  }

  return updated;
}

module.exports = { transitionOrder, defaultEffects };
