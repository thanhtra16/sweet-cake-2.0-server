
const { ObjectId } = require("mongodb");
const { getGridFSBucket } = require("../config/gridfs");
const { Product, Order, Review } = require("../models");

// Upload ảnh và liên kết với đối tượng tương ứng
const uploadImages = async (req, res, next) => {
  const uploadedIds = [];

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ít nhất một ảnh",
      });
    }

    const { purpose, productId, reviewId, orderId } = req.body;
    const user = req.user;

    if (!["product", "review", "cake"].includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: "Purpose phải là product, review hoặc cake",
      });
    }

    // Xác định ID và Model cần liên kết
    let targetId;
    let target;

    if (purpose === "product") {
      if (user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Chỉ Admin được upload ảnh sản phẩm",
        });
      }

      targetId = productId;

      if (!ObjectId.isValid(targetId || "")) {
        return res.status(400).json({
          success: false,
          message: "productId không hợp lệ",
        });
      }

      target = await Product.findById(targetId);
    }

    if (purpose === "review") {
      targetId = reviewId;

      if (!ObjectId.isValid(targetId || "")) {
        return res.status(400).json({
          success: false,
          message: "reviewId không hợp lệ",
        });
      }

      target = await Review.findById(targetId);

      if (target && target.userId.toString() !== user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền upload ảnh cho đánh giá này",
        });
      }
    }

    if (purpose === "cake") {
      if (user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Chỉ Admin được upload ảnh bánh hoàn thành",
        });
      }

      targetId = orderId;

      if (!ObjectId.isValid(targetId || "")) {
        return res.status(400).json({
          success: false,
          message: "orderId không hợp lệ",
        });
      }

      target = await Order.findById(targetId);
    }

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đối tượng cần liên kết ảnh",
      });
    }

    const bucket = getGridFSBucket();

    // Upload ảnh lên GridFS
    const uploadedImages = await Promise.all(
      req.files.map((file) => {
        return new Promise((resolve, reject) => {
          const imageId = new ObjectId();

          const uploadStream = bucket.openUploadStreamWithId(
            imageId,
            file.originalname,
            {
              contentType: file.mimetype,
              metadata: {
                purpose,
                targetId: new ObjectId(targetId),
                uploadedAt: new Date(),
              },
            }
          );

          uploadStream.on("error", reject);

          uploadStream.on("finish", () => {
            uploadedIds.push(imageId);

            resolve({
              id: imageId,
              filename: file.originalname,
              contentType: file.mimetype,
              size: file.size,
              purpose,
            });
          });

          uploadStream.end(file.buffer);
        });
      })
    );

    // Liên kết ID ảnh vào Model tương ứng
    const imageIds = uploadedImages.map((image) => image.id);

    if (purpose === "product") {
      await Product.findByIdAndUpdate(targetId, {
        $addToSet: {
          imageIds: { $each: imageIds },
        },
      });
    }

    if (purpose === "review") {
      await Review.findByIdAndUpdate(targetId, {
        $addToSet: {
          imageIds: { $each: imageIds },
        },
      });
    }

    if (purpose === "cake") {
      await Order.findByIdAndUpdate(targetId, {
        $addToSet: {
          photoIds: { $each: imageIds },
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Upload và liên kết ảnh thành công",
      data: uploadedImages,
    });
  } catch (error) {
    // Xóa các file đã upload nếu quá trình xử lý thất bại
    try {
      const bucket = getGridFSBucket();

      await Promise.all(
        uploadedIds.map((id) =>
          bucket.delete(id).catch(() => {})
        )
      );
    } catch (cleanupError) {
      // Không ghi đè lỗi ban đầu
    }

    next(error);
  }
};

// Lấy ảnh theo ID
const getImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Image ID không hợp lệ",
      });
    }

    const bucket = getGridFSBucket();
    const imageId = new ObjectId(id);

    const files = await bucket.find({ _id: imageId }).toArray();

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh",
      });
    }

    const file = files[0];
    const purpose = file.metadata?.purpose;

    if (purpose === "product") {
      // Ảnh sản phẩm được xem công khai
    } else if (purpose === "review") {
      const review = await Review.findOne({
        imageIds: imageId,
        status: "visible",
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy ảnh",
        });
      }
    } else if (purpose === "cake") {
      const order = await Order.findOne({
        photoIds: imageId,
        status: "done",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy ảnh",
        });
      }

      const isAdmin = req.user?.role === "admin";
      const isOwner =
        req.user &&
        order.userId &&
        order.userId.toString() === req.user._id.toString();

      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem ảnh này",
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh",
      });
    }

    res.set("Content-Type", file.contentType || "application/octet-stream");
    res.set("Cache-Control", "private, max-age=3600");

    const downloadStream = bucket.openDownloadStream(imageId);

    downloadStream.on("error", (error) => {
      if (!res.headersSent) {
        next(error);
      } else {
        res.destroy(error);
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImages,
  getImage,
};
