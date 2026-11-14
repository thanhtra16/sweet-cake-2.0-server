
const Notification = require("../../models/notifications");
const User = require("../../models/users");
const Order = require("../../models/order");

async function seedNotifications() {
  // Lấy danh sách khách hàng
  const users = await User.find({ role: "buyer" })
    .select("_id fullName")
    .lean();

  if (users.length === 0) {
    console.log("Không có khách hàng. Bỏ qua Seed Notifications.");
    return;
  }

  // Lấy đơn hàng mẫu
  const orders = await Order.find({
    userId: { $ne: null },
  })
    .sort({ createdAt: -1 })
    .lean();

  const notifications = [];

  // Tạo thông báo liên quan đến đơn hàng
  for (const order of orders) {
    const user = users.find(
      (item) => item._id.toString() === order.userId.toString()
    );

    if (!user) continue;

    let title = "";
    let message = "";

    switch (order.status) {
      case "pending_payment":
        title = "Đơn hàng đang chờ thanh toán";
        message = `Đơn hàng ${order.code} đang chờ bạn hoàn tất thanh toán.`;
        break;

      case "pending_approval":
        title = "Đơn hàng đang chờ xác nhận";
        message = `Cửa hàng đã nhận được thanh toán cho đơn hàng ${order.code} và đang kiểm tra đơn hàng.`;
        break;

      case "accepted":
        title = "Đơn hàng đã được tiếp nhận";
        message = `Đơn hàng ${order.code} đã được cửa hàng xác nhận.`;
        break;

      case "baking":
        title = "Đơn hàng đang được làm bánh";
        message = `Đơn hàng ${order.code} đang trong quá trình chuẩn bị.`;
        break;

      case "delivering":
        title = "Đơn hàng đang được giao";
        message = `Đơn hàng ${order.code} đang trên đường giao đến bạn.`;
        break;

      case "delivered":
        title = "Đơn hàng đã giao thành công";
        message = `Đơn hàng ${order.code} đã được giao đến bạn.`;
        break;

      case "done":
        title = "Đơn hàng đã hoàn tất";
        message = `Đơn hàng ${order.code} đã hoàn tất. Cảm ơn bạn đã mua hàng tại SweetCake!`;
        break;

      case "cancelled":
        title = "Đơn hàng đã bị hủy";
        message = `Đơn hàng ${order.code} đã được cập nhật trạng thái hủy.`;
        break;

      default:
        continue;
    }

    notifications.push({
      userId: user._id,
      type: "order",
      orderId: order._id,
      title,
      message,
      read: false,
    });
  }

  // Tạo thông báo khuyến mãi cho khách hàng
  const promotionMessages = [
    {
      title: "Ưu đãi dành cho bạn",
      message:
        "Đừng bỏ lỡ các chương trình ưu đãi hấp dẫn khi đặt bánh tại SweetCake!",
    },
    {
      title: "Khám phá bộ sưu tập bánh",
      message:
        "SweetCake có nhiều mẫu bánh kem phù hợp cho sinh nhật và các dịp đặc biệt. Hãy khám phá ngay nhé!",
    },
  ];

  for (const user of users) {
    for (const promotion of promotionMessages) {
      notifications.push({
        userId: user._id,
        type: "promotion",
        orderId: null,
        title: promotion.title,
        message: promotion.message,
        read: false,
      });
    }
  }

  if (notifications.length === 0) {
    console.log("Không có dữ liệu Notifications để Seed.");
    return;
  }

  // Upsert để tránh tạo thông báo trùng khi chạy lại
  const operations = notifications.map((notification) => ({
    updateOne: {
      filter: {
        userId: notification.userId,
        type: notification.type,
        orderId: notification.orderId,
        title: notification.title,
      },
      update: {
        $set: notification,
      },
      upsert: true,
    },
  }));

  await Notification.bulkWrite(operations);

  console.log(
    `Seed Notifications thành công: ${notifications.length} thông báo được kiểm tra.`
  );
}

module.exports = seedNotifications;
