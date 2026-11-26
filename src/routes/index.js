// File tập trung quản lý các route của dự án
const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const postRoutes = require("./post.routes");
const faqRoutes = require("./faq.routes");
const blogRoutes = require("./blog.routes");
const notificationRoutes = require("./notification.routes");
const adminUserRoutes = require("./admin-user.routes");
const adminTimeSlotRoutes = require("./admin-time-slot.routes");
const adminVoucherRoutes = require("./admin-voucher.routes");
const adminCustomizationRoutes = require("./adminCustomization.routes");
const adminOrderRoutes = require("./adminOrder.routes");
const adminProductsRoutes = require("./adminProducts.routes");
const imagesRoutes = require("./images.routes");
const productsRoutes = require("./products.routes");
const orderRoutes = require("./order.routes");
const cartRoutes = require("./cart.routes");
const reviewRoutes = require("./review.routes");
const adminReviewRoutes = require("./adminReview.routes");
const adminTimeSlotController = require("../controllers/admin-time-slot.controller");

// API kiểm tra server
router.use("/", healthRoutes);

// API đăng ký, đăng nhập
router.use("/auth", authRoutes);

// API tài khoản
router.use("/users", userRoutes);

// API bài viết, FAQ, Blog, thông báo
router.use("/posts", postRoutes);
router.use("/faqs", faqRoutes);
router.use("/blogs", blogRoutes);
router.use("/notifications", notificationRoutes);

// API Admin
router.use("/admin/users", adminUserRoutes);
router.use("/admin/time-slots", adminTimeSlotRoutes);
router.use("/admin/vouchers", adminVoucherRoutes);
router.use("/admin/customizations", adminCustomizationRoutes);
router.use("/admin/orders", adminOrderRoutes);
router.use("/admin/products", adminProductsRoutes);
router.use("/admin/reviews", adminReviewRoutes);

// Public checkout settings
router.get("/time-slots", adminTimeSlotController.list);
router.get("/settings/public", async (req, res, next) => {
  try {
    const mongoose = require("mongoose");
    const Setting =
      mongoose.models.Setting || mongoose.models.StoreSetting || null;
    const Branch = mongoose.models.Branch || null;

    const DEFAULT_BRANCHES = [
      {
        _id: "branch-thu-duc",
        name: "SweetCake Thủ Đức",
        address: "669 Đỗ Mười, Khu phố 6, Phường Linh Xuân, Thủ Đức, TP.HCM",
        phone: "0901 234 567",
        isActive: true,
      },
    ];

    const setting = Setting ? await Setting.findOne().lean() : null;
    const branches = Branch
      ? await Branch.find({ isActive: { $ne: false } }).lean()
      : DEFAULT_BRANCHES;

    res.json({
      success: true,
      data: {
        ...(setting || {}),
        branches: branches.length ? branches : DEFAULT_BRANCHES,
      },
    });
  } catch (err) {
    next(err);
  }
});

// API sản phẩm, giỏ hàng, đơn hàng, đánh giá
router.use("/images", imagesRoutes);
router.use("/products", productsRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/reviews", reviewRoutes);

module.exports = router;
