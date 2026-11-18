// API health dùng để kiểm tra xem Backend có đang hoạt động không.
const { successResponse } = require("../utils/response");

const checkHealth = (req, res) => {
  return successResponse(
    res,
    "Sweet Cake API is running!",
    {
      status: "OK",
      timestamp: new Date(),
    }
  );
};

module.exports = {
  checkHealth,
};