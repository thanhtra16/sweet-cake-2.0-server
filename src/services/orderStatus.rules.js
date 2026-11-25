'use strict';

/**
 * State machine đơn hàng (BR18 đến BR22): hàm thuần, không đọc DB.
 * planTransition kiểm tra điều kiện rồi trả "kế hoạch" gồm: các trường cần $set, dòng statusHistory,
 * các hiệu ứng phụ (giải phóng khung giờ, hoàn lượt voucher) và nội dung thông báo.
 * orderStatus.service.js áp dụng kế hoạch đó một cách nguyên tử.
 */

const AppError = require('../utils/AppError');

const STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PENDING_APPROVAL: 'pending_approval',
  ACCEPTED: 'accepted',
  BAKING: 'baking',
  DONE: 'done',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};
const S = STATUS;

const ACTOR = { CUSTOMER: 'customer', ADMIN: 'admin', SYSTEM: 'system' };

// BR20: lý do khách chọn khi tự hủy.
const CUSTOMER_CANCEL_REASONS = ['ordered_by_mistake', 'change_product', 'change_time', 'found_elsewhere', 'other'];
// BR17/BR19: lý do hệ thống tự hủy.
const SYSTEM_CANCEL_REASONS = ['payment_timeout', 'qr_expired', 'qr_retries_exceeded'];
const CANCEL_CAUSES = ['shop_fault', 'other']; // BR21

/**
 * Bảng chuyển trạng thái (scope, "Bảng chuyển trạng thái"). Mỗi cạnh có:
 * actors: ai được thực hiện (BR19: từ Đã tiếp nhận trở đi chỉ Admin)
 * ticket / photo: điều kiện phiếu làm bánh, ảnh thực tế (BR19, BR22)
 * method: hình thức nhận bánh bắt buộc
 */
const TRANSITIONS = {
  [S.PENDING_PAYMENT]: {
    [S.PENDING_APPROVAL]: { actors: [ACTOR.SYSTEM, ACTOR.ADMIN], isPaid: true }, // Admin xác nhận thủ công hoặc webhook mô phỏng (BR16)
    [S.CANCELLED]: { actors: [ACTOR.CUSTOMER, ACTOR.SYSTEM] },
  },
  [S.PENDING_APPROVAL]: {
    [S.ACCEPTED]: { actors: [ACTOR.ADMIN] },
    [S.CANCELLED]: { actors: [ACTOR.CUSTOMER, ACTOR.ADMIN] }, // Admin từ chối cũng là hủy, bắt buộc có lý do
  },
  [S.ACCEPTED]: {
    [S.BAKING]: { actors: [ACTOR.ADMIN], ticket: true },
    [S.CANCELLED]: { actors: [ACTOR.ADMIN] }, // khách chỉ gửi yêu cầu hủy, không tự hủy (BR20)
  },
  [S.BAKING]: {
    [S.DONE]: { actors: [ACTOR.ADMIN], photo: true },
    [S.CANCELLED]: { actors: [ACTOR.ADMIN] },
  },
  [S.DONE]: {
    [S.DELIVERING]: { actors: [ACTOR.ADMIN], method: 'delivery' },
    [S.DELIVERED]: { actors: [ACTOR.ADMIN], method: 'pickup' },
  },
  [S.DELIVERING]: {
    [S.DELIVERED]: { actors: [ACTOR.ADMIN] },
  },
  [S.DELIVERED]: {},
  [S.CANCELLED]: {},
};

const isNonEmpty = (s) => typeof s === 'string' && s.trim() !== '';

function addWorkingDays(date, days) {
  const d = new Date(date);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return d;
}

/** BR21: tỷ lệ hoàn tiền đề xuất. Với yêu cầu hủy, tính theo trạng thái lúc khách gửi yêu cầu (atStatus). */
function refundPercent({ order, from, cause, viaCancelRequest, policy }) {
  if (cause === 'shop_fault') return policy.shopFaultPercent;
  const basis = viaCancelRequest ? order.cancelRequest.atStatus : from;
  if (basis === S.PENDING_APPROVAL) return 100;
  if (basis === S.ACCEPTED) return policy.acceptedPercent;
  if (basis === S.BAKING) return policy.inProgressPercent;
  return 0;
}

function buildNotification(order, { from, to, actor, reasonCode, reason, refund, settings }) {
  if (!order.userId) return null; // BR26: chỉ tạo cho Buyer; Guest xem trên trang theo dõi đơn
  const code = order.code;
  const base = { userId: order.userId, type: 'order', orderId: order._id };
  const refundNote = refund
    ? ` Cửa hàng sẽ xử lý hoàn tiền trong tối đa ${(settings && settings.refundDueWorkingDays) || 3} ngày làm việc.`
    : '';
  const reasonNote = isNonEmpty(reason) ? ` Lý do: ${reason.trim()}.` : '';

  switch (to) {
    case S.PENDING_APPROVAL:
      return { ...base, title: 'Đặt hàng thành công', message: `Đơn ${code} đã được thanh toán và đang chờ cửa hàng duyệt.` };
    case S.ACCEPTED:
      return { ...base, title: 'Cửa hàng đã tiếp nhận đơn', message: `Đơn ${code} đã được cửa hàng tiếp nhận.` };
    case S.DONE:
      return { ...base, title: 'Bánh đã hoàn thành', message: `Bánh của đơn ${code} đã làm xong, bạn có thể xem ảnh thực tế trong trang theo dõi đơn.` };
    case S.DELIVERING:
      return { ...base, title: 'Đơn đang được giao', message: `Đơn ${code} đang trên đường giao đến bạn.` };
    case S.DELIVERED:
      return { ...base, title: 'Đơn đã giao', message: `Đơn ${code} đã hoàn tất. Mời bạn đánh giá sản phẩm.` };
    case S.CANCELLED:
      if (actor.type === ACTOR.SYSTEM) {
        return { ...base, title: 'Thanh toán đã hết hạn', message: `Đơn ${code} đã bị hủy vì chưa thanh toán thành công trong thời gian quy định.` };
      }
      if (from === S.PENDING_APPROVAL && actor.type === ACTOR.ADMIN) {
        return { ...base, title: 'Đơn hàng bị từ chối', message: `Đơn ${code} đã bị cửa hàng từ chối.${reasonNote}${refundNote}` };
      }
      return { ...base, title: 'Đơn hàng đã bị hủy', message: `Đơn ${code} đã bị hủy.${reasonNote}${refundNote}` };
    default:
      return null; // baking: BR26 không yêu cầu thông báo
  }
}

/**
 * @param {object} order     document orders (đọc trước khi chuyển)
 * @param {string} to        trạng thái đích
 * @param {object} opts      { actor:{type,id}, reasonCode, reason, cause, via, now, settings }
 *                           via = 'cancel_request' khi Admin chấp nhận yêu cầu hủy của khách
 */
function planTransition(order, to, opts = {}) {
  const { actor, reasonCode = null, reason = null, cause = null, via = null, now = new Date(), settings = {} } = opts;
  const from = order.status;

  if (!actor || !Object.values(ACTOR).includes(actor.type)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Thiếu thông tin người thực hiện.');
  }

  // 1. Cạnh có tồn tại không (BR18: đúng thứ tự, không quay lui, không nhảy cóc).
  const edge = TRANSITIONS[from] && TRANSITIONS[from][to];
  if (!edge) {
    throw new AppError(409, 'INVALID_TRANSITION', 'Không thể chuyển đơn hàng sang trạng thái này.', { from, to });
  }

  // 2. Ai được làm (BR19, BR20).
  if (!edge.actors.includes(actor.type)) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', { from, to, actor: actor.type });
  }

  // 3. Hình thức nhận bánh (Đã xong -> Đang giao / Đã giao).
  if (edge.method && order.receiveMethod !== edge.method) {
    throw new AppError(409, 'INVALID_TRANSITION', 'Hình thức nhận bánh của đơn không phù hợp với bước này.', { from, to });
  }

  // 4. Yêu cầu hủy đang chờ: Admin phải xử lý trước khi chuyển trạng thái (BR19, BR20).
  const pendingCancel = order.cancelRequest && order.cancelRequest.status === 'pending';
  if (via === 'cancel_request') {
    if (actor.type !== ACTOR.ADMIN) {
      throw new AppError(403, 'FORBIDDEN', 'Chỉ Admin mới có quyền xử lý yêu cầu hủy của khách hàng.', { from, to });
    }
    if (!pendingCancel || to !== S.CANCELLED) {
      throw new AppError(409, 'INVALID_TRANSITION', 'Đơn không có yêu cầu hủy đang chờ xử lý.', { from, to });
    }
  } else if (actor.type === ACTOR.ADMIN && pendingCancel) {
    throw new AppError(409, 'CANCEL_REQUEST_PENDING', 'Đơn có yêu cầu hủy đang chờ, hãy chấp nhận hoặc từ chối trước.', { from, to });
  }

  // 5. Phiếu làm bánh (BR19) và ảnh thực tế (BR22).
  if (edge.ticket && !(order.productionTicket && order.productionTicket.createdBy && order.productionTicket.createdAt)) {
    throw new AppError(409, 'TICKET_REQUIRED', 'Cần lập phiếu làm bánh trước khi chuyển sang Đang làm bánh.', { from, to });
  }
  if (edge.photo && !(Array.isArray(order.photoIds) && order.photoIds.length >= 1)) {
    throw new AppError(409, 'PHOTO_REQUIRED', 'Cần tải lên ít nhất một ảnh thực tế trước khi chuyển sang Đã xong.', { from, to });
  }

  // 6. Điều kiện riêng của việc hủy: lý do và nguyên nhân.
  const set = { status: to };
  const effects = [];
  let refund = null;

  if (to === S.CANCELLED) {
    if (actor.type === ACTOR.CUSTOMER && !CUSTOMER_CANCEL_REASONS.includes(reasonCode)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Vui lòng chọn lý do hủy đơn.');
    }
    if (actor.type === ACTOR.SYSTEM && !SYSTEM_CANCEL_REASONS.includes(reasonCode)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Thiếu lý do hủy tự động của hệ thống.');
    }
    if (actor.type === ACTOR.ADMIN && via !== 'cancel_request' && !isNonEmpty(reason)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Admin cần nhập lý do khi hủy hoặc từ chối đơn.');
    }
    if (cause != null && !CANCEL_CAUSES.includes(cause)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Nguyên nhân hủy không hợp lệ.');
    }
    const finalCause = actor.type === ACTOR.ADMIN ? cause || 'other' : null;

    set.cancellation = {
      by: actor.type, byUserId: actor.id || null,
      reasonCode, reason: isNonEmpty(reason) ? reason.trim() : null,
      cause: finalCause, at: now,
    };
    set['payment.slotHeld'] = false;

    // BR13/BR17: hủy thì giải phóng khung giờ. Cạnh chỉ chạy một lần nhờ điều kiện status khi cập nhật.
    if (order.slotId) effects.push({ type: 'RELEASE_SLOT', slotId: order.slotId });

    // BR15, BR21: chỉ hoàn lượt voucher khi hủy ở Chờ thanh toán hoặc Chờ duyệt.
    const voucherCode = order.voucher && order.voucher.code;
    if (voucherCode && !order.voucher.restored && (from === S.PENDING_PAYMENT || from === S.PENDING_APPROVAL)) {
      effects.push({ type: 'RESTORE_VOUCHER', orderId: order._id, code: voucherCode });
    }

    // BR21: bản ghi hoàn tiền với số đề xuất. Đơn chưa thanh toán không phát sinh hoàn tiền.
    if (order.payment && order.payment.status === 'paid') {
      const policy = settings.refundPolicy || { acceptedPercent: 30, inProgressPercent: 0, shopFaultPercent: 100 };
      const percent = refundPercent({ order, from, cause: finalCause, viaCancelRequest: via === 'cancel_request', policy });
      let source = 'admin_cancel';
      if (via === 'cancel_request') source = 'cancel_request';
      else if (from === S.PENDING_APPROVAL) source = actor.type === ACTOR.CUSTOMER ? 'customer_cancel' : 'rejected';
      refund = {
        source, status: 'pending',
        suggestedAmount: Math.round((order.total * percent) / 100),
        amount: null, adjustReason: null,
        dueAt: addWorkingDays(now, settings.refundDueWorkingDays || 3),
        processedAt: null, processedBy: null,
      };
      set.refund = refund;
    }
  }

  const historyEntry = {
    from, to, by: actor.type, byUserId: actor.id || null, at: now,
    reasonCode, reason: isNonEmpty(reason) ? reason.trim() : null,
  };

  return {
    from, to, set, historyEntry, effects,
    notification: buildNotification(order, { from, to, actor, reasonCode, reason, refund, settings }),
  };
}

module.exports = {
  STATUS, ACTOR, TRANSITIONS, CUSTOMER_CANCEL_REASONS, SYSTEM_CANCEL_REASONS, CANCEL_CAUSES,
  planTransition, addWorkingDays, refundPercent,
};
