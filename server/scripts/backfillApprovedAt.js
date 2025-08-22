require("dotenv").config();
const mongoose = require("mongoose");
const Enrollment = require("../models/Enrollment");

(async () => {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/yourdb";
  await mongoose.connect(uri);
  const res = await Enrollment.updateMany(
    { status: "approved", approvedAt: { $exists: false } },
    [ { $set: { approvedAt: "$updatedAt" } } ] // requires MongoDB 4.2+
  );
  console.log("Backfilled:", res.modifiedCount);
  await mongoose.disconnect();
  process.exit(0);
})();
