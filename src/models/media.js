
const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    alt: {
      type: String,
      default: "",
      trim: true,
    },

    provider: {
      type: String,
      enum: ["unsplash", "local", "other"],
      default: "unsplash",
    },

    sourceUrl: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "media",
  }
);

// Một URL chỉ tạo một bản ghi Media
mediaSchema.index({ url: 1 }, { unique: true });

module.exports = mongoose.model("Media", mediaSchema);
