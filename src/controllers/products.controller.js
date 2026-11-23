const Product = require("../models/products");
const Customization = require("../models/customizations");

// Lấy danh sách sản phẩm, tìm kiếm, lọc và phân trang
const getProducts = async (req, res, next) => {
  try {
    const {
      q,
      kind,
      category,
      occasion,
      filling,
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {
      status: "visible",
    };

    // Tìm kiếm theo tên và mô tả
    if (q && q.trim()) {
      const keyword = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    // Lọc loại sản phẩm
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
    if (occasion) filter.occasions = occasion;

    if (filling) {
      filter.availableFillings = filling;
      filter.kind = "cake";
    }

    // Kiểm tra khoảng giá
    const hasMinPrice = minPrice !== undefined;
    const hasMaxPrice = maxPrice !== undefined;

    const min = hasMinPrice ? Number(minPrice) : 0;
    const max = hasMaxPrice ? Number(maxPrice) : Infinity;

    if (
      (hasMinPrice && (!Number.isFinite(min) || min < 0)) ||
      (hasMaxPrice && (!Number.isFinite(max) || max < 0)) ||
      min > max
    ) {
      return res.status(400).json({
        success: false,
        message: "Khoảng giá không hợp lệ",
      });
    }

    // Lọc theo giá thực tế
    if (hasMinPrice || hasMaxPrice) {
      filter.$expr = {
        $and: [
          {
            $gte: [
              { $ifNull: ["$salePrice", "$basePrice"] },
              hasMinPrice ? min : 0,
            ],
          },
          {
            $lte: [
              { $ifNull: ["$salePrice", "$basePrice"] },
              hasMaxPrice ? max : Number.MAX_SAFE_INTEGER,
            ],
          },
        ],
      };
    }

    // Kiểm tra kiểu sắp xếp
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { effectivePrice: 1 },
      price_desc: { effectivePrice: -1 },
      rating_desc: { rating: -1 },
    };

    if (!sortOptions[sort]) {
      return res.status(400).json({
        success: false,
        message: "Kiểu sắp xếp không hợp lệ",
      });
    }

    // Phân trang
    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 12, 1), 100);
    const skip = (currentPage - 1) * pageSize;

    // Dùng aggregate để sắp xếp theo giá thực tế và populate imageIds
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          effectivePrice: {
            $ifNull: ["$salePrice", "$basePrice"],
          },
        },
      },
      { $sort: sortOptions[sort] },
      { $skip: skip },
      { $limit: pageSize },
      {
        $lookup: {
          from: "media",
          localField: "imageIds",
          foreignField: "_id",
          as: "imageIds",
        },
      },
      { $project: { effectivePrice: 0 } },
    ];

    const [products, total] = await Promise.all([
      Product.aggregate(pipeline),
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

// Lấy danh sách dữ liệu phục vụ bộ lọc sản phẩm
const getProductFilters = async (req, res, next) => {
  try {
    const [categories, occasions, fillings] = await Promise.all([
      Product.distinct("category", { status: "visible" }),
      Product.distinct("occasions", { status: "visible" }),
      Product.distinct("availableFillings", {
        status: "visible",
        kind: "cake",
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        kinds: [
          { value: "cake", label: "Bánh kem" },
          { value: "accessory", label: "Phụ kiện" },
        ],
        categories: categories.sort(),
        occasions: occasions.sort(),
        fillings: fillings.sort(),
        priceRange: {
          min: 0,
          max: await Product.aggregate([
            { $match: { status: "visible" } },
            {
              $project: {
                effectivePrice: {
                  $ifNull: ["$salePrice", "$basePrice"],
                },
              },
            },
            { $group: { _id: null, max: { $max: "$effectivePrice" } } },
          ]).then((result) => result[0]?.max || 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Kiểm tra định dạng ID
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Product ID không hợp lệ",
      });
    }

    // Chỉ lấy sản phẩm đang hiển thị
    const product = await Product.findOne({
      _id: id,
      status: "visible",
    })
      .populate("imageIds")
      .lean();

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

const getProductCustomization = async (req, res, next) => {
  try {
    // Lấy cấu hình tùy chỉnh hiện tại
    const customization = await Customization.findOne().lean();

    if (!customization) {
      return res.status(404).json({
        success: false,
        message: "Chưa có cấu hình tùy chỉnh sản phẩm",
      });
    }

    // Chỉ trả về các lựa chọn đang hoạt động
    const data = {
      sizes: customization.sizes.filter((item) => item.active),
      fillings: customization.fillings.filter((item) => item.active),
      bases: customization.bases.filter((item) => item.active),
      frostingColors: customization.frostingColors.filter(
        (item) => item.active
      ),
      sweetnessLevels: customization.sweetnessLevels.filter(
        (item) => item.active
      ),
      required: customization.required,
      bannedWords: customization.bannedWords,
    };

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductFilters,
  getProductById,
  getProductCustomization,
};