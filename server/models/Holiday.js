// server/models/Holiday.js
const mongoose = require("mongoose");

const HolidaySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true }, // holiday date (local day)
    title: { type: String }, // optional label
  },
  { timestamps: true }
);

// Normalize to local midnight on save (keeps day-based semantics)
HolidaySchema.pre("save", function (next) {
  if (this.date instanceof Date) {
    const d = this.date;
    this.date = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }
  next();
});

module.exports = mongoose.model("Holiday", HolidaySchema);
