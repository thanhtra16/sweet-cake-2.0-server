const Voucher = require("../../models/vouchers");

const defaultVouchers = [
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    maxDiscount: 50000,
    minOrder: 200000,
    usageLimit: 100,
    usedCount: 0,
    expiresAt: new Date("2027-12-31T23:59:59"),
    active: true,
    description: "Giảm 10% cho đơn hàng đầu tiên, tối đa 50.000đ.",
  },
  {
    code: "SWEET20",
    type: "percent",
    value: 20,
    maxDiscount: 100000,
    minOrder: 300000,
    usageLimit: 50,
    usedCount: 0,
    expiresAt: new Date("2027-12-31T23:59:59"),
    active: true,
    description: "Giảm 20% cho đơn hàng từ 300.000đ, tối đa 100.000đ.",
  },
  {
    code: "FREESHIP",
    type: "amount",
    value: 30000,
    maxDiscount: null,
    minOrder: 200000,
    usageLimit: 100,
    usedCount: 0,
    expiresAt: new Date("2027-12-31T23:59:59"),
    active: true,
    description: "Giảm 30.000đ phí giao hàng cho đơn hàng từ 200.000đ.",
  },
  {
    code: "HAPPY500",
    type: "amount",
    value: 50000,
    maxDiscount: null,
    minOrder: 500000,
    usageLimit: 30,
    usedCount: 0,
    expiresAt: new Date("2027-12-31T23:59:59"),
    active: true,
    description: "Giảm trực tiếp 50.000đ cho đơn hàng từ 500.000đ.",
  },
];

// async function seedVouchers() {
//   const operations = defaultVouchers.map((voucher) => ({
//     updateOne: {
//       filter: { code: voucher.code },
//       update: {
//         $setOnInsert: voucher,
//       },
//       upsert: true,
//     },
//   }));

//   await Voucher.bulkWrite(operations);

//   console.log(
//     `Seed Vouchers thành công: đã kiểm tra ${defaultVouchers.length} mã giảm giá.`
//   );
// }

async function seedVouchers() {
  const operations = defaultVouchers.map((voucher) => {
    const { usedCount, ...configData } = voucher; 

    return {
      updateOne: {
        filter: { code: voucher.code },
        update: {
          $set: configData, // Cập nhật: mức giảm, điều kiện, hạn sử dụng...
          $setOnInsert: {
            usedCount: usedCount, // Giữ nguyên số lượt đã dùng nếu mã đã tồn tại
          },
        },
        upsert: true,
      },
    };
  });

  try {
    const result = await Voucher.bulkWrite(operations);
    console.log(
      `Seed Vouchers hoàn tất: Tạo mới ${result.upsertedCount || 0} | Cập nhật ${result.modifiedCount || 0} (Tổng seed: ${defaultVouchers.length}).`
    );
  } catch (error) {
    console.error(`Lỗi khi đồng bộ Vouchers:`, error);
    throw error;
  }
}

module.exports = seedVouchers;