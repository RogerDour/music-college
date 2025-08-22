const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  type: { type: String, enum: ["low_attendance","performance","system"], required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  seen: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Alert", schema);
