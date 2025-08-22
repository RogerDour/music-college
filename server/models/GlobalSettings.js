// server/models/GlobalSettings.js
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    openHour: { type: Number, default: 9, min: 0, max: 23 },   // local opening hour
    closeHour: { type: Number, default: 21, min: 0, max: 23 }, // local closing hour
    daysOpen: { type: [Number], default: [0,1,2,3,4,5,6] },    // 0=Sun..6=Sat
  },
  { timestamps: true }
);

module.exports = mongoose.model("GlobalSettings", schema);
