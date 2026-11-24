const mongoose = require('mongoose');
const { validate, str } = require('./common');

const STATES = ['running', 'scheduled', 'expired', 'exhausted', 'inactive'];
const TYPES = ['percent', 'amount'];
const CODE_RE = /^[A-Z0-9_-]{3,20}$/;

const isInt = Number.isInteger;
const isEmpty = (v) => v === undefined || v === null || v === '';
const toDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Quy tắc nhập chung cho thêm mới và chỉnh sửa voucher (FR-A-19). */
function bodyErrors(body, { creating }) {
  const errors = {};

  const code = str(body.code).toUpperCase();
  if (!code) errors.code = 'Vui lòng nhập mã voucher';
  else if (!CODE_RE.test(code)) errors.code = 'Mã gồm 3–20 ký tự: chữ, số, gạch ngang hoặc gạch dưới';

  if (!TYPES.includes(body.type)) errors.type = 'Loại giảm giá phải là percent hoặc amount';

  if (typeof body.value !== 'number' || !isInt(body.value)) {
    errors.value = 'Giá trị giảm phải là số nguyên';
  } else if (body.type === 'percent' && (body.value < 1 || body.value > 100)) {
    errors.value = 'Giảm theo % phải từ 1 đến 100';
  } else if (body.type === 'amount' && body.value < 1) {
    errors.value = 'Số tiền giảm phải lớn hơn 0';
  }

  if (!isEmpty(body.maxDiscount) && (typeof body.maxDiscount !== 'number' || !isInt(body.maxDiscount) || body.maxDiscount < 1)) {
    errors.maxDiscount = 'Mức giảm tối đa phải là số nguyên dương';
  }
  if (!isEmpty(body.minOrder) && (typeof body.minOrder !== 'number' || !isInt(body.minOrder) || body.minOrder < 0)) {
    errors.minOrder = 'Đơn hàng tối thiểu phải là số nguyên ≥ 0';
  }
  if (!isEmpty(body.usageLimit) && (typeof body.usageLimit !== 'number' || !isInt(body.usageLimit) || body.usageLimit < 1)) {
    errors.usageLimit = 'Số lượt sử dụng tối đa phải là số nguyên ≥ 1';
  }

  const startsAt = isEmpty(body.startsAt) ? null : toDate(body.startsAt);
  const expiresAt = isEmpty(body.expiresAt) ? null : toDate(body.expiresAt);
  if (!isEmpty(body.startsAt) && !startsAt) errors.startsAt = 'Thời gian bắt đầu không hợp lệ';
  if (!isEmpty(body.expiresAt) && !expiresAt) errors.expiresAt = 'Thời gian kết thúc không hợp lệ';
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    errors.expiresAt = 'Thời gian kết thúc phải sau thời gian bắt đầu';
  }
  if (creating && expiresAt && expiresAt <= new Date()) {
    errors.expiresAt = 'Thời gian kết thúc phải ở tương lai';
  }

  if (body.description !== undefined && str(body.description).length > 200) {
    errors.description = 'Mô tả tối đa 200 ký tự';
  }
  if (body.active !== undefined && typeof body.active !== 'boolean') {
    errors.active = 'active phải là true hoặc false';
  }
  return errors;
}

const idError = (req) =>
  mongoose.isValidObjectId(req.params.id) ? {} : { id: 'Mã voucher không hợp lệ' };

const list = validate((req) => {
  const errors = {};
  const { status, page, limit } = req.query;
  if (status && !STATES.includes(status)) errors.status = 'Trạng thái không hợp lệ';
  if (page !== undefined && !(isInt(+page) && +page >= 1)) errors.page = 'Trang phải là số nguyên ≥ 1';
  if (limit !== undefined && !(isInt(+limit) && +limit >= 1 && +limit <= 50)) {
    errors.limit = 'Số dòng mỗi trang từ 1 đến 50';
  }
  return errors;
});

const idParam = validate(idError);
const create = validate((req) => bodyErrors(req.body, { creating: true }));
const update = validate((req) => ({ ...idError(req), ...bodyErrors(req.body, { creating: false }) }));
const updateStatus = validate((req) => ({
  ...idError(req),
  ...(typeof req.body.active === 'boolean' ? {} : { active: 'active phải là true hoặc false' }),
}));

module.exports = { STATES, list, idParam, create, update, updateStatus };
