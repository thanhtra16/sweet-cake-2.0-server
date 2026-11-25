
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

// ==========================================
// PUBLIC CHECKOUT ROUTES (/settings/public & /time-slots)
// ==========================================
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
        address: "669 Đỗ Mười, Phường Linh Xuân, TP.HCM",
        phone: "028 7300 1234",
      },
      {
        _id: "branch-quan-1",
        name: "SweetCake Quận 1",
        address: "45 Lê Lợi, Phường Bến Nghé, TP.HCM",
        phone: "028 7300 5678",
      },
    ];

    let branches = [];
    if (Setting) {
      const doc = await Setting.findOne().lean();
      if (doc?.branches?.length) branches = doc.branches;
    }
    if (!branches.length && Branch) {
      branches = await Branch.find({ isActive: { $ne: false } }).lean();
    }
    if (!branches.length) {
      branches = DEFAULT_BRANCHES;
    }

    return res.status(200).json({
      success: true,
      data: { branches },
      branches,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/time-slots", async (req, res) => {
  try {
    const timeSlotService = require("../services/admin-time-slot.service");
    const { todayString } = require("../utils/vn-date");
    const date = req.query.date || todayString();

    const data = await timeSlotService.listByDate(date);
    const rawList = Array.isArray(data)
      ? data
      : data?.items || data?.slots || data?.timeSlots || [];

    const items = rawList.map((s) => ({
      id: String(s.id || s._id),
      label: s.label,
      status:
        s.status ||
        (s.closed
          ? "closed"
          : (s.bookedCount || s.booked || 0) >= (s.capacity || 999)
          ? "full"
          : "open"),
    }));

    return res.status(200).json({
      success: true,
      data: { items },
      items,
    });
  } catch (err) {
    console.error("[ERROR /time-slots]:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Lỗi tải khung giờ nhận bánh.",
    });
  }
});

// API hình ảnh, sản phẩm, giỏ hàng, đơn hàng, đánh giá
router.use("/images", imagesRoutes);
router.use("/products", productsRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/reviews", reviewRoutes);

// fix
// console.log("BLOG ROUTES:", router.stack.some(
//   (layer) => layer.regexp?.toString().includes("blogs")
// ));

module.exports = router;
