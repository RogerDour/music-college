const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  taskId:    { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  filename:  { type: String },
  originalName: String,
  mimetype:  String,
  size:      Number,
  url:       String,
  status:    { type: String, enum: ["submitted","approved","needs_changes"], default: "submitted" }
}, { timestamps: true });

module.exports = mongoose.model("TaskSubmission", submissionSchema);
