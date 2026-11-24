const mongoose = require('mongoose');
const { validate, str } = require('./common');
const { isValidDateString } = require('../utils/vn-date');

const MAX_CAPACITY = 1000;
const MAX_LABEL = 30;

const capacityError = (v) => {
  if (typeof v !== 'number' || !Number.isInteger(v)) return 'Sức chứa phải là số nguyên';
  if (v < 0 || v > MAX_CAPACITY) return `Sức chứa từ 0 đến ${MAX_CAPACITY}`;
  return null;
};

const list = validate((req) =>
  req.query.date !== undefined && !isValidDateString(String(req.query.date))
    ? { date: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' }
    : {}
);

const create = validate((req) => {
  const errors = {};
  const label = str(req.body.label);
  if (!isValidDateString(req.body.date)) errors.date = 'Ngày không hợp lệ (định dạng YYYY-MM-DD)';
  if (!label) errors.label = 'Vui lòng nhập nhãn ca';
  else if (label.length > MAX_LABEL) errors.label = `Nhãn ca tối đa ${MAX_LABEL} ký tự`;
  const cap = capacityError(req.body.capacity);
  if (cap) errors.capacity = cap;
  return errors;
});

const update = validate((req) => {
  const errors = {};
  const { capacity, closed } = req.body;
  if (!mongoose.isValidObjectId(req.params.id)) errors.id = 'Mã khung giờ không hợp lệ';
  if (capacity === undefined && closed === undefined) {
    errors.body = 'Cần gửi capacity hoặc closed';
  }
  if (capacity !== undefined) {
    const cap = capacityError(capacity);
    if (cap) errors.capacity = cap;
  }
  if (closed !== undefined && typeof closed !== 'boolean') errors.closed = 'closed phải là true hoặc false';
  return errors;
});

const fromTemplates = validate((req) =>
  isValidDateString(req.body.date) ? {} : { date: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' }
);

module.exports = { list, create, fromTemplates, update };
