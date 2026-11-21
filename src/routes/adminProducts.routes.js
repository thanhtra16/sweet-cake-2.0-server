const express = require("express");
const router = express.Router();

const {
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
} = require("../controllers/adminProducts.controller");

const { auth, requireRole } = require("../middlewares/auth");

// Tất cả API trong nhóm này yêu cầu quyền Admin
router.use(auth, requireRole("admin"));

router.get("/", getAdminProducts);
router.post("/", createProduct);

router.patch("/:id/status", updateProductStatus);
router.put("/:id", updateProduct);
router.get("/:id", getAdminProductById);

module.exports = router;
