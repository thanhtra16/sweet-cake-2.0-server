// Khai báo các API liên quan đến đơn hàng
const express = require("express");
const router = express.Router();

const ordersController = require("../controllers/orders.controller");

// API tính giá tạm tính cho đơn hàng
router.post("/quote", ordersController.quoteOrder);

module.exports = router;