const service = require('../services/admin-time-slot.service');
const { handle } = require('../utils/http-error');
const { todayString } = require('../utils/vn-date');

// GET /api/admin/time-slots?date=YYYY-MM-DD   (mặc định hôm nay)
const list = handle(async (req, res) => {
  const data = await service.listByDate(req.query.date || todayString());
  res.json({ success: true, data });
});

// POST /api/admin/time-slots  { date, label, capacity }
const create = handle(async (req, res) => {
  const data = await service.createSlot(req.body);
  res.status(201).json({ success: true, message: 'Đã tạo khung giờ mới.', data });
});

// POST /api/admin/time-slots/from-templates  { date }  -> tạo các ca mẫu còn thiếu trong ngày
const createFromTemplates = handle(async (req, res) => {
  const data = await service.createFromTemplates(req.body.date);
  const message =
    data.created > 0
      ? `Đã tạo ${data.created} khung giờ theo mẫu.`
      : 'Các khung giờ mẫu đã có đủ trong ngày này.';
  res.status(data.created > 0 ? 201 : 200).json({ success: true, message, data });
});

// PUT /api/admin/time-slots/:id  { capacity?, closed? }
const update = handle(async (req, res) => {
  const data = await service.updateSlot(req.params.id, req.body);
  let message = 'Đã cập nhật khung giờ.';
  if (req.body.closed === true) message = 'Đã đóng khung giờ.';
  else if (req.body.closed === false) message = 'Đã mở lại khung giờ.';
  res.json({ success: true, message, data });
});

module.exports = { list, create, createFromTemplates, update };
