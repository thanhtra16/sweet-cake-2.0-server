
const Product = require("../models/products");
const { successResponse } = require("../utils/response");

const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
        status: "visible",
        kind: "cake",
    })
        .populate("imageIds")
        .sort({ createdAt: -1 });

    return successResponse(
    res,
    products,
    "Lấy danh sách sản phẩm thành công!"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
};
