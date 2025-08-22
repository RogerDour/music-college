const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  lessonId:  { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true, index: true },
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String, trim: true }
}, { timestamps: true });

feedbackSchema.index({ lessonId: 1, studentId: 1 }, { unique: true });

// 👇 IMPORTANT: reuse existing model if it’s already compiled
module.exports = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
