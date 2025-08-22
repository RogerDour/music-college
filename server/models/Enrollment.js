const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  courseId:  { type: mongoose.Schema.Types.ObjectId, ref: "Course", index: true, required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User",   index: true, required: true },
  status:    { type: String, enum: ["pending", "approved", "rejected", "waitlisted"], default: "pending" },
  approvedAt:{ type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who enrolled them (optional)
}, { timestamps: true });

enrollmentSchema.index({ courseId: 1, userId: 1 }, { unique: true });

// NEW (helps analytics approvals timeline):
enrollmentSchema.index({ status: 1, approvedAt: 1 });
enrollmentSchema.index({ status: 1, updatedAt: 1 });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
