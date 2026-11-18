const express = require("express");
const router = express.Router();

const { getFAQs } = require("../controllers/faq.controller");

// Danh sách câu hỏi thường gặp
router.get("/", getFAQs);

module.exports = router;