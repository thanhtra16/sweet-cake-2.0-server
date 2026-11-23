const router = require('express').Router();
const controller = require('../controllers/admin-user.controller');
const validator = require('../validators/admin-user.validator');
// Đổi đường dẫn / tên export cho khớp với thư mục middlewares hiện có của bạn.
const { auth, requireRole } = require('../middlewares/auth');

// Gắn trong routes/index.js:  router.use('/admin/users', require('./admin-user.routes'));
router.use(auth, requireRole('admin'));

router.get('/', validator.listUsers, controller.list);
router.get('/:id', validator.userIdParam, controller.detail);
router.patch('/:id/status', validator.updateStatus, controller.updateStatus);

module.exports = router;
