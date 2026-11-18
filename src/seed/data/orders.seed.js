const Order = require("../../models/order");
const User = require("../../models/users");
const Product = require("../../models/products");
const TimeSlot = require("../../models/timeslots");
const Voucher = require("../../models/vouchers");

async function seedOrders() {
  // Lấy dữ liệu tham chiếu
  const users = await User.find({ role: "buyer" }).limit(2);
  const products = await Product.find({
    kind: "cake",
    status: "visible",
  }).limit(3);

  const accessory = await Product.findOne({
    kind: "accessory",
    status: "visible",
  });

  if (users.length < 2) {
    throw new Error("Cần ít nhất 2 tài khoản khách hàng để seed Orders.");
  }

  if (products.length < 2) {
    throw new Error("Cần ít nhất 2 sản phẩm bánh kem để seed Orders.");
  }

  if (!accessory) {
    throw new Error("Chưa có sản phẩm phụ kiện để seed Orders.");
  }

  // Lấy các TimeSlot chưa đóng và còn sức chứa
  const slots = await TimeSlot.find({
    closed: false,
    $expr: { $lt: ["$used", "$capacity"] },
    date: { $gt: new Date() },
  }).sort({ date: 1, label: 1 }).limit(3);

  if (slots.length < 3) {
    throw new Error("Cần ít nhất 3 TimeSlot còn khả dụng để seed Orders.");
  }

  const voucher = await Voucher.findOne({
    active: true,
    code: "WELCOME10",
  });

  const now = new Date();

  const createOrderData = (user, product, slot, options = {}) => {
    const qty = options.qty || 1;
    const unitPrice = product.salePrice ?? product.basePrice;
    const lineTotal = unitPrice * qty;

    const accessoryItem = options.accessory
      ? {
          productId: accessory._id,
          kind: "accessory",
          name: accessory.name,
          imageId: null,
          basePrice: accessory.basePrice,
          salePrice: accessory.salePrice,
          variant: accessory.variants?.[0]?.label || null,
          surcharges: [],
          unitPrice: accessory.salePrice ?? accessory.basePrice,
          qty: 1,
          lineTotal: accessory.salePrice ?? accessory.basePrice,
        }
      : null;

    const items = [
      {
        productId: product._id,
        kind: "cake",
        name: product.name,
        imageId: null,
        basePrice: product.basePrice,
        salePrice: product.salePrice,
        config: {
          size: product.availableSizes?.[0] || "",
          filling: product.availableFillings?.[0] || "",
          base: "Bông lan",
          frostingColor: "Trắng",
          sweetness: "50%",
          message: "",
        },
        variant: null,
        surcharges: [],
        unitPrice,
        qty,
        lineTotal,
      },
    ];

    if (accessoryItem) {
      items.push(accessoryItem);
    }

    const subtotal = items.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );

    const discount = options.useVoucher && voucher
      ? Math.min(
          subtotal * voucher.value / 100,
          voucher.maxDiscount ?? Infinity
        )
      : 0;

    const deliveryFee = options.receiveMethod === "delivery"
      ? 30000
      : 0;

    const total = Math.max(
      0,
      subtotal - discount + deliveryFee
    );

    const deadlineAt = new Date(now.getTime() + 10 * 60 * 1000);

    return {
      code: options.code,
      userId: user._id,

      receiver: {
        fullName: user.fullName,
        phone: user.phone,
      },

      receiveMethod: options.receiveMethod || "pickup",

      shippingAddress:
        options.receiveMethod === "delivery"
          ? {
              recipientName: user.fullName,
              recipientPhone: user.phone,
              province: "TP.HCM",
              district: "Quận 1",
              detail: "123 Đường Nguyễn Huệ",
            }
          : {},

      pickupBranch: null,

      receiveDate: slot.date,
      slotId: slot._id,
      slotLabel: slot.label,

      note: "",

      items,
      subtotal,
      discount,
      deliveryFee,
      total,

      voucher:
        options.useVoucher && voucher
          ? {
              code: voucher.code,
              type: voucher.type,
              value: voucher.value,
              discount,
              restored: false,
            }
          : null,

      status: options.status || "pending_payment",

      statusHistory: [
        {
          from: null,
          to: options.status || "pending_payment",
          actor: "system",
          time: now,
          reason: "Khởi tạo dữ liệu đơn hàng mẫu",
        },
      ],

      payment: {
        status: options.paymentStatus || "pending",
        attempts: [
          {
            qrCode: null,
            createdAt: now,
            deadlineAt,
            result: options.paymentStatus === "paid"
              ? "success"
              : "pending",
          },
        ],
        slotHeld: true,
        deadlineAt,
        txnId: null,
        paidAt: options.paymentStatus === "paid" ? now : null,
        confirmedBy: null,
        latePayment: false,
      },
    };
  };

  const defaultOrders = [
    createOrderData(users[0], products[0], slots[0], {
      code: "SC-SEED-001",
      status: "pending_payment",
      paymentStatus: "pending",
      receiveMethod: "pickup",
      qty: 1,
    }),

    createOrderData(users[1], products[1], slots[1], {
      code: "SC-SEED-002",
      status: "pending_approval",
      paymentStatus: "paid",
      receiveMethod: "delivery",
      qty: 1,
      useVoucher: true,
    }),

    createOrderData(users[0], products[0], slots[2], {
      code: "SC-SEED-003",
      status: "accepted",
      paymentStatus: "paid",
      receiveMethod: "pickup",
      qty: 2,
      accessory: true,
    }),
  ];

  const operations = defaultOrders.map((order) => ({
    updateOne: {
      filter: { code: order.code },
      update: {
        $set: order,
      },
      upsert: true,
    },
  }));

  try {
    await Order.bulkWrite(operations);

    console.log(
      `Seed Orders thành công: đã kiểm tra ${defaultOrders.length} đơn hàng mẫu.`
    );
  } catch (error) {
    console.error(`Lỗi khi đồng bộ Orders:`, error);
    throw error;
  }
}

module.exports = seedOrders;