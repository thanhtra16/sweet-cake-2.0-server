const service = require('../services/admin-user.service');
const { handle } = require('../utils/http-error');

// GET /api/admin/users?search=&status=&page=&limit=
const list = handle(async (req, res) => {
  const data = await service.listUsers(req.query);
  res.json({ success: true, data });
});

// GET /api/admin/users/:id
const detail = handle(async (req, res) => {
  const data = await service.getUser(req.params.id);
  res.json({ success: true, data });
});

// PATCH /api/admin/users/:id/status  { status: 'active' | 'locked', reason? }
const updateStatus = handle(async (req, res) => {
  const adminId = req.user?._id || req.user?.id; // đổi nếu middleware auth gắn user ở chỗ khác
  const data = await service.setStatus(req.params.id, req.body.status, req.body.reason, adminId);
  const message = data.status === 'locked' ? 'Đã khóa tài khoản khách hàng.' : 'Đã mở khóa tài khoản khách hàng.';
  res.json({ success: true, message, data });
});

module.exports = { list, detail, updateStatus };
