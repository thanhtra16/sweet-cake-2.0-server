
const express = require("express");
const router = express.Router();

const { getProducts } = require("../controllers/products.controller");

// GET /api/products
router.get("/", getProducts);

module.exports = router;
