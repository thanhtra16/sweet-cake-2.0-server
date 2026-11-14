const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
});

const slotTemplateSchema = new mongoose.Schema({
  label: { type: String, required: true },
  capacity: { type: Number, required: true, min: 0 },
});

const settingSchema = new mongoose.Schema(
  {
    minLeadHours: {
      type: Number,
      default: 24,
    },
    maxAdvanceDays: {
      type: Number,
      default: 7,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryCity: {
      type: String,
      default: "TP.HCM",
    },
    branches: {
      type: [branchSchema],
      default: [],
    },
    slotTemplates: {
      type: [slotTemplateSchema],
      default: [],
    },
    workingHours: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    qrExpireMinutes: {
      type: Number,
      default: 10,
    },
    maxQrRetries: {
      type: Number,
      default: 3,
    },
    hotline: {
      type: String,
      default: "",
    },
    refundPolicy: {
      acceptedPercent: { type: Number, default: 30 },
      inProgressPercent: { type: Number, default: 0 },
      shopFaultPercent: { type: Number, default: 100 },
    },
    refundDueWorkingDays: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
    collection: "settings",
  }
);

module.exports = mongoose.model("Setting", settingSchema);