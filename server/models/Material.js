// server/models/Material.js
const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    courseId:   { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    title:      { type: String, required: true, trim: true },
    notes:      { type: String, trim: true, default: "" },

    // ✅ NEW
    folder:     { type: String, trim: true, default: "" }, // e.g. "Unit 1", "Homework", etc.

    // file info
    filename:   String,
    originalName: String,
    mimetype:   String,
    size:       Number,
    url:        String, // served from /uploads/materials/<filename>
  },
  { timestamps: true }
);

// helpful indexes for filtering/grouping
materialSchema.index({ courseId: 1, folder: 1, createdAt: -1 });

module.exports =
  mongoose.models.Material || mongoose.model("Material", materialSchema);
