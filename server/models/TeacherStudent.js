const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  note: { type: String, default: "" }
}, { timestamps: true });

schema.index({ teacherId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("TeacherStudent", schema);
