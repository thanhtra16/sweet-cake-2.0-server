
const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: ['Công thức', 'Sự kiện', 'Mùa lễ']
    },
    readingTime: {
      type: String,
      default: '5 phút đọc'
    },
    author: {
      type: String,
      default: ''
    },
    authorPosition: {
      type: String,
      default: ''
    },
    excerpt: {
      type: String,
      required: true
    },
    publishedAt: {
      type: Date,
      required: true
    },
    thumbnail: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    }
  },
  {
    timestamps: true,
    collection: 'blogs'
  }
);

module.exports = mongoose.model('Blog', blogSchema);
