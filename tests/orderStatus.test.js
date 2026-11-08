'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { planTransition, TRANSITIONS, addWorkingDays, STATUS: S } = require('../src/services/orderStatus.rules');
const { transitionOrder } = require('../src/services/orderStatus.service');

const NOW = new Date('2026-11-12T03:00:00Z'); // thứ Năm
const ADMIN = { type: 'admin', id: 'ad1' };
const CUSTOMER = { type: 'customer', id: 'u1' };
const SYSTEM = { type: 'system' };
const settings = { refundPolicy: { acceptedPercent: 30, inProgressPercent: 0, shopFaultPercent: 100 }, refundDueWorkingDays: 3 };

const order = (over = {}) => ({
  _id: 'o1', code: 'SC001', userId: 'u1', status: S.PENDING_PAYMENT, receiveMethod: 'delivery',
  slotId: 'slot1', total: 500000, voucher: { code: 'KM', restored: false },
  payment: { status: 'paid', slotHeld: true }, photoIds: [], ...over,
});
const plan = (o, to, opts = {}) => planTransition(o, to, { now: NOW, settings, ...opts });
const code = (e) => e.code;

// ---------- Bảng chuyển trạng thái ----------
test('cho phép cả 11 cạnh của bảng chuyển trạng thái với đúng người thực hiện', () => {
  const ticket = { createdBy: 'ad1', createdAt: NOW };
  const cases = [
    [order({ status: S.PENDING_PAYMENT }), S.PENDING_APPROVAL, { actor: SYSTEM }],
    [order({ status: S.PENDING_PAYMENT }), S.CANCELLED, { actor: CUSTOMER, reasonCode: 'other' }],
    [order({ status: S.PENDING_APPROVAL }), S.ACCEPTED, { actor: ADMIN }],
    [order({ status: S.PENDING_APPROVAL }), S.CANCELLED, { actor: CUSTOMER, reasonCode: 'change_time' }],
    [order({ status: S.ACCEPTED, productionTicket: ticket }), S.BAKING, { actor: ADMIN }],
    [order({ status: S.ACCEPTED }), S.CANCELLED, { actor: ADMIN, reason: 'Hết nguyên liệu' }],
    [order({ status: S.BAKING, photoIds: ['p1'] }), S.DONE, { actor: ADMIN }],
    [order({ status: S.BAKING }), S.CANCELLED, { actor: ADMIN, reason: 'Sự cố' }],
    [order({ status: S.DONE, receiveMethod: 'delivery' }), S.DELIVERING, { actor: ADMIN }],
    [order({ status: S.DONE, receiveMethod: 'pickup' }), S.DELIVERED, { actor: ADMIN }],
    [order({ status: S.DELIVERING }), S.DELIVERED, { actor: ADMIN }],
  ];
  for (const [o, to, opts] of cases) assert.doesNotThrow(() => plan(o, to, opts), `${o.status} -> ${to}`);
});

test('không quay lui, không nhảy cóc, trạng thái cuối không đi tiếp (BR18)', () => {
  const bad = [
    [S.BAKING, S.ACCEPTED], [S.DONE, S.BAKING], [S.PENDING_APPROVAL, S.PENDING_PAYMENT],
    [S.ACCEPTED, S.DONE], [S.PENDING_APPROVAL, S.BAKING], [S.PENDING_PAYMENT, S.ACCEPTED],
    [S.DELIVERED, S.DELIVERING], [S.DELIVERED, S.CANCELLED], [S.CANCELLED, S.PENDING_PAYMENT], [S.CANCELLED, S.ACCEPTED],
    [S.DONE, S.CANCELLED], [S.DELIVERING, S.CANCELLED], [S.ACCEPTED, S.ACCEPTED],
  ];
  for (const [from, to] of bad) {
    assert.throws(() => plan(order({ status: from }), to, { actor: ADMIN, reason: 'x' }), (e) => e.status === 409 && e.code === 'INVALID_TRANSITION', `${from} -> ${to}`);
  }
  assert.throws(() => plan(order(), 'unknown', { actor: ADMIN }), (e) => e.code === 'INVALID_TRANSITION');
});

test('hình thức nhận bánh quyết định Đang giao hay Đã giao (bảng chuyển trạng thái)', () => {
  assert.throws(() => plan(order({ status: S.DONE, receiveMethod: 'pickup' }), S.DELIVERING, { actor: ADMIN }), (e) => e.code === 'INVALID_TRANSITION');
  assert.throws(() => plan(order({ status: S.DONE, receiveMethod: 'delivery' }), S.DELIVERED, { actor: ADMIN }), (e) => e.code === 'INVALID_TRANSITION');
});

test('phân quyền: từ Đã tiếp nhận chỉ Admin; khách không tự hủy khi đã tiếp nhận (BR19, BR20)', () => {
  assert.throws(() => plan(order({ status: S.PENDING_APPROVAL }), S.ACCEPTED, { actor: CUSTOMER }), (e) => e.status === 403 && e.code === 'FORBIDDEN');
  assert.throws(() => plan(order({ status: S.ACCEPTED }), S.CANCELLED, { actor: CUSTOMER, reasonCode: 'other' }), (e) => e.code === 'FORBIDDEN');
  assert.throws(() => plan(order({ status: S.PENDING_PAYMENT }), S.CANCELLED, { actor: ADMIN, reason: 'x' }), (e) => e.code === 'FORBIDDEN');
  assert.throws(() => plan(order({ status: S.PENDING_APPROVAL }), S.ACCEPTED, { actor: SYSTEM }), (e) => e.code === 'FORBIDDEN');
});

// ---------- Điều kiện phiếu, ảnh, yêu cầu hủy ----------
test('TICKET_REQUIRED: chưa lập phiếu làm bánh thì không sang Đang làm bánh (BR19)', () => {
  assert.throws(() => plan(order({ status: S.ACCEPTED }), S.BAKING, { actor: ADMIN }), (e) => e.status === 409 && e.code === 'TICKET_REQUIRED');
  assert.throws(() => plan(order({ status: S.ACCEPTED, productionTicket: { createdBy: 'ad1' } }), S.BAKING, { actor: ADMIN }), (e) => e.code === 'TICKET_REQUIRED');
});

test('PHOTO_REQUIRED: cần ít nhất 1 ảnh mới sang Đã xong (BR22)', () => {
  assert.throws(() => plan(order({ status: S.BAKING, photoIds: [] }), S.DONE, { actor: ADMIN }), (e) => e.code === 'PHOTO_REQUIRED');
  assert.throws(() => plan(order({ status: S.BAKING }), S.DONE, { actor: ADMIN }), (e) => e.code === 'PHOTO_REQUIRED');
  assert.doesNotThrow(() => plan(order({ status: S.BAKING, photoIds: ['p1'] }), S.DONE, { actor: ADMIN }));
});

test('CANCEL_REQUEST_PENDING: có yêu cầu hủy đang chờ thì Admin phải xử lý trước (BR19, BR20)', () => {
  const pending = { status: 'pending', atStatus: S.ACCEPTED };
  const ticket = { createdBy: 'ad1', createdAt: NOW };
  assert.throws(() => plan(order({ status: S.ACCEPTED, productionTicket: ticket, cancelRequest: pending }), S.BAKING, { actor: ADMIN }), (e) => e.code === 'CANCEL_REQUEST_PENDING');
  assert.throws(() => plan(order({ status: S.BAKING, photoIds: ['p'], cancelRequest: pending }), S.DONE, { actor: ADMIN }), (e) => e.code === 'CANCEL_REQUEST_PENDING');
  // Admin hủy chủ động khi còn yêu cầu chờ cũng bị chặn; phải đi đường chấp nhận yêu cầu.
  assert.throws(() => plan(order({ status: S.ACCEPTED, cancelRequest: pending }), S.CANCELLED, { actor: ADMIN, reason: 'x' }), (e) => e.code === 'CANCEL_REQUEST_PENDING');
  assert.doesNotThrow(() => plan(order({ status: S.ACCEPTED, cancelRequest: pending }), S.CANCELLED, { actor: ADMIN, via: 'cancel_request' }));
  // Yêu cầu đã xử lý (rejected) thì không còn chặn.
  const ok = order({ status: S.ACCEPTED, productionTicket: ticket, cancelRequest: { status: 'rejected' } });
  assert.doesNotThrow(() => plan(ok, S.BAKING, { actor: ADMIN }));
});

test('via=cancel_request chỉ hợp lệ khi thật sự có yêu cầu chờ', () => {
  assert.throws(() => plan(order({ status: S.ACCEPTED }), S.CANCELLED, { actor: ADMIN, via: 'cancel_request' }), (e) => e.code === 'INVALID_TRANSITION');
});

// ---------- Lý do hủy ----------
test('lý do hủy: khách chọn mã trong danh sách, Admin nhập lý do, hệ thống có mã riêng (BR20)', () => {
  assert.throws(() => plan(order(), S.CANCELLED, { actor: CUSTOMER }), (e) => e.code === 'VALIDATION_ERROR');
  assert.throws(() => plan(order(), S.CANCELLED, { actor: CUSTOMER, reasonCode: 'khong-ro' }), (e) => e.code === 'VALIDATION_ERROR');
  assert.throws(() => plan(order({ status: S.ACCEPTED }), S.CANCELLED, { actor: ADMIN, reason: '  ' }), (e) => e.code === 'VALIDATION_ERROR');
  assert.throws(() => plan(order(), S.CANCELLED, { actor: SYSTEM }), (e) => e.code === 'VALIDATION_ERROR');
  assert.throws(() => plan(order({ status: S.ACCEPTED }), S.CANCELLED, { actor: ADMIN, reason: 'x', cause: 'bay-ba' }), (e) => e.code === 'VALIDATION_ERROR');
  assert.doesNotThrow(() => plan(order(), S.CANCELLED, { actor: SYSTEM, reasonCode: 'payment_timeout' }));
});

// ---------- statusHistory và dữ liệu ghi ----------
test('statusHistory ghi from, to, người thực hiện, thời điểm, lý do (BR18)', () => {
  const p = plan(order({ status: S.PENDING_APPROVAL }), S.CANCELLED, { actor: ADMIN, reason: ' Không đủ nhân sự ' });
  assert.deepEqual(p.historyEntry, {
    from: S.PENDING_APPROVAL, to: S.CANCELLED, by: 'admin', byUserId: 'ad1', at: NOW, reasonCode: null, reason: 'Không đủ nhân sự',
  });
  assert.equal(p.set.status, S.CANCELLED);
  assert.deepEqual(p.set.cancellation, { by: 'admin', byUserId: 'ad1', reasonCode: null, reason: 'Không đủ nhân sự', cause: 'other', at: NOW });
});

// ---------- Hiệu ứng phụ ----------
test('hủy giải phóng khung giờ; hoàn voucher chỉ khi hủy ở Chờ thanh toán hoặc Chờ duyệt (BR15, BR21)', () => {
  const types = (p) => p.effects.map((e) => e.type).sort();
  assert.deepEqual(types(plan(order({ status: S.PENDING_PAYMENT }), S.CANCELLED, { actor: SYSTEM, reasonCode: 'qr_expired' })), ['RELEASE_SLOT', 'RESTORE_VOUCHER']);
  assert.deepEqual(types(plan(order({ status: S.PENDING_APPROVAL }), S.CANCELLED, { actor: CUSTOMER, reasonCode: 'other' })), ['RELEASE_SLOT', 'RESTORE_VOUCHER']);
  assert.deepEqual(types(plan(order({ status: S.ACCEPTED }), S.CANCELLED, { actor: ADMIN, reason: 'x' })), ['RELEASE_SLOT']);
  assert.deepEqual(types(plan(order({ status: S.PENDING_PAYMENT, voucher: { code: 'KM', restored: true } }), S.CANCELLED, { actor: SYSTEM, reasonCode: 'qr_expired' })), ['RELEASE_SLOT']);
  assert.deepEqual(types(plan(order({ status: S.PENDING_PAYMENT, voucher: null }), S.CANCELLED, { actor: SYSTEM, reasonCode: 'qr_expired' })), ['RELEASE_SLOT']);
  assert.deepEqual(types(plan(order({ status: S.PENDING_PAYMENT }), S.PENDING_APPROVAL, { actor: SYSTEM })), []);
});

// ---------- Hoàn tiền (BR21) ----------
test('hoàn tiền đề xuất theo trạng thái lúc hủy, đơn chưa thanh toán không hoàn', () => {
  const r = (o, opts) => plan(o, S.CANCELLED, opts).set.refund;
  assert.equal(r(order({ status: S.PENDING_APPROVAL }), { actor: CUSTOMER, reasonCode: 'other' }).suggestedAmount, 500000);
  assert.equal(r(order({ status: S.PENDING_APPROVAL }), { actor: CUSTOMER, reasonCode: 'other' }).source, 'customer_cancel');
  assert.equal(r(order({ status: S.PENDING_APPROVAL }), { actor: ADMIN, reason: 'x' }).source, 'rejected');
  assert.equal(r(order({ status: S.ACCEPTED }), { actor: ADMIN, reason: 'x' }).suggestedAmount, 150000);
  assert.equal(r(order({ status: S.BAKING }), { actor: ADMIN, reason: 'x' }).suggestedAmount, 0);
  assert.equal(r(order({ status: S.BAKING }), { actor: ADMIN, reason: 'x', cause: 'shop_fault' }).suggestedAmount, 500000);
  assert.equal(r(order({ status: S.PENDING_PAYMENT, payment: { status: 'pending' } }), { actor: SYSTEM, reasonCode: 'payment_timeout' }), undefined);
});

test('yêu cầu hủy: tỷ lệ tính theo trạng thái lúc khách gửi (atStatus), không theo trạng thái hiện tại', () => {
  const o = order({ status: S.BAKING, cancelRequest: { status: 'pending', atStatus: S.ACCEPTED } });
  const p = plan(o, S.CANCELLED, { actor: ADMIN, via: 'cancel_request' });
  assert.equal(p.set.refund.suggestedAmount, 150000);
  assert.equal(p.set.refund.source, 'cancel_request');
  assert.equal(p.set.refund.status, 'pending');
  assert.equal(p.set.refund.amount, null);
});

test('hạn hoàn tiền = 3 ngày làm việc, bỏ thứ Bảy và Chủ nhật', () => {
  assert.equal(addWorkingDays(new Date('2026-11-12T03:00:00Z'), 3).toISOString().slice(0, 10), '2026-11-17'); // Thứ Năm -> thứ Ba
  assert.equal(addWorkingDays(new Date('2026-11-13T03:00:00Z'), 3).toISOString().slice(0, 10), '2026-11-18'); // Thứ Sáu -> thứ Tư
  assert.equal(plan(order({ status: S.PENDING_APPROVAL }), S.CANCELLED, { actor: CUSTOMER, reasonCode: 'other' }).set.refund.dueAt.toISOString().slice(0, 10), '2026-11-17');
});

// ---------- Thông báo (BR26) ----------
test('thông báo: chỉ cho đơn có userId, đúng mốc BR26, baking không thông báo', () => {
  const n = (o, to, opts) => plan(o, to, opts).notification;
  assert.equal(n(order({ userId: null }), S.PENDING_APPROVAL, { actor: SYSTEM }), null);
  assert.equal(n(order(), S.PENDING_APPROVAL, { actor: SYSTEM }).title, 'Đặt hàng thành công');
  assert.equal(n(order({ status: S.PENDING_APPROVAL }), S.ACCEPTED, { actor: ADMIN }).title, 'Cửa hàng đã tiếp nhận đơn');
  assert.equal(n(order({ status: S.ACCEPTED, productionTicket: { createdBy: 'a', createdAt: NOW } }), S.BAKING, { actor: ADMIN }), null);
  assert.equal(n(order({ status: S.BAKING, photoIds: ['p'] }), S.DONE, { actor: ADMIN }).title, 'Bánh đã hoàn thành');
  assert.equal(n(order({ status: S.DELIVERING }), S.DELIVERED, { actor: ADMIN }).title, 'Đơn đã giao');
  assert.equal(n(order({ status: S.PENDING_PAYMENT }), S.CANCELLED, { actor: SYSTEM, reasonCode: 'payment_timeout' }).title, 'Thanh toán đã hết hạn');
  const rejected = n(order({ status: S.PENDING_APPROVAL }), S.CANCELLED, { actor: ADMIN, reason: 'Hết ca' });
  assert.equal(rejected.title, 'Đơn hàng bị từ chối');
  assert.match(rejected.message, /Lý do: Hết ca/);
  assert.match(rejected.message, /hoàn tiền trong tối đa 3 ngày làm việc/);
  assert.equal(rejected.type, 'order');
  assert.equal(rejected.orderId, 'o1');
});

// ---------- Service: cập nhật nguyên tử, hook, lỗi phụ ----------
function memRepo(initial) {
  const store = new Map([[initial._id, structuredClone(initial)]]);
  const setPath = (obj, path, value) => {
    const keys = path.split('.');
    let cur = obj;
    keys.slice(0, -1).forEach((k) => { cur[k] = cur[k] || {}; cur = cur[k]; });
    cur[keys[keys.length - 1]] = value;
  };
  return {
    store,
    findById: async (id) => structuredClone(store.get(id)) || null,
    updateIfStatus: async (id, from, update) => {
      const doc = store.get(id);
      if (!doc || doc.status !== from) return null;
      for (const [k, v] of Object.entries(update.$set)) setPath(doc, k, v);
      for (const [k, v] of Object.entries(update.$push)) (doc[k] = doc[k] || []).push(v);
      return structuredClone(doc);
    },
  };
}
const silent = { error: () => {} };

test('transitionOrder: đổi trạng thái, ghi lịch sử, chạy hiệu ứng và gửi thông báo', async () => {
  const repo = memRepo(order({ status: S.PENDING_APPROVAL, statusHistory: [] }));
  const ran = []; const sent = [];
  const deps = {
    repo, getSettings: async () => settings, logger: silent,
    effects: { RELEASE_SLOT: async (e) => ran.push(e.type), RESTORE_VOUCHER: async (e) => ran.push(e.type) },
    notify: async (n) => sent.push(n),
  };
  const out = await transitionOrder('o1', S.CANCELLED, { actor: CUSTOMER, reasonCode: 'change_time', now: NOW }, deps);
  assert.equal(out.status, S.CANCELLED);
  assert.equal(out.statusHistory.length, 1);
  assert.equal(out.payment.slotHeld, false);
  assert.equal(out.refund.suggestedAmount, 500000);
  assert.deepEqual(ran.sort(), ['RELEASE_SLOT', 'RESTORE_VOUCHER']);
  assert.equal(sent.length, 1);
});

test('transitionOrder: hai yêu cầu đồng thời chỉ một yêu cầu thắng', async () => {
  const repo = memRepo(order({ status: S.PENDING_APPROVAL, statusHistory: [] }));
  const deps = { repo, getSettings: async () => settings, logger: silent, effects: { RELEASE_SLOT: async () => {}, RESTORE_VOUCHER: async () => {} } };
  const first = transitionOrder('o1', S.ACCEPTED, { actor: ADMIN }, deps);
  const second = transitionOrder('o1', S.CANCELLED, { actor: CUSTOMER, reasonCode: 'other' }, deps);
  const results = await Promise.allSettled([first, second]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const rejected = results.find((r) => r.status === 'rejected');
  assert.ok(['INVALID_TRANSITION', 'FORBIDDEN'].includes(rejected.reason.code));
  assert.equal(repo.store.get('o1').statusHistory.length, 1);
});

test('transitionOrder: lỗi hiệu ứng hoặc thông báo không làm hỏng việc đổi trạng thái', async () => {
  const repo = memRepo(order({ status: S.PENDING_PAYMENT, statusHistory: [] }));
  const logged = [];
  const deps = {
    repo, getSettings: async () => settings, logger: { error: (...a) => logged.push(a) },
    effects: { RELEASE_SLOT: async () => { throw new Error('db'); }, RESTORE_VOUCHER: async () => {} },
    notify: async () => { throw new Error('mail'); },
  };
  const out = await transitionOrder('o1', S.CANCELLED, { actor: SYSTEM, reasonCode: 'payment_timeout' }, deps);
  assert.equal(out.status, S.CANCELLED);
  assert.equal(logged.length, 2);
});

test('transitionOrder: patch ghi cùng lúc (xác nhận thanh toán) nhưng không ghi đè status', async () => {
  const repo = memRepo(order({ status: S.PENDING_PAYMENT, statusHistory: [], payment: { status: 'pending' } }));
  const out = await transitionOrder('o1', S.PENDING_APPROVAL, {
    actor: SYSTEM, now: NOW,
    patch: { 'payment.status': 'paid', 'payment.paidAt': NOW, 'payment.confirmedBy': 'webhook', 'payment.txnId': 'T1' },
  }, { repo, logger: silent });
  assert.equal(out.status, S.PENDING_APPROVAL);
  assert.deepEqual([out.payment.status, out.payment.confirmedBy, out.payment.txnId], ['paid', 'webhook', 'T1']);
  await assert.rejects(transitionOrder('o1', S.ACCEPTED, { actor: ADMIN, patch: { status: 'delivered' } }, { repo, logger: silent }), (e) => e.status === 500);
});

test('transitionOrder: không thấy đơn -> NOT_FOUND', async () => {
  await assert.rejects(transitionOrder('zzz', S.ACCEPTED, { actor: ADMIN }, { repo: memRepo(order()) }), (e) => e.status === 404 && e.code === 'NOT_FOUND');
});

test('bảng TRANSITIONS có đúng 11 cạnh (10 hàng bảng scope, hàng "Đã tiếp nhận / Đang làm bánh -> Đã hủy" tách hai)', () => {
  const edges = Object.values(TRANSITIONS).reduce((n, to) => n + Object.keys(to).length, 0);
  assert.equal(edges, 11);
});
