const mongoose = require("mongoose");
const { Review, Order } = require("../models");
const {
  successResponse,
  errorResponse,
} = require("../utils/response");

const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Kiểm tra ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Lấy thời điểm đơn hàng chuyển sang Đã giao
const getDeliveredAt = (order) => {
  const history = [...(order.statusHistory || [])].reverse();

  const deliveredEntry = history.find(
    (entry) => entry.to === "delivered"
  );

  if (!deliveredEntry) return null;

  // Hỗ trợ cả dữ liệu cũ dùng at và dữ liệu chuẩn dùng time
  const deliveredAt = deliveredEntry.time || deliveredEntry.at;

  if (!deliveredAt) return null;

  const date = new Date(deliveredAt);

  return Number.isNaN(date.getTime()) ? null : date;
};

// Kiểm tra thời hạn sửa/xóa
const checkEditWindow = (order) => {
  const deliveredAt = getDeliveredAt(order);

  if (!deliveredAt) {
    return {
      allowed: false,
      message: "Không xác định được thời điểm đơn hàng đã giao.",
    };
  }

  const elapsed = Date.now() - deliveredAt.getTime();

  if (elapsed < 0 || elapsed > EDIT_WINDOW_MS) {
    return {
      allowed: false,
      message: "Đã quá thời hạn 7 ngày để sửa hoặc xóa đánh giá.",
    };
  }

  return { allowed: true };
};

// Kiểm tra rating
const isValidRating = (rating) =>
  Number.isInteger(rating) && rating >= 1 && rating <= 5;

// Chuẩn hóa imageIds
const validateImageIds = (imageIds) => {
  return (
    Array.isArray(imageIds) &&
    imageIds.every((id) => isValidId(id))
  );
};

// 1. Tạo đánh giá
const createReview = async (req, res) => {
  try {
    const { orderId, productId, rating, comment = "", imageIds = [] } =
      req.body;

    if (!isValidId(orderId) || !isValidId(productId)) {
      return errorResponse(res, "Order ID hoặc Product ID không hợp lệ", 400);
    }

    if (!isValidRating(rating)) {
      return errorResponse(res, "Số sao đánh giá phải là số nguyên từ 1 đến 5", 400);
    }

    if (typeof comment !== "string") {
      return errorResponse(res, "Nội dung đánh giá không hợp lệ", 400);
    }

    if (comment.length > 2000) {
      return errorResponse(res, "Nội dung đánh giá không được vượt quá 2000 ký tự", 400);
    }

    if (!validateImageIds(imageIds)) {
      return errorResponse(res, "Danh sách ảnh đánh giá không hợp lệ", 400);
    }

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id,
    }).lean();

    if (!order) {
      return errorResponse(res, "Không tìm thấy đơn hàng", 404);
    }

    if (order.status !== "delivered") {
      return errorResponse(
        res,
        "Chỉ được đánh giá khi đơn hàng đã giao",
        400
      );
    }

    const deliveredAt = getDeliveredAt(order);

    if (!deliveredAt) {
      return errorResponse(
        res,
        "Không xác định được thời điểm đơn hàng đã giao",
        409
      );
    }

    const orderItem = order.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!orderItem) {
      return errorResponse(
        res,
        "Sản phẩm không thuộc đơn hàng này",
        400
      );
    }

    const existingReview = await Review.findOne({
      orderId,
      productId,
    });

    if (existingReview) {
      return errorResponse(
        res,
        "Bạn đã đánh giá sản phẩm này trong đơn hàng",
        409
      );
    }

    const review = await Review.create({
      userId: req.user._id,
      orderId,
      productId,
      productName: orderItem.name,
      reviewerName: req.user.fullName,
      rating,
      comment: comment.trim(),
      imageIds,
    });

    return successResponse(
      res,
      { review },
      "Đánh giá sản phẩm thành công",
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(
        res,
        "Bạn đã đánh giá sản phẩm này trong đơn hàng",
        409
      );
    }

    return errorResponse(res, error.message, 500);
  }
};

// 2. Lấy đánh giá công khai theo sản phẩm
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.query;

    if (!productId || !isValidId(productId)) {
      return errorResponse(res, "Product ID không hợp lệ", 400);
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const filter = {
      productId,
      status: "visible",
    };

    const [reviews, total, ratingStats] = await Promise.all([
      Review.find(filter)
        .select("productId productName reviewerName rating comment imageIds createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Review.countDocuments(filter),

      Review.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(productId), status: "visible" } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = ratingStats[0] || {
      averageRating: 0,
      totalReviews: 0,
    };

    return successResponse(
      res,
      {
        reviews,
        summary: {
          averageRating: Number(stats.averageRating.toFixed(1)),
          totalReviews: stats.totalReviews,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Lấy danh sách đánh giá thành công"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 3. Sửa đánh giá
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, imageIds } = req.body;

    if (!isValidId(id)) {
      return errorResponse(res, "Review ID không hợp lệ", 400);
    }

    if (
      rating === undefined &&
      comment === undefined &&
      imageIds === undefined
    ) {
      return errorResponse(res, "Không có thông tin cần cập nhật", 400);
    }

    if (rating !== undefined && !isValidRating(rating)) {
      return errorResponse(res, "Số sao đánh giá phải là số nguyên từ 1 đến 5", 400);
    }

    if (comment !== undefined) {
      if (typeof comment !== "string" || comment.length > 2000) {
        return errorResponse(res, "Nội dung đánh giá không hợp lệ", 400);
      }
    }

    if (imageIds !== undefined && !validateImageIds(imageIds)) {
      return errorResponse(res, "Danh sách ảnh đánh giá không hợp lệ", 400);
    }

    const review = await Review.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!review) {
      return errorResponse(res, "Không tìm thấy đánh giá", 404);
    }

    const order = await Order.findById(review.orderId).lean();

    if (!order || order.status !== "delivered") {
      return errorResponse(res, "Đơn hàng không ở trạng thái đã giao", 400);
    }

    const windowCheck = checkEditWindow(order);

    if (!windowCheck.allowed) {
      return errorResponse(res, windowCheck.message, 403);
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment.trim();
    if (imageIds !== undefined) review.imageIds = imageIds;

    await review.save();

    return successResponse(
      res,
      { review },
      "Cập nhật đánh giá thành công"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 4. Xóa đánh giá
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return errorResponse(res, "Review ID không hợp lệ", 400);
    }

    const review = await Review.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!review) {
      return errorResponse(res, "Không tìm thấy đánh giá", 404);
    }

    const order = await Order.findById(review.orderId).lean();

    if (!order || order.status !== "delivered") {
      return errorResponse(res, "Đơn hàng không ở trạng thái đã giao", 400);
    }

    const windowCheck = checkEditWindow(order);

    if (!windowCheck.allowed) {
      return errorResponse(res, windowCheck.message, 403);
    }

    await Review.deleteOne({ _id: review._id });

    return successResponse(
      res,
      { reviewId: review._id },
      "Xóa đánh giá thành công"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 5. Admin lấy danh sách đánh giá
const getAdminReviews = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const filter = {};

    if (req.query.status) {
      if (!["visible", "hidden"].includes(req.query.status)) {
        return errorResponse(res, "Trạng thái đánh giá không hợp lệ", 400);
      }

      filter.status = req.query.status;
    }

    if (req.query.productId) {
      if (!isValidId(req.query.productId)) {
        return errorResponse(res, "Product ID không hợp lệ", 400);
      }

      filter.productId = req.query.productId;
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Review.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Lấy danh sách đánh giá thành công"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 6. Admin ẩn/hiện đánh giá
const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return errorResponse(res, "Review ID không hợp lệ", 400);
    }

    if (!["visible", "hidden"].includes(status)) {
      return errorResponse(res, "Trạng thái đánh giá không hợp lệ", 400);
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!review) {
      return errorResponse(res, "Không tìm thấy đánh giá", 404);
    }

    return successResponse(
      res,
      { review },
      status === "hidden"
        ? "Ẩn đánh giá thành công"
        : "Hiển thị đánh giá thành công"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  getAdminReviews,
  updateReviewStatus,
};
