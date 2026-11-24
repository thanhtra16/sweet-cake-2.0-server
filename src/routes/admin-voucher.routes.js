const router = require('express').Router();
const controller = require('../controllers/admin-voucher.controller');
const validator = require('../validators/admin-voucher.validator');
const { auth, requireRole } = require('../middlewares/auth');

// Gắn trong routes/index.js:  router.use('/admin/vouchers', require('./admin-voucher.routes'));
router.use(auth, requireRole('admin'));

router.get('/', validator.list, controller.list);
router.post('/', validator.create, controller.create);
router.get('/:id', validator.idParam, controller.detail);
router.put('/:id', validator.update, controller.update);
router.patch('/:id/status', validator.updateStatus, controller.updateStatus);
router.delete('/:id', validator.idParam, controller.remove);

module.exports = router;
