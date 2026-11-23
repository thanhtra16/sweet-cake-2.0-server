const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");
const { verifyToken } = require("../middlewares/auth.middleware"); // Middleware giải mã JWT gắn req.user

// Toàn bộ API /api/cart yêu cầu đăng nhập (Buyer)
router.use(verifyToken);

router.get("/", cartController.getCart);
router.post("/items", cartController.addItem);
router.patch("/items/:itemId", cartController.updateItemQty);
router.delete("/items/:itemId", cartController.removeItem);
router.post("/items/bulk-remove", cartController.removeOrderedItems);
router.post("/merge", cartController.mergeGuestCart);

module.exports = router;