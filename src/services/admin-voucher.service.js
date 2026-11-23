/**
 * FR-A-19 Admin quản lý voucher: danh sách, thêm, sửa, kích hoạt/vô hiệu hóa, xóa.
 * Cần thêm trường `startsAt` vào models/vouchers.js (xem INTEGRATION-TIMESLOT-VOUCHER.md).
 */
const Voucher = require('../models/vouchers');
const Order = require('../models/order');
const { HttpError } = require('../utils/http-error');
const { str } = require('../validators/common');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Trạng thái hiển thị, thứ tự ưu tiên: inactive > expired > exhausted > scheduled > running. */
function stateOf(v, now = new Date()) {
  if (!v.active) return 'inactive';
  if (v.expiresAt && new Date(v.expiresAt) < now) return 'expired';
  if (v.usageLimit != null && (v.usedCount || 0) >= v.usageLimit) return 'exhausted';
  if (v.startsAt && new Date(v.startsAt) > now) return 'scheduled';
  return 'running';
}

const toDto = (v, now = new Date()) => ({
  _id: v._id,
  code: v.code,
  type: v.type,
  value: v.value,
  maxDiscount: v.maxDiscount ?? null,
  minOrder: v.minOrder || 0,
  usageLimit: v.usageLimit ?? null,
  usedCount: v.usedCount || 0,
  remainingUses: v.usageLimit == null ? null : Math.max(0, v.usageLimit - (v.usedCount || 0)),
  startsAt: v.startsAt ?? null,
  expiresAt: v.expiresAt ?? null,
  active: Boolean(v.active),
  description: v.description || '',
  state: stateOf(v, now),
  createdAt: v.createdAt,
});

// Bộ lọc Mongo tương ứng với từng trạng thái (cùng quy tắc với stateOf).
function stateFilter(state, now) {
  const notExpired = { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] };
  const started = { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] };
  const exhaustedExpr = { $and: [{ $gt: ['$usageLimit', 0] }, { $gte: ['$usedCount', '$usageLimit'] }] };
  const exhausted = { $expr: exhaustedExpr };
  const notExhausted = { $expr: { $not: [exhaustedExpr] } };

  switch (state) {
    case 'inactive':
      return { active: false };
    case 'expired':
      return { active: true, expiresAt: { $lt: now } };
    case 'exhausted':
      return { $and: [{ active: true }, notExpired, exhausted] };
    case 'scheduled':
      return { $and: [{ active: true }, { startsAt: { $gt: now } }, notExpired, notExhausted] };
    case 'running':
      return { $and: [{ active: true }, notExpired, started, notExhausted] };
    default:
      return {};
  }
}

async function summarize(now) {
  const count = (f) => Voucher.countDocuments(f);
  const [total, running, inactive, expired, exhausted] = await Promise.all([
    count({}),
    count(stateFilter('running', now)),
    count(stateFilter('inactive', now)),
    count(stateFilter('expired', now)),
    count(stateFilter('exhausted', now)),
  ]);
  return { total, running, inactive, ended: expired + exhausted };
}

async function listVouchers({ search, status, page = 1, limit = 10 }) {
  const now = new Date();
  const and = [];
  if (status) and.push(stateFilter(status, now));
  const keyword = (search || '').trim();
  if (keyword) {
    const rx = new RegExp(escapeRegex(keyword), 'i');
    and.push({ $or: [{ code: rx }, { description: rx }] });
  }
  const filter = and.length ? { $and: and } : {};

  const pageNo = Math.max(1, Number(page) || 1);
  const size = Math.min(50, Math.max(1, Number(limit) || 10));

  const [items, total, summary] = await Promise.all([
    Voucher.find(filter).sort({ createdAt: -1 }).skip((pageNo - 1) * size).limit(size).lean(),
    Voucher.countDocuments(filter),
    summarize(now),
  ]);

  return {
    items: items.map((v) => toDto(v, now)),
    page: pageNo,
    limit: size,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    summary,
  };
}

async function getVoucher(id) {
  const v = await Voucher.findById(id).lean();
  if (!v) throw new HttpError(404, 'Không tìm thấy voucher.', 'VOUCHER_NOT_FOUND');
  return toDto(v);
}

function fieldsFrom(body) {
  const isPercent = body.type === 'percent';
  const orNull = (v) => (v === undefined || v === null || v === '' ? null : v);
  return {
    code: str(body.code).toUpperCase(),
    type: body.type,
    value: body.value,
    maxDiscount: isPercent ? orNull(body.maxDiscount) : null, // chỉ có nghĩa khi giảm theo %
    minOrder: orNull(body.minOrder) ?? 0,
    usageLimit: orNull(body.usageLimit),
    startsAt: orNull(body.startsAt) ? new Date(body.startsAt) : null,
    expiresAt: orNull(body.expiresAt) ? new Date(body.expiresAt) : null,
    description: str(body.description),
  };
}

const codeExists = (code) =>
  new HttpError(409, `Mã voucher "${code}" đã tồn tại.`, 'CODE_EXISTS');

async function createVoucher(body) {
  const fields = fieldsFrom(body);
  if (await Voucher.exists({ code: fields.code })) throw codeExists(fields.code);
  try {
    const doc = await Voucher.create({ ...fields, usedCount: 0, active: body.active !== false });
    return toDto(doc.toObject());
  } catch (err) {
    if (err.code === 11000) throw codeExists(fields.code);
    throw err;
  }
}

async function updateVoucher(id, body) {
  const voucher = await Voucher.findById(id);
  if (!voucher) throw new HttpError(404, 'Không tìm thấy voucher.', 'VOUCHER_NOT_FOUND');

  const fields = fieldsFrom(body);
  const used = voucher.usedCount || 0;

  if (used > 0 && (fields.code !== voucher.code || fields.type !== voucher.type)) {
    throw new HttpError(
      400,
      'Voucher đã có lượt sử dụng, không thể đổi mã hoặc loại giảm giá. Hãy tạo voucher mới.',
      'VOUCHER_LOCKED'
    );
  }
  if (fields.usageLimit != null && fields.usageLimit < used) {
    throw new HttpError(
      400,
      `Số lượt tối đa không được nhỏ hơn số lượt đã dùng (${used}).`,
      'LIMIT_BELOW_USED',
      { used }
    );
  }
  if (fields.code !== voucher.code && (await Voucher.exists({ code: fields.code, _id: { $ne: id } }))) {
    throw codeExists(fields.code);
  }

  voucher.set(fields);
  if (typeof body.active === 'boolean') voucher.active = body.active;
  try {
    await voucher.save();
  } catch (err) {
    if (err.code === 11000) throw codeExists(fields.code);
    throw err;
  }
  return toDto(voucher.toObject());
}

async function setActive(id, active) {
  const v = await Voucher.findByIdAndUpdate(id, { $set: { active } }, { new: true }).lean();
  if (!v) throw new HttpError(404, 'Không tìm thấy voucher.', 'VOUCHER_NOT_FOUND');
  return toDto(v);
}

/** Chỉ xóa được voucher chưa từng dùng; còn lại hãy vô hiệu hóa để giữ lịch sử đơn hàng. */
async function removeVoucher(id) {
  const v = await Voucher.findById(id).lean();
  if (!v) throw new HttpError(404, 'Không tìm thấy voucher.', 'VOUCHER_NOT_FOUND');
  if ((v.usedCount || 0) > 0 || (await Order.exists({ 'voucher.code': v.code }))) {
    throw new HttpError(
      409,
      'Voucher đã được dùng trong đơn hàng nên không thể xóa. Hãy vô hiệu hóa voucher này.',
      'VOUCHER_USED'
    );
  }
  await Voucher.deleteOne({ _id: id });
}

module.exports = { listVouchers, getVoucher, createVoucher, updateVoucher, setActive, removeVoucher, stateOf };
