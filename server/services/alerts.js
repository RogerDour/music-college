const cron = require("node-cron");
const Lesson = require("../models/Lesson");
const Alert = require("../models/Alert");
const { pushNotification } = require("./notify");

async function computeLowAttendance(io) {
  // Find students with >= 5 lessons where attended ratio < 0.5 (last 30 days)
  const since = new Date(Date.now() - 30*24*3600*1000);
  const data = await Lesson.aggregate([
    { $match: { date: { $gte: since }, status: { $in: ["scheduled","completed"] }, studentId: { $ne: null } } },
    { $group: { _id: "$studentId", total: { $sum: 1 }, attended: { $sum: { $cond: ["$attended", 1, 0] } } } },
    { $addFields: { ratio: { $cond: [{ $eq:["$total",0]}, 0, { $divide:["$attended","$total"] }] } } },
    { $match: { total: { $gte: 5 }, ratio: { $lt: 0.5 } } }
  ]);
  for (const row of data) {
    const title = "Low attendance detected";
    const body = `Attendance ratio ${(row.ratio*100).toFixed(0)}% over ${row.total} lessons.`;
    const exists = await Alert.findOne({ userId: row._id, type: "low_attendance", body }).lean();
    if (!exists) {
      const doc = await Alert.create({ userId: row._id, type: "low_attendance", title, body });
      await pushNotification(io, { userId: row._id, type: "alert", title, body, data: { alertId: doc._id } });
    }
  }
}

function startAlertsWorker(io) {
  cron.schedule("*/5 * * * *", async () => { // every 5 minutes
    try { await computeLowAttendance(io); } catch(e) { console.error("alerts job error", e); }
  }, { timezone: process.env.TZ || "Asia/Jerusalem" });
}

module.exports = { startAlertsWorker };
