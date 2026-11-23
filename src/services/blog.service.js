
const Blog = require('../models/blog');

const seedBlogs = async (blogs) => {
  const ids = blogs.map((blog) => blog.id);

  // Chỉ xóa các bài viết có id trùng với dữ liệu seed
  await Blog.deleteMany({
    id: { $in: ids }
  });

  return await Blog.insertMany(blogs);
};

module.exports = {
  seedBlogs
};
