
const express = require("express");
const router = express.Router();
// fix
// console.log("BLOG ROUTER ĐÃ ĐƯỢC LOAD");
// 
const Blog = require("../models/blog");

// Lấy danh sách bài viết Blog
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find({
      status: "published"
    }).sort({ publishedAt: -1 });

    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách Blog",
      error: error.message
    });
  }
});

// Lấy chi tiết Blog theo slug
router.get("/:slug", async (req, res) => {
  try {
    console.log("Slug nhận được:", req.params.slug);
    console.log("Collection:", Blog.collection.name);

    const blog = await Blog.findOne({
      slug: req.params.slug,
      status: "published"
    });

    console.log("Kết quả tìm thấy:", blog);

    if (!blog) {
      return res.status(404).json({
        message: "Không tìm thấy bài viết",
        slug: req.params.slug
      });
    }

    res.status(200).json(blog);
  } catch (error) {
    console.error("Lỗi lấy chi tiết blog:", error);

    res.status(500).json({
      message: "Lỗi khi lấy chi tiết Blog",
      error: error.message
    });
  }
});

module.exports = router;
