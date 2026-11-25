"use strict";
const crypto = require("crypto");
const { Order, TimeSlot } = require("../models");
const AppError = require("../utils/AppError");
const { transitionOrder } = require("./orderStatus.service");
const { toDateString } = require("../utils/vn-date");

const QR_TTL_MS = 10 * 60 * 1000;
const MAX_RECREATES = 3; // 1 mã ban đầu + tối đa 3 lần tạo lại.

function escapeXml(value) {
  return String(value ?? "").replace(/[<>&'"]/g, ch => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  })[ch]);
}

/**
 * Tạo hình QR minh họa có bố cục giống VietQR cho luồng demo.
 * Đây là QR mô phỏng, không chứa payload ngân hàng và không dùng để chuyển tiền thật.
 */
function buildMockQrSvg(order, txnId) {
  const size = 33;
  const cell = 8;
  const quiet = 4;
  const seed = crypto.createHash("sha256")
    .update(`${order.code}|${order.total}|${txnId}`)
    .digest();
  const modules = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const bit = (seed[(x * 7 + y * 13) % seed.length] >> ((x + y) % 8)) & 1;
      return bit === 1;
    }),
  );

  const finder = (left, top) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      modules[top + y][left + x] =
        x === 0 || y === 0 || x === 6 || y === 6 ||
        (x >= 2 && x <= 4 && y >= 2 && y <= 4);
    }
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      if (left + x >= 0 && top + y >= 0 && left + x < size && top + y < size &&
          (x === -1 || y === -1 || x === 7 || y === 7)) {
        modules[top + y][left + x] = false;
      }
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);

  const rects = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (modules[y][x]) rects.push(`<rect x="${(x + quiet) * cell}" y="${(y + quiet) * cell}" width="${cell}" height="${cell}" rx="0.7"/>`);
  }
  const dimension = (size + quiet * 2) * cell;
  const orderCode = escapeXml(order.code);
  const amount = Number(order.total).toLocaleString("vi-VN");
  const payload = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="430" viewBox="0 0 360 430">
    <rect width="360" height="430" rx="18" fill="#fff"/>
    <rect x="15" y="15" width="330" height="400" rx="15" fill="#fff" stroke="#eee7e2"/>
    <rect x="34" y="34" width="292" height="34" rx="8" fill="#a6535a"/>
    <text x="180" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#fff">SWEETCAKE · VIETQR DEMO</text>
    <g transform="translate(${(360 - dimension) / 2},82)" fill="#211f1e">${rects.join("")}</g>
    <text x="180" y="365" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#8b7d75">ĐƠN HÀNG ${orderCode}</text>
    <text x="180" y="389" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#a6535a">${amount} VND</text>
    <text x="180" y="405" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#a0968f">MÃ QR MÔ PHỎNG · KHÔNG CHUYỂN TIỀN THẬT</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(payload).toString("base64")}`;
}

function makeQr(order, attemptNo, now = new Date()) {
  const txnId = `SC${order.code.replace(/[^A-Z0-9]/gi, "")}${attemptNo}`;
  const payload = `SWEETCAKE|${order.code}|${order.total}|${txnId}`;
  return {
    qrCode: payload,
    qrPayload: payload,
    qrDataUrl: buildMockQrSvg(order, txnId),
    txnId,
    createdAt: now,
    deadlineAt: new Date(now.getTime() + QR_TTL_MS),
    result: "pending",
  };
}

async function assertOrderAndSlot(order) {
  if (!order || order.status !== "pending_payment" || order.payment?.status === "paid") {
    throw new AppError(409, "ORDER_NOT_PAYABLE", "Đơn hàng không còn ở trạng thái chờ thanh toán.");
  }
  const slot = await TimeSlot.findById(order.slotId);
  const sameDate = slot &&
  toDateString(slot.date) === toDateString(order.receiveDate);
  const capacityValid = slot && Number(slot.used) <= Number(slot.capacity);
  if (!slot || slot.closed || !sameDate || !capacityValid || order.payment?.slotHeld !== true) {
    if (order.status === "pending_payment") await cancelExpiredOrder(order, "slot_unavailable");
    throw new AppError(409, "SLOT_NO_LONGER_VALID", "Khung giờ nhận bánh không còn được giữ hợp lệ. Đơn cũ đã được xử lý; vui lòng chọn khung giờ khác.");
  }
}

async function cancelExpiredOrder(order, reasonCode = "qr_retries_exceeded") {
  if (!order || order.status !== "pending_payment") return order;
  return transitionOrder(order._id.toString(), "cancelled", {
    actor: { type: "system", id: null },
    reasonCode,
    reason: "Đơn hết thời hạn thanh toán hoặc khung giờ không còn hợp lệ.",
  });
}

async function expireIfNeeded(order) {
  if (!order || order.status !== "pending_payment") return order;
  const attempts = order.payment?.attempts || [];
  const latest = attempts[attempts.length - 1];
  const finalAttempt = Number(order.payment?.recreateCount || 0) >= MAX_RECREATES;
  const finalAttemptFailed = finalAttempt && latest?.result === "failed";
  const finalAttemptExpired = finalAttempt && latest?.result === "pending" &&
    latest.deadlineAt && new Date(latest.deadlineAt) <= new Date();

  if (latest?.result === "pending" && latest.deadlineAt && new Date(latest.deadlineAt) <= new Date()) {
    latest.result = "expired";
    await order.save();
  }
  if (finalAttemptFailed || finalAttemptExpired) {
    return cancelExpiredOrder(order, "qr_retries_exceeded");
  }
  return order;
}

async function createQr(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  await assertOrderAndSlot(order);

  const attempts = order.payment?.attempts || [];
  const latest = attempts[attempts.length - 1];
  if (latest && latest.result === "pending" && latest.deadlineAt && new Date(latest.deadlineAt) > new Date()) {
    throw new AppError(409, "QR_STILL_VALID", "Mã QR hiện tại vẫn còn hiệu lực.");
  }
  if (latest?.result === "pending") latest.result = "expired";

  const recreateCount = Number(order.payment?.recreateCount || 0);
  if (recreateCount >= MAX_RECREATES) {
    await order.save();
    await cancelExpiredOrder(order, "qr_retries_exceeded");
    throw new AppError(409, "QR_RETRY_LIMIT", "Đã hết 3 lần tạo lại mã QR. Đơn hàng đã được hủy.");
  }

  const attempt = makeQr(order, attempts.length + 1);
  order.payment.attempts.push(attempt);
  order.payment.recreateCount = recreateCount + 1;
  order.payment.deadlineAt = attempt.deadlineAt;
  await order.save();

  return { attempt, recreateCount: order.payment.recreateCount, maxRecreates: MAX_RECREATES };
}

async function initializeQr(order) {
  const attempt = makeQr(order, 1);
  order.payment.attempts = [attempt];
  order.payment.recreateCount = 0;
  order.payment.deadlineAt = attempt.deadlineAt;
  await order.save();
  return attempt;
}

async function handleMockWebhook(orderId, { txnId, result = "success" } = {}) {
  if (!["success", "failed"].includes(result)) {
    throw new AppError(400, "INVALID_PAYMENT_RESULT", "Kết quả thanh toán không hợp lệ.");
  }
  if (!txnId) throw new AppError(400, "TRANSACTION_ID_REQUIRED", "Thiếu mã giao dịch để đối soát.");

  let order = await Order.findById(orderId);
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");

  const attempt = (order.payment?.attempts || []).find(a => a.txnId === txnId || a.qrCode === txnId);
  if (!attempt) throw new AppError(404, "PAYMENT_ATTEMPT_NOT_FOUND", "Không tìm thấy giao dịch tương ứng.");

  if (order.payment?.status === "paid" || attempt.result === "success") {
    return { duplicate: true, paid: order.payment?.status === "paid", order };
  }

  if (result === "failed") {
    if (attempt.result === "failed" || attempt.result === "expired") {
      return { duplicate: true, failed: true, order };
    }
    attempt.result = "failed";
    await order.save();
    if (order.status === "pending_payment" &&
        Number(order.payment?.recreateCount || 0) >= MAX_RECREATES &&
        order.payment.attempts[order.payment.attempts.length - 1]._id?.toString() === attempt._id?.toString()) {
      const cancelled = await cancelExpiredOrder(order, "qr_retries_exceeded");
      return { duplicate: false, failed: true, cancelled: true, order: cancelled };
    }
    return { duplicate: false, failed: true, order };
  }

  const now = new Date();
  const latest = order.payment.attempts[order.payment.attempts.length - 1];
  const isCurrent = latest?._id?.toString() === attempt._id?.toString();
  const inTime = attempt.deadlineAt && new Date(attempt.deadlineAt) >= now;
  const slot = await TimeSlot.findById(order.slotId);
  const slotDateValid = slot && !slot.closed &&
  Number(slot.used) <= Number(slot.capacity) &&
  toDateString(slot.date) === toDateString(order.receiveDate);
  const orderStillValid = order.status === "pending_payment" &&
    isCurrent && inTime && order.payment?.slotHeld === true && slotDateValid;

  if (!orderStillValid) {
    // QR hết hạn / QR cũ không còn là QR hiện tại nhưng đơn vẫn đang giữ slot:
    // không tự hủy đơn khi khách còn lượt tạo lại; đưa giao dịch vào diện đối soát.
    if (order.status === "pending_payment" && order.payment?.slotHeld === true && slotDateValid) {
      if (attempt.result === "pending") attempt.result = "late";
      await order.save();
      if (Number(order.payment?.recreateCount || 0) >= MAX_RECREATES &&
          latest?.deadlineAt && new Date(latest.deadlineAt) <= now) {
        order = await cancelExpiredOrder(order, "qr_retries_exceeded");
        return { latePayment: true, reviewRequired: true, refundRequired: false, order };
      }
      return { latePayment: true, reviewRequired: true, retryAvailable: true, order };
    }

    if (order.status === "pending_payment") {
      if (latest?.result === "pending") latest.result = "expired";
      await order.save();
      order = await cancelExpiredOrder(order, "slot_unavailable");
    }

    // Không bao giờ khôi phục đơn đã hủy hoặc đơn mất hiệu lực.
    order.payment.latePayment = true;
    order.payment.latePaymentStatus = "refund_required";
    order.payment.status = "paid";
    order.payment.paidAt = now;
    order.payment.txnId = txnId;
    order.payment.confirmedBy = "webhook";
    order.refund = {
      source: "late_payment",
      reason: "Thanh toán được xác nhận sau khi đơn đã hết hiệu lực hoặc khung giờ không còn hợp lệ",
      status: "pending",
      suggestedAmount: order.total,
      amount: null,
      adjustReason: null,
      dueAt: null,
      processedAt: null,
      processedBy: null,
    };
    await order.save();
    return { latePayment: true, refundRequired: true, order };
  }

  attempt.result = "success";
  await order.save();
  const updated = await transitionOrder(orderId, "pending_approval", {
    actor: { type: "system", id: null },
    reason: "Webhook VietQR mô phỏng xác nhận thanh toán thành công.",
    patch: {
      "payment.status": "paid",
      "payment.paidAt": now,
      "payment.confirmedBy": "webhook",
      "payment.txnId": txnId,
    },
    now,
  });
  return { paid: true, order: updated };
}

async function sweepExpiredPayments() {
  const now = new Date();
  const orders = await Order.find({
    status: "pending_payment",
    "payment.status": { $ne: "paid" },
    "payment.deadlineAt": { $lte: now },
  }).select("_id").lean();

  const results = [];
  for (const item of orders) {
    try {
      const order = await Order.findById(item._id);
      if (order) results.push(await expireIfNeeded(order));
    } catch (error) {
      console.error(`[payment] Không thể xử lý QR hết hạn của đơn ${item._id}:`, error);
    }
  }
  return results.length;
}

module.exports = {
  createQr,
  initializeQr,
  handleMockWebhook,
  expireIfNeeded,
  sweepExpiredPayments,
  MAX_RECREATES,
  QR_TTL_MS,
};
