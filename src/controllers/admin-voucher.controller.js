const service = require('../services/admin-voucher.service');
const { handle } = require('../utils/http-error');

// GET /api/admin/vouchers?search=&status=running|scheduled|expired|exhausted|inactive&page=&limit=
const list = handle(async (req, res) => {
  res.json({ success: true, data: await service.listVouchers(req.query) });
});

// GET /api/admin/vouchers/:id
const detail = handle(async (req, res) => {
  res.json({ success: true, data: await service.getVoucher(req.params.id) });
});

// POST /api/admin/vouchers
const create = handle(async (req, res) => {
  const data = await service.createVoucher(req.body);
  res.status(201).json({ success: true, message: 'Đã tạo voucher mới.', data });
});

// PUT /api/admin/vouchers/:id
const update = handle(async (req, res) => {
  const data = await service.updateVoucher(req.params.id, req.body);
  res.json({ success: true, message: 'Đã cập nhật voucher.', data });
});

// PATCH /api/admin/vouchers/:id/status  { active: boolean }
const updateStatus = handle(async (req, res) => {
  const data = await service.setActive(req.params.id, req.body.active);
  res.json({
    success: true,
    message: data.active ? 'Đã kích hoạt voucher.' : 'Đã vô hiệu hóa voucher.',
    data,
  });
});

// DELETE /api/admin/vouchers/:id
const remove = handle(async (req, res) => {
  await service.removeVoucher(req.params.id);
  res.json({ success: true, message: 'Đã xóa voucher.' });
});

module.exports = { list, detail, create, update, updateStatus, remove };
