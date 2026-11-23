const mongoose = require("mongoose");
const Product = require("../models/products");

const PRODUCT_FIELDS = [
  "name",
  "kind",
  "category",
  "occasions",
  "description",
  "basePrice",
  "salePrice",
  "status",
  "featured",
  "availableSizes",
  "availableFillings",
  "variants",
];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pickProductFields = (body) => {
  const data = {};

  for (const field of PRODUCT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  return data;
};

const validateProductData = (data, isCreate = false) => {
  if (
    isCreate &&
    (!data.name || !data.kind || !data.category ||
      data.basePrice === undefined)
  ) {
    return "Vui lòng nhập tên, loại, danh mục và giá cơ bản";
  }

  if (data.name !== undefined &&
      (typeof data.name !== "string" || !data.name.trim())) {
    return "Tên sản phẩm không hợp lệ";
  }

  if (data.kind !== undefined &&
      !["cake", "accessory"].includes(data.kind)) {
    return "Loại sản phẩm không hợp lệ";
  }

  if (data.category !== undefined &&
      (typeof data.category !== "string" || !data.category.trim())) {
    return "Danh mục sản phẩm không hợp lệ";
  }

  if (data.basePrice !== undefined &&
      (!Number.isFinite(data.basePrice) || data.basePrice < 0)) {
    return "Giá cơ bản phải là số không âm";
  }

  if (data.salePrice !== undefined &&
      data.salePrice !== null &&
      (!Number.isFinite(data.salePrice) || data.salePrice < 0)) {
    return "Giá khuyến mãi phải là số không âm hoặc null";
  }

  if (data.status !== undefined &&
      !["visible", "hidden"].includes(data.status)) {
    return "Trạng thái sản phẩm không hợp lệ";
  }

  for (const field of [
    "occasions",
    "availableSizes",
    "availableFillings",
    "variants",
  ]) {
    if (data[field] !== undefined && !Array.isArray(data[field])) {
      return `${field} phải là một mảng`;
    }
  }

  if (data.description !== undefined &&
      typeof data.description !== "string") {
    return "Mô tả sản phẩm không hợp lệ";
  }

  if (data.featured !== undefined &&
      typeof data.featured !== "boolean") {
    return "featured phải là kiểu boolean";
  }

  return null;
};

// GET /api/admin/products
const getAdminProducts = async (req, res, next) => {
  try {
    const {
      q,
      kind,
      category,
      status,
      page = 1,
      limit = 12,
      sort = "newest",
    } = req.query;

    const filter = {};

    if (q && q.trim()) {
      const keyword = escapeRegex(q.trim());
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    if (kind) {
      if (!["cake", "accessory"].includes(kind)) {
        return res.status(400).json({
          success: false,
          message: "Kind không hợp lệ",
        });
      }
      filter.kind = kind;
    }

    if (category) filter.category = category;

    if (status) {
      if (!["visible", "hidden"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái không hợp lệ",
        });
      }
      filter.status = status;
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      price_asc: { basePrice: 1 },
      price_desc: { basePrice: -1 },
    };

    if (!sortOptions[sort]) {
      return res.status(400).json({
        success: false,
        message: "Kiểu sắp xếp không hợp lệ",
      });
    }

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 12, 1), 100);
    const skip = (currentPage - 1) * pageSize;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOptions[sort])
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/products/:id
const getAdminProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Product ID không hợp lệ",
      });
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/products
const createProduct = async (req, res, next) => {
  try {
    const data = pickProductFields(req.body);
    const validationError = validateProductData(data, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const product = await Product.create(data);

    return res.status(201).json({
      success: true,
      message: "Thêm sản phẩm thành công",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Product ID không hợp lệ",
      });
    }

    const data = pickProductFields(req.body);
    const validationError = validateProductData(data);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu cần cập nhật",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/products/:id/status
const updateProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Product ID không hợp lệ",
      });
    }

    if (!["visible", "hidden"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái chỉ được là visible hoặc hidden",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      success: true,
      message: status === "visible"
        ? "Hiển thị sản phẩm thành công"
        : "Ẩn sản phẩm thành công",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
};
