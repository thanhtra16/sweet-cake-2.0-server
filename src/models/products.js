const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true,
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  active: {
    type: Boolean,
    default: true,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: ["cake", "accessory"],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    occasions: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
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
    status: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    imageIds: [{
      type: mongoose.Schema.Types.ObjectId,
    }],
    availableSizes: {
      type: [String],
      default: [],
    },
    availableFillings: {
      type: [String],
      default: [],
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "products",
  }
);

productSchema.index({
  status: 1,
  kind: 1,
  category: 1,
});

module.exports = mongoose.model("Product", productSchema);