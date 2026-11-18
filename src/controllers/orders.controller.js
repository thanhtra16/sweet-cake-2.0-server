const {
  calculateOrderItems,
} = require("../services/orderPricing.service");

// Tính giá tạm tính cho từng dòng sản phẩm trong đơn hàng
const quoteOrder = async (req, res, next) => {
  try {
    const { items } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách sản phẩm không hợp lệ hoặc đang trống",
      });
    }

    const results = [];

    // Tính giá riêng từng dòng để một dòng lỗi
    // không làm ảnh hưởng kết quả của các dòng còn lại
    for (const requestedItem of items) {
      try {
        const result = await calculateOrderItems([requestedItem]);

        const calculatedItem = result.items[0];

        // Giá Frontend gửi lên chỉ dùng để đối chiếu,
        // không được dùng để tính giá chính thức
        const clientUnitPrice = requestedItem.unitPrice;

        const priceChanged =
            clientUnitPrice === undefined
                ? null
                : Number(clientUnitPrice) !== calculatedItem.unitPrice;

        results.push({
          productId: requestedItem.productId,
          valid: true,
          reason: null,
          unitPrice: calculatedItem.unitPrice,
          priceChanged,
          qty: calculatedItem.qty,
          lineTotal: calculatedItem.lineTotal,
        });
      } catch (error) {
        results.push({
          productId: requestedItem?.productId || null,
          valid: false,
          reason: error.message,
          unitPrice: null,
          priceChanged: null,
          qty: requestedItem?.qty || null,
          lineTotal: null,
        });
      }
    }

    // Chỉ cộng tiền các dòng hợp lệ
    const subtotal = results.reduce((total, item) => {
      return total + (item.valid ? item.lineTotal : 0);
    }, 0);

    return res.status(200).json({
      success: true,
      data: {
        items: results,
        subtotal,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  quoteOrder,
};
