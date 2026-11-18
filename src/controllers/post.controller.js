const mongoose = require("mongoose");
const Post = require("../models/posts");
const { successResponse, errorResponse } = require("../utils/response");

// GET /api/posts
// Lấy danh sách bài viết đã xuất bản
const getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ status: "published" })
      .select("title slug excerpt imageId tags publishedAt createdAt")
      .sort({ publishedAt: -1, createdAt: -1 });

    return successResponse(
      res,
      { posts },
      "Lấy danh sách bài viết thành công"
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/posts/:id
// Lấy chi tiết bài viết và các bài viết liên quan
const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "ID bài viết không hợp lệ", 400);
    }

// DEBUG: Kiểm tra MongoDB có tìm thấy bài viết theo ID không
const postById = await Post.findById(id).lean();

console.log("===== DEBUG GET POST BY ID =====");
console.log("ID nhận được:", id);
console.log("Database:", Post.db.name);
console.log("Collection:", Post.collection.name);
console.log("Có tìm thấy theo ID không:", !!postById);
console.log("Status trong database:", postById?.status);

// Truy vấn bài viết đã xuất bản
const post = await Post.findOne({
  _id: id,
  status: "published",
});

    if (!post) {
      return errorResponse(res, "Không tìm thấy bài viết", 404);
    }

    let relatedPosts = [];

    // Nếu bài viết có tags, tìm các bài viết khác có ít nhất một tag trùng
    if (post.tags && post.tags.length > 0) {
      relatedPosts = await Post.find({
        _id: { $ne: post._id },
        status: "published",
        tags: { $in: post.tags },
      })
        .select("title slug excerpt imageId tags publishedAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(3);
    }

    return successResponse(
      res,
      { post, relatedPosts },
      "Lấy chi tiết bài viết thành công"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPosts,
  getPostById,
};