const express = require("express");
const router = express.Router();

const {
  getProducts,
  getProductFilters,
  getProductById,
  getProductCustomization,
} = require("../controllers/products.controller");

// GET /api/products/filters
router.get("/filters", getProductFilters);

// GET /api/products/customization
router.get("/customization", getProductCustomization);

// GET /api/products
router.get("/", getProducts);

// GET /api/products/:id
router.get("/:id", getProductById);

module.exports = router;