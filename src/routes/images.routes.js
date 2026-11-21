const { optionalAuth } = require("../middlewares/auth");
const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/auth");

const upload = require("../middlewares/upload");
const {
  uploadImages,
  getImage,
} = require("../controllers/images.controller");

// Upload tối đa 10 ảnh
router.post("/", auth, upload.array("images", 10), uploadImages);

// Lấy ảnh theo ID
router.get("/:id", optionalAuth, getImage);

module.exports = router;
