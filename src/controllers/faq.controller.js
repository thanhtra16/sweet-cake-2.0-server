const FAQ = require("../models/faqs");
const { successResponse } = require("../utils/response");

// GET /api/faqs
// Lấy danh sách câu hỏi thường gặp đang hoạt động
const getFAQs = async (req, res, next) => {
  try {
    const faqs = await FAQ.find({ active: true })
      .select("question answer order")
      .sort({ order: 1, createdAt: 1 });

    return successResponse(
      res,
      { faqs },
      "Lấy danh sách câu hỏi thường gặp thành công"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFAQs,
};