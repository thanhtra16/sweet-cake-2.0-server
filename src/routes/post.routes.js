const express = require("express");
const router = express.Router();

const {
  getPosts,
  getPostById,
} = require("../controllers/post.controller");

// Danh sách bài viết
router.get("/", getPosts);

// Chi tiết bài viết
router.get("/:id", getPostById);

module.exports = router;