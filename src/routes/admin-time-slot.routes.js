const router = require('express').Router();
const controller = require('../controllers/admin-time-slot.controller');
const validator = require('../validators/admin-time-slot.validator');
// Đổi đường dẫn / tên export cho khớp thư mục middlewares hiện có (giống admin-user.routes.js).
const { auth, requireRole } = require('../middlewares/auth');

// Gắn trong routes/index.js:  router.use('/admin/time-slots', require('./admin-time-slot.routes'));
router.use(auth, requireRole('admin'));

router.get('/', validator.list, controller.list);
router.post('/', validator.create, controller.create);
router.post('/from-templates', validator.fromTemplates, controller.createFromTemplates);
router.put('/:id', validator.update, controller.update);

module.exports = router;
