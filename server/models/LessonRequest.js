// server/models/LessonRequest.js
const mongoose = require("mongoose");

const lessonRequestSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:     { type: String, default: "Scheduled Lesson", trim: true },
    start:     { type: Date, required: true, index: true },
    duration:  { type: Number, default: 60, min: 15, max: 240 },
    status:    { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  },
  { timestamps: true }
);

lessonRequestSchema.index({ teacherId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("LessonRequest", lessonRequestSchema);
