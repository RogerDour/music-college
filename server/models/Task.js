const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  courseId:  { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title:     { type: String, required: true },
  description: { type: String, default: "" },
  dueAt:     { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);
