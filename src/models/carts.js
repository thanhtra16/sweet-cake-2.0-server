const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  kind: {
    type: String,
    enum: ["cake", "accessory"],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  salePrice: {
    type: Number,
    default: null,
    min: 0,
  },
  config: {
    size: String,
    filling: String,
    base: String,
    frostingColor: String,
    sweetness: String,
    message: String,
  },
  variant: {
    type: String,
    default: null,
  },
  surcharges: {
    type: Number,
    default: 0,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  qty: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
  },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "carts",
  }
);

cartSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model("Cart", cartSchema);