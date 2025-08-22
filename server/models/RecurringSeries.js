const mongoose = require("mongoose");

const recurringSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: { type: String, required: true },
  startDate: { type: Date, required: true }, // first occurrence date-time
  duration: { type: Number, default: 60, min: 15, max: 240 },
  freq: { type: String, enum: ["weekly"], default: "weekly" },
  interval: { type: Number, default: 1, min: 1, max: 8 }, // every N weeks
  count: { type: Number, default: 10, min: 1, max: 100 }, // total occurrences
  byDay: { type: [Number], default: [] }, // 0..6
}, { timestamps: true });

module.exports = mongoose.model("RecurringSeries", recurringSchema);
