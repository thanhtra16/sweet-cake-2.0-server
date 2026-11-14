'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeQuote, priceLine, countMessageChars, assertOrderable, assertExpectedTotal,
} = require('../src/services/pricing.service');
const { evaluateVoucher } = require('../src/services/voucher.service');

const customization = {
  sizes: [
    { name: '10cm', priceDiff: 0, maxChars: 30, active: true },
    { name: '14cm', priceDiff: 20000, maxChars: 60, active: true },
    { name: '18cm', priceDiff: 40000, maxChars: 100, active: true },
    { name: '22cm', priceDiff: 60000, maxChars: 140, active: true },
  ],
  fillings: [
    { name: 'Bắp', priceDiff: 0, active: true },
    { name: 'Matcha', priceDiff: 15000, active: true },
    { name: 'Socola', priceDiff: 10000, active: false },
  ],
  bases: [{ name: 'Vani', priceDiff: 0, active: true }, { name: 'Socola', priceDiff: 5000, active: true }],
  frostingColors: [{ name: 'Hồng', priceDiff: 0, active: true }],
  sweetnessLevels: [{ name: 'Vừa', priceDiff: 0, active: true }],
  required: { base: false, frostingColor: false, sweetness: false },
  bannedWords: ['cấm'],
};
const settings = { deliveryFee: 30000 };

const cake = {
  _id: 'cake1', kind: 'cake', status: 'visible', basePrice: 350000, salePrice: null,
  availableSizes: ['10cm', '14cm', '18cm', '22cm'], availableFillings: [],
};
const cupcake = { _id: 'cup1', kind: 'cake', status: 'visible', basePrice: 30000, availableSizes: [], availableFillings: [] };
const candle = {
  _id: 'acc1', kind: 'accessory', status: 'visible', basePrice: 20000,
  variants: [{ _id: 'v1', label: 'Số 1', active: true }, { _id: 'v2', label: 'Số 2', active: false }],
};
const hidden = { ...cake, _id: 'hid1', status: 'hidden' };
const products = new Map([cake, cupcake, candle, hidden].map((p) => [p._id, p]));

const cakeLine = (config, extra = {}) => ({ productId: 'cake1', kind: 'cake', qty: 1, config: { filling: 'Bắp', ...config }, ...extra });
const quote = (items, extra = {}, data = {}) =>
  computeQuote({ items, ...extra }, { products, customization, settings, now: new Date('2026-11-10T00:00:00Z'), ...data });

test('BR6: đơn giá = giá cơ bản + phụ phí size + phụ phí tùy chọn', () => {
  const q = quote([cakeLine({ size: '18cm', filling: 'Matcha', base: 'Socola' })]);
  assert.equal(q.items[0].unitPrice, 350000 + 40000 + 15000 + 5000);
  assert.deepEqual(q.items[0].surcharges.map((s) => s.type), ['size', 'filling', 'base']);
});

test('BR6: giá khuyến mãi thay giá cơ bản, phụ phí không bị giảm', () => {
  const sale = new Map(products).set('cake1', { ...cake, salePrice: 300000 });
  const q = quote([cakeLine({ size: '14cm', filling: 'Matcha' })], {}, { products: sale });
  assert.equal(q.items[0].unitPrice, 300000 + 20000 + 15000);
  assert.equal(q.items[0].basePrice, 350000);
  assert.equal(q.items[0].salePrice, 300000);
});

test('BR6: Tạm tính chỉ cộng dòng hợp lệ; Tổng = Tạm tính - Giảm giá + Phí giao', () => {
  const voucher = { code: 'GIAM10', type: 'percent', value: 10, active: true, usedCount: 0 };
  const q = quote(
    [cakeLine({ size: '10cm' }, { qty: 2 }), { productId: 'hid1', kind: 'cake', qty: 1, config: {} }],
    { voucherCode: 'giam10', receiveMethod: 'delivery' },
    { voucher }
  );
  assert.equal(q.valid, false);
  assert.equal(q.subtotal, 700000);
  assert.equal(q.discount, 70000);
  assert.equal(q.deliveryFee, 30000);
  assert.equal(q.total, 700000 - 70000 + 30000);
});

test('BR14: nhận tại cửa hàng không tính phí giao', () => {
  assert.equal(quote([cakeLine({ size: '10cm' })], { receiveMethod: 'pickup' }).deliveryFee, 0);
});

test('BR6: phụ kiện biến thể không đổi giá; biến thể tắt hoặc thiếu thì không hợp lệ', () => {
  const ok = priceLine({ productId: 'acc1', kind: 'accessory', qty: 3, variant: 'v1' }, candle, customization);
  assert.equal(ok.unitPrice, 20000);
  assert.equal(ok.lineTotal, 60000);
  assert.equal(priceLine({ productId: 'acc1', qty: 1, variant: 'v2' }, candle, customization).reason, 'VARIANT_INVALID');
  assert.equal(priceLine({ productId: 'acc1', qty: 1 }, candle, customization).reason, 'VARIANT_REQUIRED');
});

test('BR10/BR1: số lượng 1..10, sản phẩm ẩn bị loại', () => {
  assert.equal(priceLine(cakeLine({ size: '10cm' }, { qty: 0 }), cake, customization).reason, 'INVALID_QTY');
  assert.equal(priceLine(cakeLine({ size: '10cm' }, { qty: 11 }), cake, customization).reason, 'INVALID_QTY');
  assert.equal(priceLine(cakeLine({ size: '10cm' }, { qty: 10 }), cake, customization).valid, true);
  assert.equal(priceLine(cakeLine({ size: '10cm' }), hidden, customization).reason, 'PRODUCT_HIDDEN');
});

test('BR8: giới hạn lời nhắn theo size, biên 30/60/100/140', () => {
  const limits = { '10cm': 30, '14cm': 60, '18cm': 100, '22cm': 140 };
  for (const [size, max] of Object.entries(limits)) {
    assert.equal(priceLine(cakeLine({ size, message: 'a'.repeat(max) }), cake, customization).valid, true, `${size} đúng ${max}`);
    const over = priceLine(cakeLine({ size, message: 'a'.repeat(max + 1) }), cake, customization);
    assert.equal(over.reason, 'MESSAGE_TOO_LONG', `${size} vượt ${max}`);
    assert.equal(over.field, 'message');
  }
});

test('BR8: đếm cả khoảng trắng, chuẩn hóa NFC và đếm theo ký tự hiển thị', () => {
  assert.equal(countMessageChars('a b'), 3);
  assert.equal(countMessageChars('Việt'), 4);
  assert.equal(countMessageChars('Vie\u0302\u0323t'), 4); // dạng tổ hợp vẫn là 4
  assert.equal(countMessageChars('🎂'), 1);
  assert.equal(countMessageChars(null), 0);
});

test('BR8: đổi sang size nhỏ làm lời nhắn vượt giới hạn thì không hợp lệ', () => {
  const msg = 'x'.repeat(50);
  assert.equal(priceLine(cakeLine({ size: '14cm', message: msg }), cake, customization).valid, true);
  assert.equal(priceLine(cakeLine({ size: '10cm', message: msg }), cake, customization).reason, 'MESSAGE_TOO_LONG');
});

test('BR8: sản phẩm không có size không nhận lời nhắn; lời nhắn trống luôn hợp lệ', () => {
  const noSize = { productId: 'cup1', kind: 'cake', qty: 1, config: { filling: 'Bắp' } };
  assert.equal(priceLine(noSize, cupcake, customization).valid, true);
  assert.equal(priceLine({ ...noSize, config: { filling: 'Bắp', message: 'hi' } }, cupcake, customization).reason, 'MESSAGE_NOT_ALLOWED');
  assert.equal(priceLine(cakeLine({ size: '10cm', message: '' }), cake, customization).valid, true);
});

test('BR8 (Could): từ cấm', () => {
  assert.equal(priceLine(cakeLine({ size: '10cm', message: 'Chúc CẤM nhé' }), cake, customization).reason, 'MESSAGE_BANNED_WORD');
});

test('BR4: nhân bắt buộc, tùy chọn tắt hoặc sai thì không hợp lệ, tùy chọn bắt buộc theo cấu hình', () => {
  const noFilling = { productId: 'cake1', qty: 1, config: { size: '10cm' } };
  assert.equal(priceLine(noFilling, cake, customization).reason, 'OPTION_REQUIRED');
  assert.equal(priceLine(cakeLine({ size: '10cm', filling: 'Socola' }), cake, customization).reason, 'OPTION_NOT_AVAILABLE');
  const req = { ...customization, required: { base: true } };
  const r = priceLine(cakeLine({ size: '10cm' }), cake, req);
  assert.equal(r.reason, 'OPTION_REQUIRED');
  assert.equal(r.field, 'base');
});

test('BR7: priceChanged so với giá khách đã thấy; thiếu unitPrice thì không báo', () => {
  const same = priceLine(cakeLine({ size: '10cm' }, { unitPrice: 350000 }), cake, customization);
  const diff = priceLine(cakeLine({ size: '10cm' }, { unitPrice: 340000 }), cake, customization);
  const none = priceLine(cakeLine({ size: '10cm' }), cake, customization);
  assert.deepEqual([same.priceChanged, diff.priceChanged, none.priceChanged], [false, true, false]);
});

test('BR7: expectedTotal lệch -> PRICE_CHANGED (409); khớp -> qua', () => {
  const q = quote([cakeLine({ size: '10cm' })]);
  assert.doesNotThrow(() => assertExpectedTotal(q, 350000));
  assert.throws(() => assertExpectedTotal(q, 340000), (e) => e.status === 409 && e.code === 'PRICE_CHANGED');
  assert.throws(() => assertExpectedTotal(q, '350000'), (e) => e.code === 'VALIDATION_ERROR');
});

test('assertOrderable: sản phẩm ẩn -> PRODUCT_HIDDEN, dòng sai khác -> VALIDATION_ERROR, voucher sai -> VOUCHER_INVALID', () => {
  assert.throws(() => assertOrderable(quote([{ productId: 'hid1', qty: 1, config: {} }])), (e) => e.code === 'PRODUCT_HIDDEN');
  assert.throws(() => assertOrderable(quote([cakeLine({})])), (e) => e.code === 'VALIDATION_ERROR');
  const q = quote([cakeLine({ size: '10cm' })], { voucherCode: 'SAI' }, { voucher: null });
  assert.equal(q.total, 350000); // quote vẫn hiển thị tổng không giảm
  assert.throws(() => assertOrderable(q), (e) => e.code === 'VOUCHER_INVALID');
});

test('quote không nhận danh sách rỗng hoặc hình thức nhận sai', () => {
  assert.throws(() => quote([]), (e) => e.code === 'VALIDATION_ERROR');
  assert.throws(() => quote([cakeLine({ size: '10cm' })], { receiveMethod: 'ship' }), (e) => e.code === 'VALIDATION_ERROR');
});

// ---- Voucher (BR15): cùng một hàm cho validate, quote và tạo đơn ----
const now = new Date('2026-11-10T00:00:00Z');
const base = { code: 'KM', type: 'percent', value: 10, active: true, usedCount: 0, usageLimit: 5, minOrder: 100000, maxDiscount: 50000, expiresAt: '2026-12-01T00:00:00Z' };

test('voucher: phần trăm có trần giảm tối đa, số tiền không vượt Tạm tính', () => {
  assert.equal(evaluateVoucher(base, 300000, { now }).discount, 30000);
  assert.equal(evaluateVoucher(base, 900000, { now }).discount, 50000);
  assert.equal(evaluateVoucher({ ...base, type: 'amount', value: 80000, maxDiscount: null }, 60000 + 50000, { now }).discount, 80000);
  assert.equal(evaluateVoucher({ ...base, type: 'amount', value: 999999, maxDiscount: null, minOrder: 0 }, 70000, { now }).discount, 70000);
});

test('voucher: các lý do từ chối', () => {
  const reason = (v, sub = 300000) => evaluateVoucher(v, sub, { now }).reason;
  assert.equal(reason(null), 'NOT_FOUND');
  assert.equal(reason({ ...base, active: false }), 'INACTIVE');
  assert.equal(reason({ ...base, expiresAt: '2026-11-09T00:00:00Z' }), 'EXPIRED');
  assert.equal(reason({ ...base, usedCount: 5 }), 'USED_UP');
  assert.equal(reason(base, 99999), 'MIN_ORDER_NOT_MET');
  assert.equal(reason(base, 0), 'NO_VALID_ITEMS');
});

test('voucher: không giới hạn lượt hoặc thời hạn khi để trống', () => {
  const open = { ...base, usageLimit: null, expiresAt: null, usedCount: 9999 };
  assert.equal(evaluateVoucher(open, 300000, { now }).valid, true);
});

test('voucher: quote và validate dùng cùng kết quả (cùng hàm, cùng Tạm tính)', () => {
  const q = quote([cakeLine({ size: '10cm' })], { voucherCode: 'km' }, { voucher: base });
  assert.deepEqual(q.voucher.voucher, evaluateVoucher(base, q.subtotal, { now }).voucher);
  assert.equal(q.voucher.code, 'KM');
});
