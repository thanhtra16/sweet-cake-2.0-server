/**
 * FR-A-18 Admin quản lý khung giờ nhận bánh.
 * `used` bao gồm cả chỗ đang giữ (RELEASE_SLOT trong orderStatus.service trừ `used` khi đơn bị hủy),
 * nên chỉ cần so capacity với used.
 * Khung giờ mẫu lấy từ Settings.slotTemplates (cùng nguồn với seed/timeslots.seed.js).
 */
const TimeSlot = require('../models/timeslots');
const Setting = require('../models/settings');
const { HttpError } = require('../utils/http-error');
const { dayRange, dayStart, toDateString, todayString } = require('../utils/vn-date');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cleanLabel = (s) => String(s).trim().replace(/\s+/g, ' ');
const sameLabel = (a, b) => cleanLabel(a).toLowerCase() === cleanLabel(b).toLowerCase();

const toDto = (s) => {
  const used = s.used || 0;
  return {
    _id: s._id,
    date: toDateString(s.date),
    label: s.label,
    capacity: s.capacity,
    used,
    remaining: Math.max(0, s.capacity - used),
    closed: Boolean(s.closed),
  };
};

/** Khung giờ mẫu trong Settings; nếu chưa cấu hình thì gợi ý từ các nhãn đã có (không có sức chứa mặc định). */
async function getTemplates() {
  const setting = await Setting.findOne().select('slotTemplates').lean();
  const templates = (setting?.slotTemplates || [])
    .filter((t) => t && t.label)
    .map((t) => ({ label: cleanLabel(t.label), capacity: Number.isInteger(t.capacity) ? t.capacity : null }));
  if (templates.length > 0) return templates;
  const labels = await TimeSlot.distinct('label');
  return labels.sort().map((label) => ({ label, capacity: null }));
}

/**
 * Giá trị `date` sẽ lưu cho một ngày VN. Seed lưu ngày theo múi giờ của máy chủ
 * (00:00 giờ máy chủ), nên ưu tiên dùng đúng thời điểm đã có để index (date, label) không bị lệch.
 */
async function storedDateFor(dateStr) {
  const { start, end } = dayRange(dateStr);
  const sameDay = await TimeSlot.findOne({ date: { $gte: start, $lt: end } }).select('date').lean();
  if (sameDay) return sameDay.date;

  const any = await TimeSlot.findOne().select('date').lean();
  if (any) {
    const offset = new Date(any.date).getTime() - dayStart(toDateString(any.date)).getTime();
    return new Date(start.getTime() + offset);
  }
  return start;
}

async function listByDate(dateStr) {
  const { start, end } = dayRange(dateStr);
  const [slots, templates] = await Promise.all([
    TimeSlot.find({ date: { $gte: start, $lt: end } }).sort({ label: 1 }).lean(),
    getTemplates(),
  ]);

  const items = slots.map(toDto);
  const summary = items.reduce(
    (acc, s) => {
      acc.totalCapacity += s.capacity;
      acc.totalUsed += s.used;
      if (s.closed) acc.closed += 1;
      else acc.open += 1;
      return acc;
    },
    { totalCapacity: 0, totalUsed: 0, open: 0, closed: 0 }
  );

  return { date: dateStr, items, summary, templates };
}

function assertNotPast(date) {
  if (date < todayString()) {
    throw new HttpError(400, 'Không thể tạo khung giờ cho ngày đã qua.', 'DATE_IN_PAST');
  }
}

async function createSlot({ date, label, capacity }) {
  assertNotPast(date);
  const name = cleanLabel(label);
  const { start, end } = dayRange(date);
  const exists = await TimeSlot.exists({
    date: { $gte: start, $lt: end },
    label: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
  });
  const duplicate = () =>
    new HttpError(409, `Khung giờ "${name}" đã tồn tại trong ngày này.`, 'SLOT_EXISTS');
  if (exists) throw duplicate();

  try {
    const doc = await TimeSlot.create({
      date: await storedDateFor(date),
      label: name,
      capacity,
      used: 0,
      closed: false,
    });
    return toDto(doc.toObject());
  } catch (err) {
    if (err.code === 11000) throw duplicate();
    throw err;
  }
}

/** Tạo các khung giờ mẫu còn thiếu cho một ngày (bỏ qua ca đã tồn tại). */
async function createFromTemplates(date) {
  assertNotPast(date);
  const templates = (await getTemplates()).filter((t) => t.capacity !== null);
  if (templates.length === 0) {
    throw new HttpError(
      400,
      'Chưa có khung giờ mẫu (Settings.slotTemplates) để tạo.',
      'NO_TEMPLATES'
    );
  }

  const { start, end } = dayRange(date);
  const existing = await TimeSlot.find({ date: { $gte: start, $lt: end } }).select('label').lean();
  const missing = templates.filter((t) => !existing.some((e) => sameLabel(e.label, t.label)));

  const storedDate = await storedDateFor(date);
  const created = [];
  for (const t of missing) {
    try {
      const doc = await TimeSlot.create({ date: storedDate, label: t.label, capacity: t.capacity, used: 0, closed: false });
      created.push(toDto(doc.toObject()));
    } catch (err) {
      if (err.code !== 11000) throw err; // ca vừa được tạo ở nơi khác: bỏ qua
    }
  }
  return { created: created.length, skipped: templates.length - created.length, items: created };
}

/** Sửa sức chứa và/hoặc mở/đóng. Kiểm tra capacity >= used nằm ngay trong điều kiện cập nhật (atomic). */
async function updateSlot(id, { capacity, closed }) {
  const set = {};
  const filter = { _id: id };
  if (capacity !== undefined) {
    set.capacity = capacity;
    filter.used = { $lte: capacity };
  }
  if (closed !== undefined) set.closed = closed;

  const updated = await TimeSlot.findOneAndUpdate(filter, { $set: set }, { new: true }).lean();
  if (updated) return toDto(updated);

  const current = await TimeSlot.findById(id).lean();
  if (!current) throw new HttpError(404, 'Không tìm thấy khung giờ.', 'SLOT_NOT_FOUND');
  throw new HttpError(
    400,
    `Sức chứa mới không được nhỏ hơn số chỗ đã dùng hoặc đang giữ (${current.used || 0}).`,
    'CAPACITY_BELOW_USED',
    { used: current.used || 0 }
  );
}

module.exports = { listByDate, createSlot, createFromTemplates, updateSlot };
