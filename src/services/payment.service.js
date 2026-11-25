"use strict";
const crypto = require("crypto");
const { Order, TimeSlot } = require("../models");
const AppError = require("../utils/AppError");
const { transitionOrder } = require("./orderStatus.service");

const QR_TTL_MS = 10 * 60 * 1000;
const MAX_RECREATES = 3; // 1 QR ban đầu + tối đa 3 lần tạo lại

function makeQr(order, attemptNo, now = new Date()) {
  const txnId = `SC${order.code.replace(/[^A-Z0-9]/gi, "")}${attemptNo}`;
  const payload = `SWEETCAKE|${order.code}|${order.total}|${txnId}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="100%" height="100%" fill="white"/><rect x="18" y="18" width="284" height="284" fill="none" stroke="#222" stroke-width="4"/><text x="160" y="105" text-anchor="middle" font-size="18">VIETQR MOCK</text><text x="160" y="145" text-anchor="middle" font-size="13">${order.code}</text><text x="160" y="180" text-anchor="middle" font-size="18">${Number(order.total).toLocaleString("vi-VN")} VND</text><text x="160" y="220" text-anchor="middle" font-size="11">${txnId}</text><text x="160" y="265" text-anchor="middle" font-size="10">DEMO - KHONG CHUYEN TIEN THAT</text></svg>`;
  return {
    qrCode: payload,
    qrPayload: payload,
    qrDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
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
  if (!slot || slot.closed || new Date(slot.date).toISOString().slice(0,10) !== new Date(order.receiveDate).toISOString().slice(0,10)) {
    await cancelExpiredOrder(order, "slot_unavailable");
    throw new AppError(409, "SLOT_NO_LONGER_VALID", "Khung giờ nhận bánh không còn hợp lệ. Vui lòng chọn khung giờ khác.");
  }
  if (order.payment?.slotHeld !== true) {
    throw new AppError(409, "SLOT_NOT_HELD", "Khung giờ nhận bánh không còn được giữ cho đơn này.");
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
  if (attempts.length >= MAX_RECREATES + 1 && (latest?.result === "failed" || (latest?.deadlineAt && new Date(latest.deadlineAt) <= new Date()))) {
    if (latest.result === "pending") latest.result = "expired";
    await order.save();
    return cancelExpiredOrder(order, "qr_retries_exceeded");
  }
  return order;
}

async function createQr(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  await assertOrderAndSlot(order);
  const latest = order.payment?.attempts?.[order.payment.attempts.length - 1];
  if (latest && latest.result === "pending" && latest.deadlineAt && new Date(latest.deadlineAt) > new Date()) {
    throw new AppError(409, "QR_STILL_VALID", "Mã QR hiện tại vẫn còn hiệu lực.");
  }
  if (latest && latest.result === "pending") latest.result = "expired";
  const recreateCount = Number(order.payment?.recreateCount || 0);
  if (recreateCount >= MAX_RECREATES) {
    await cancelExpiredOrder(order, "qr_retries_exceeded");
    throw new AppError(409, "QR_RETRY_LIMIT", "Đã hết số lần tạo lại mã QR. Đơn hàng đã được hủy.");
  }
  const attempt = makeQr(order, (order.payment.attempts?.length || 0) + 1);
  order.payment.attempts.push(attempt);
  order.payment.recreateCount = recreateCount + (order.payment.attempts.length > 1 ? 1 : 0);
  order.payment.deadlineAt = attempt.deadlineAt;
  await order.save();
  return { attempt, recreateCount: order.payment.recreateCount, maxRecreates: MAX_RECREATES };
}

async function initializeQr(order) {
  const attempt = makeQr(order, 1);
  order.payment.attempts = [attempt];
  order.payment.deadlineAt = attempt.deadlineAt;
  await order.save();
  return attempt;
}

async function handleMockWebhook(orderId, { txnId, result = "success" } = {}) {
  if (!["success", "failed"].includes(result)) throw new AppError(400, "INVALID_PAYMENT_RESULT", "Kết quả thanh toán không hợp lệ.");
  let order = await Order.findById(orderId);
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  const attempt = [...(order.payment?.attempts || [])].reverse().find(a => !txnId || a.txnId === txnId || a.qrCode === txnId);
  if (!attempt) throw new AppError(404, "PAYMENT_ATTEMPT_NOT_FOUND", "Không tìm thấy giao dịch tương ứng.");
  if (attempt.result === "success" || order.payment?.status === "paid") return { duplicate: true, order };
  if (result === "failed") {
    attempt.result = "failed";
    if (order.status === "pending_payment") {
      await order.save();
      if (order.payment.attempts.length >= MAX_RECREATES + 1) {
        const cancelled = await cancelExpiredOrder(order, "qr_retries_exceeded");
        return { duplicate: false, failed: true, cancelled: true, order: cancelled };
      }
    }
    return { duplicate: false, failed: true, order };
  }
  // Thanh toán thành công chỉ được xác nhận tự động khi đúng QR hiện hành và còn hạn.
  const now = new Date();
  const isCurrent = order.payment.attempts[order.payment.attempts.length - 1]._id?.toString() === attempt._id?.toString();
  const inTime = attempt.deadlineAt && new Date(attempt.deadlineAt) >= now;
  if (order.status !== "pending_payment" || !isCurrent || !inTime || order.payment?.slotHeld !== true) {
    if (order.status === "pending_payment") {
      order.payment.attempts[order.payment.attempts.length - 1].result =
        order.payment.attempts[order.payment.attempts.length - 1].result === "pending" ? "expired" : order.payment.attempts[order.payment.attempts.length - 1].result;
      await order.save();
      order = await cancelExpiredOrder(order, "qr_retries_exceeded");
    }
    order.payment.latePayment = true;
    order.payment.latePaymentStatus = "refund_required";
    order.payment.status = "paid";
    order.payment.paidAt = now;
    order.payment.txnId = attempt.txnId || txnId || `LATE-${crypto.randomUUID()}`;
    order.refund = { source: "late_payment", reason: "Thanh toán muộn sau khi đơn đã hết hiệu lực", status: "pending", suggestedAmount: order.total, amount: null, adjustReason: null, dueAt: null, processedAt: null, processedBy: null };
    await order.save();
    return { latePayment: true, order };
  }
  const slot = await TimeSlot.findById(order.slotId);
  if (!slot || slot.closed || new Date(slot.date).toISOString().slice(0, 10) !== new Date(order.receiveDate).toISOString().slice(0, 10)) {
    await cancelExpiredOrder(order, "slot_unavailable");
    order.payment.latePayment = true;
    order.payment.latePaymentStatus = "refund_required";
    order.payment.status = "paid";
    order.payment.paidAt = now;
    order.payment.txnId = attempt.txnId || txnId;
    order.refund = { source: "late_payment", reason: "Khung giờ không còn hợp lệ", status: "pending", suggestedAmount: order.total, amount: null };
    await order.save();
    return { latePayment: true, order };
  }
  attempt.result = "success";
  await order.save();
  const updated = await transitionOrder(orderId, "pending_approval", {
    actor: { type: "system", id: null },
    reason: "Webhook VietQR mô phỏng xác nhận thanh toán thành công.",
    patch: { "payment.status": "paid", "payment.paidAt": now, "payment.confirmedBy": "webhook", "payment.txnId": attempt.txnId || txnId },
    now,
  });
  return { paid: true, order: updated };
}

module.exports = { createQr, initializeQr, handleMockWebhook, expireIfNeeded, MAX_RECREATES };
