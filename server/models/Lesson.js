// server/models/Lesson.js
const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date, required: true },
  duration: { type: Number, default: 60, min: 15, max: 240 }, // minutes
  status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
  attended: { type: Boolean, default: false },
  recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringSeries' },
  reminderSent: { type: Boolean, default: false }
}, { timestamps: true });

// Performance indexes
lessonSchema.index({ teacherId: 1, date: 1 });
lessonSchema.index({ studentId: 1, date: 1 });
lessonSchema.index({ date: 1 });

module.exports = mongoose.model("Lesson", lessonSchema);
