// server/services/reminders.js
const cron = require("node-cron");
const Lesson = require("../models/Lesson");
const { pushNotification } = require("./notify");
const { sendMail, bookingTemplate } = require("./mail");
const User = require("../models/User");

function formatLocal(dt) { return new Date(dt).toLocaleString(); }

/**
 * Start reminder job.
 * Runs every minute and sends reminders for lessons starting in the next 60 minutes.
 */
function startReminderWorker(io, options = {}) {
  const windowMin = options.windowMin || 60;
  const tz = process.env.TZ || "Asia/Jerusalem";

  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + windowMin * 60000);
      const q = { status: "scheduled", date: { $gte: now, $lte: soon }, reminderSent: { $ne: true } };
      const lessons = await Lesson.find(q).limit(200).lean();

      for (const l of lessons) {
        // Mark first to avoid duplicate sends if slow
        await Lesson.updateOne({ _id: l._id }, { $set: { reminderSent: true } });

        const [teacher, student] = await Promise.all([
          l.teacherId ? User.findById(l.teacherId).lean() : null,
          l.studentId ? User.findById(l.studentId).lean() : null,
        ]);

        const title = "Lesson reminder";
        const body = `${l.title || "Lesson"} at ${formatLocal(l.date)} for ${l.duration} minutes.`;
        if (teacher?._id) await pushNotification(io, { userId: teacher._id, type: "reminder", title, body, data: { lessonId: l._id } });
        if (student?._id) await pushNotification(io, { userId: student._id, type: "reminder", title, body, data: { lessonId: l._id } });

        // Email (best-effort)
        try {
          if (teacher?.email) await sendMail({ to: teacher.email, subject: title, html: bookingTemplate({ title, body }) });
          if (student?.email) await sendMail({ to: student.email, subject: title, html: bookingTemplate({ title, body }) });
        } catch (e) {
          console.error("reminder email failed", e.message);
        }
      }
    } catch (e) {
      console.error("reminders job error", e);
    }
  }, { timezone: tz });
}

module.exports = { startReminderWorker };
