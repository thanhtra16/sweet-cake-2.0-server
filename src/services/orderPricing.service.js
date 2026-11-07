// ví dụ phần kiểm tra sản phẩm và tính giá cơ bản; các quy tắc chi tiết về size, nhân, màu kem, độ ngọt cần đối chiếu cấu hình và quy tắc BR của dự án.
const Product = require("../models/Product");
const Customization = require("../models/Customization");

const calculateOrderItems = async (requestedItems) => {
  const customization = await Customization.findOne();

  if (!customization) {
    throw new Error("Chưa có cấu hình trang trí bánh");
  }

  const calculatedItems = [];

  for (const requestedItem of requestedItems) {
    const product = await Product.findById(
      requestedItem.productId
    );

    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    if (product.status !== "visible") {
      throw new Error(`Sản phẩm ${product.name} hiện không khả dụng`);
    }

    const qty = Number(requestedItem.qty);

    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      throw new Error("Số lượng sản phẩm phải từ 1 đến 10");
    }

    // Giá được lấy từ Product trong database
    const basePrice = product.basePrice;
    const salePrice = product.salePrice;

    const unitBasePrice =
      salePrice !== null && salePrice < basePrice
        ? salePrice
        : basePrice;

    // Không sử dụng giá Frontend gửi lên
    const surcharges = [];

    // TODO:
    // Kiểm tra config.size, filling, base,
    // frostingColor, sweetness từ customization.
    // Chỉ lấy priceDiff từ các tùy chọn active trong database.
    // Kiểm tra variant từ product.variants nếu là accessory.

    const totalSurcharge = surcharges.reduce(
      (sum, value) => sum + value,
      0
    );

    const unitPrice = unitBasePrice + totalSurcharge;
    const lineTotal = unitPrice * qty;

    calculatedItems.push({
      productId: product._id,
      kind: product.kind,
      name: product.name,
      imageId: product.imageIds?.[0] || null,
      basePrice,
      salePrice,
      config: requestedItem.config || {},
      variant: requestedItem.variant || null,
      surcharges,
      unitPrice,
      qty,
      lineTotal,
    });
  }

  const subtotal = calculatedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  return {
    items: calculatedItems,
    subtotal,
  };
};

module.exports = {
  calculateOrderItems,
};