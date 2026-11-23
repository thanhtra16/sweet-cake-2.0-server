
const mongoose = require("mongoose");

const otpCodeSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: ["password_reset", "registration"],
      default: "password_reset",
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    resetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "otp_codes",
  }
);

// Tự động xóa OTP khi hết hạn
otpCodeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Tìm OTP theo số điện thoại và mục đích
otpCodeSchema.index({ phone: 1, purpose: 1 });

module.exports = mongoose.model("OTPCode", otpCodeSchema);
