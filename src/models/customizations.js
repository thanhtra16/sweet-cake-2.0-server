const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  priceDiff: {
    type: Number,
    default: 0,
    min: 0,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
  maxChars: {
    type: Number,
    default: null,
  },
});

const customizationSchema = new mongoose.Schema(
  {
    sizes: {
      type: [optionSchema],
      default: [],
    },
    fillings: {
      type: [optionSchema],
      default: [],
    },
    bases: {
      type: [optionSchema],
      default: [],
    },
    frostingColors: {
      type: [optionSchema],
      default: [],
    },
    sweetnessLevels: {
      type: [optionSchema],
      default: [],
    },
    required: {
      base: { type: Boolean, default: false },
      frostingColor: { type: Boolean, default: false },
      sweetness: { type: Boolean, default: false },
    },
    bannedWords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "customizations",
  }
);

module.exports = mongoose.model(
  "Customization",
  customizationSchema
);