const express = require("express");
const router = express.Router();

const reviewController = require("../controllers/review.controller");
const { auth, requireRole } = require("../middlewares/auth");

// Buyer phải đăng nhập mới được tạo, sửa, xóa đánh giá
router.post(
  "/",
  auth,
  requireRole("buyer"),
  reviewController.createReview
);

router.get("/", reviewController.getProductReviews);

router.patch(
  "/:id",
  auth,
  requireRole("buyer"),
  reviewController.updateReview
);

router.delete(
  "/:id",
  auth,
  requireRole("buyer"),
  reviewController.deleteReview
);

module.exports = router;
