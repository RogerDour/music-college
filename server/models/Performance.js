// server/models/Performance.js
const mongoose = require("mongoose");

const performanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    courseId:  { type: mongoose.Schema.Types.ObjectId, ref: "Course", index: true, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User",   index: true }, // denormalized for faster queries
    date:      { type: Date, required: true },

    type:      { type: String, trim: true, default: "exam" }, // exam/quiz/project/etc.
    score:     { type: Number, required: true },
    maxScore:  { type: Number, required: true },
    notes:     { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// Useful indexes
performanceSchema.index({ date: 1 });
performanceSchema.index({ teacherId: 1, date: 1 });
performanceSchema.index({ studentId: 1, date: 1 });
performanceSchema.index({ courseId: 1, date: 1 });

module.exports = mongoose.model("Performance", performanceSchema);
