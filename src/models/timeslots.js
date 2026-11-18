const mongoose = require("mongoose");

const timeSlotSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },
    used: {
      type: Number,
      default: 0,
      min: 0,
    },
    closed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: false,
    collection: "timeslots",
  }
);

timeSlotSchema.index(
  { date: 1, label: 1 },
  { unique: true }
);

module.exports = mongoose.model("TimeSlot", timeSlotSchema);