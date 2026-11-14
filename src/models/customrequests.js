const mongoose = require("mongoose");

const customRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    idea: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      default: null,
      min: 0,
    },
    imageIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "customrequests",
  }
);

module.exports = mongoose.model(
  "CustomRequest",
  customRequestSchema
);