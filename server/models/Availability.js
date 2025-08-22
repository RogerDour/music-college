// server/models/Availability.js
const mongoose = require("mongoose");

/**
 * Availability document per user:
 *  - weeklyRules: recurring weekly windows (local time) by day 0..6 (0=Sun)
 *  - exceptions: per-date override slots with absolute Date start/end
 */
const WeeklyRuleSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // JS getDay()
    start: { type: String, required: true }, // "HH:mm"
    end: { type: String, required: true },   // "HH:mm"
  },
  { _id: false }
);

const ExceptionSlotSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  { _id: false }
);

const ExceptionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true }, // the day this override applies to
    slots: { type: [ExceptionSlotSchema], default: [] },
  },
  { _id: false }
);

const AvailabilitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, unique: true, required: true },
    weeklyRules: { type: [WeeklyRuleSchema], default: [] },
    exceptions: { type: [ExceptionSchema], default: [] },
    timezone: { type: String }, // optional, future use
  },
  { timestamps: true }
);

module.exports = mongoose.model("Availability", AvailabilitySchema);
