const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: String,
  instrument: String,

  // who teaches this course
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

  // optional: limit approved seats (null/undefined = unlimited)
  capacity: { type: Number, min: 0, default: null },

  // NEW
  description: { type: String, trim: true, default: "" },
  coverUrl:   { type: String, trim: true, default: "" },

  // legacy field - harmless to keep
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
