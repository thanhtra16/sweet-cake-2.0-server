/**
 * Ngày theo giờ Việt Nam (UTC+7). Khung giờ nhận bánh được quản lý theo "ngày VN",
 * nên mọi truy vấn theo ngày dùng khoảng [00:00, 24:00) giờ VN để khớp cả khi
 * seed lưu ngày ở 00:00 UTC lẫn 00:00 giờ VN.
 */
const VN_OFFSET = '+07:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toDateString = (date) =>
  new Date(new Date(date).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

const dayStart = (dateStr) => new Date(`${dateStr}T00:00:00${VN_OFFSET}`);

function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = dayStart(value);
  return !Number.isNaN(d.getTime()) && toDateString(d) === value;
}

function dayRange(dateStr) {
  const start = dayStart(dateStr);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

const todayString = () => toDateString(new Date());

module.exports = { toDateString, dayStart, dayRange, isValidDateString, todayString };
