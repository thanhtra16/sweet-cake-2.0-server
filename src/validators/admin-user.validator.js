const mongoose = require('mongoose');
const { validate, str } = require('./common');

const STATUSES = ['active', 'locked'];

const listUsers = validate((req) => {
  const errors = {};
  const { status, page, limit } = req.query;
  if (status && !STATUSES.includes(status)) errors.status = 'Trạng thái không hợp lệ';
  if (page !== undefined && !(Number.isInteger(+page) && +page >= 1)) {
    errors.page = 'Trang phải là số nguyên ≥ 1';
  }
  if (limit !== undefined && !(Number.isInteger(+limit) && +limit >= 1 && +limit <= 50)) {
    errors.limit = 'Số dòng mỗi trang từ 1 đến 50';
  }
  return errors;
});

const userIdParam = validate((req) =>
  mongoose.isValidObjectId(req.params.id) ? {} : { id: 'Mã người dùng không hợp lệ' }
);

const updateStatus = validate((req) => {
  const errors = {};
  if (!mongoose.isValidObjectId(req.params.id)) errors.id = 'Mã người dùng không hợp lệ';
  if (!STATUSES.includes(req.body.status)) errors.status = 'Trạng thái phải là active hoặc locked';
  if (req.body.reason !== undefined && str(req.body.reason).length > 200) {
    errors.reason = 'Lý do tối đa 200 ký tự';
  }
  return errors;
});

module.exports = { listUsers, userIdParam, updateStatus };
