// server/models/SchedulingLog.js
const mongoose = require("mongoose");

/**
 * Optional logging for FR-57 (algorithm traceability)
 * Created best-effort by utils/scheduling when available.
 */
const SuggestionSchema = new mongoose.Schema(
  {
    start: Date,
    end: Date,
    duration: Number,
  },
  { _id: false }
);

const SchedulingLogSchema = new mongoose.Schema(
  {
    algorithm: { type: String, enum: ["greedy", "backtracking"], required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    from:      { type: Date },   // window start
    until:     { type: Date },   // window end (for greedy)
    suggestions: { type: [SuggestionSchema], default: [] },
    meta:      { type: Object }, // optional extra (scores, params)
  },
  { timestamps: true }
);

SchedulingLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SchedulingLog", SchedulingLogSchema);
