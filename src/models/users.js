const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  recipientName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  street: {
    type: String,
    required: true,
    trim: true,
  },
  ward: {
    type: String,
    required: true,
    trim: true,
  },
  district: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    default: "TP.HCM",
    enum: ["TP.HCM"],
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    birthday: {
      type: Date,
      default: null,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ["buyer", "admin"],
      default: "buyer",
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    origin: {
      type: String,
      enum: ["register", "guest_checkout"],
      default: "register",
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "users",
  }
);

userSchema.index({ phone: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);