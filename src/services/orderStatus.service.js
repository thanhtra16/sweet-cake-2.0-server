"use strict";

/**
- Áp dụng kế hoạch chuyển trạng thái (orderStatus.rules.js) lên DB.
- Mọi nơi đổi trạng thái đơn đều phải đi qua transitionOrder: Admin đổi trạng thái, khách hủy đơn,
- xác nhận thanh toán, job tự hủy quá hạn (BR17), chấp nhận yêu cầu hủy.
 */
const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const { planTransition } = require("./orderStatus.rules");
const notificationService = require("./notification.service");

const FORBIDDEN_PATCH_KEYS = ["status", "statusHistory", "_id"];

function defaultRepo() {
  const Order = require("../models/order");
  return {
    findById: (id) => Order.findById(id).lean(),
    // Chỉ cập nhật khi đơn vẫn đang ở trạng thái `from`: hai request đồng thời không thể cùng chuyển một đơn.
    updateIfStatus: (id, from, update) =>
      Order.findOneAndUpdate({ _id: id, status: from }, update, {
        new: true,
      }).lean(),
  };
}

/** Hiệu ứng phụ chạy một lần sau khi đổi trạng thái thành công. Mỗi hiệu ứng tự bảo đảm idempotent. */
const defaultEffects = {
  async RELEASE_SLOT({ slotId }) {
    const TimeSlot = require("../models/timeslots");
    await TimeSlot.updateOne(
      { _id: slotId, used: { $gt: 0 } },
      { $inc: { used: -1 } },
    );
  },

  async RESTORE_VOUCHER({ orderId, code }) {
    const Order = require("../models/order");
    const Voucher = require("../models/vouchers");

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Chỉ một request được quyền đánh dấu voucher đã hoàn.
        const marked = await Order.updateOne(
          {
            _id: orderId,
            "voucher.code": code,
            "voucher.restored": { $ne: true },
          },
          {
            $set: { "voucher.restored": true },
          },
          { session },
        );

        // Đã được hoàn trước đó: không thực hiện thêm lần nữa.
        if (marked.modifiedCount !== 1) return;

        // Giảm số lượt sử dụng trong cùng transaction.
        const restored = await Voucher.updateOne(
          {
            code,
            usedCount: { $gt: 0 },
          },
          {
            $inc: { usedCount: -1 },
          },
          { session },
        );

        // Không tìm thấy voucher hoặc không còn lượt sử dụng:
        // rollback cả thao tác đánh dấu restored phía trên.
        if (restored.modifiedCount !== 1) {
          throw new Error(
            `Không thể hoàn lượt sử dụng voucher ${code} cho đơn ${orderId}.`,
          );
        }
      });
    } finally {
      await session.endSession();
    }
  },
};

/**
- @param {string} orderId
- @param {string} to
- @param {object} opts  { actor:{type,id}, reasonCode, reason, cause, via, patch, now }
-   patch: các trường cần ghi cùng lúc với đổi trạng thái (ví dụ payment.status, payment.paidAt,
-          payment.confirmedBy, payment.txnId khi xác nhận thanh toán; cancelRequest.* khi quyết định yêu cầu hủy).
- @param {object} deps  { repo, getSettings, effects, notify, logger } để thay thế khi kiểm thử
 */
async function transitionOrder(orderId, to, opts = {}, deps = {}) {
  const repo = deps.repo || defaultRepo();
  const logger = deps.logger || console;
  const now = opts.now || new Date();
  const patch = opts.patch || {};

  for (const key of Object.keys(patch)) {
    if (FORBIDDEN_PATCH_KEYS.includes(key) || key.startsWith("statusHistory")) {
      throw new AppError(
        500,
        "INTERNAL_ERROR",
        `patch không được ghi đè ${key}.`,
      );
    }
  }

  const order = await repo.findById(orderId);
  if (!order) throw new AppError(404, "NOT_FOUND", "Không tìm thấy đơn hàng.");

  let settings = {};
  if (to === "cancelled") {
    const getSettings =
      deps.getSettings ||
      (() => require("../models/settings").findOne().lean());
    settings = (await getSettings()) || {};
  }

  const plan = planTransition(order, to, { ...opts, now, settings });

  const updated = await repo.updateIfStatus(orderId, plan.from, {
    $set: { ...plan.set, ...patch, updatedAt: now },
    $push: { statusHistory: plan.historyEntry },
  });
  if (!updated) {
    throw new AppError(
      409,
      "INVALID_TRANSITION",
      "Trạng thái đơn vừa được thay đổi, vui lòng tải lại.",
      { from: plan.from, to },
    );
  }

  // Từ đây trạng thái đã đổi: lỗi ở hiệu ứng phụ hay thông báo chỉ ghi log, không làm hỏng kết quả.
  const effects = deps.effects || defaultEffects;
  for (const effect of plan.effects) {
    try {
      await effects[effect.type](effect);
    } catch (err) {
      logger.error(
        `[orderStatus] hiệu ứng ${effect.type} lỗi cho đơn ${orderId}:`,
        err,
      );
    }
  }
  const notify = deps.notify || notificationService.notify;

  if (plan.notification) {
    try {
      await notify(plan.notification);
    } catch (err) {
      logger.error(`[orderStatus] gửi thông báo lỗi cho đơn ${orderId}:`, err);
    }
  }

  return updated;
}

module.exports = { transitionOrder, defaultEffects };
