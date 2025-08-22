const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  name: { type: String, required: true },
  filters: { type: Object, default: {} }
}, { timestamps: true });

schema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ReportPreset", schema);
