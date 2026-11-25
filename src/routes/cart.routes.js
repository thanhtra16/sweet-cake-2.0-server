const express = require("express");
const router = express.Router();

const cartController = require("../controllers/cart.controller");
const { auth } = require("../middlewares/auth");

// Toàn bộ API /api/cart yêu cầu đăng nhập
router.use(auth);

router.get("/", cartController.getCart);
router.post("/items", cartController.addItem);
router.post("/items/bulk-remove", cartController.removeOrderedItems);
router.patch("/items/:itemId", cartController.updateItemQty);
router.delete("/items/:itemId", cartController.removeItem);
router.post("/merge", cartController.mergeGuestCart);

module.exports = router;