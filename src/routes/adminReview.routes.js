const express = require("express");
const router = express.Router();

const { auth, requireRole } = require("../middlewares/auth");
const reviewController = require("../controllers/review.controller");

// Tất cả API đều yêu cầu quyền Admin
router.use(auth, requireRole("admin"));

router.get("/", reviewController.getAdminReviews);

router.patch("/:id/status", reviewController.updateReviewStatus);

module.exports = router;
