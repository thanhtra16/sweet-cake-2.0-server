const { Notification } = require("../models");

const notify = async ({
  userId,
  type,
  title,
  message,
  orderId = null,
}) => {
  if (!userId) {
    throw new Error("Thiếu userId khi tạo thông báo");
  }

  if (!type || !title || !message) {
    throw new Error("Thiếu thông tin bắt buộc của thông báo");
  }

  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    orderId,
  });

  return notification;
};

module.exports = {
  notify,
};