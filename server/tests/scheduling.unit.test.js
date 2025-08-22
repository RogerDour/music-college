// server/tests/scheduling.unit.test.js
const mongoose = require("mongoose");
const { suggestSlots } = require("../utils/scheduling");
const Lesson = require("../models/Lesson");
const Availability = require("../models/Availability");
const Holiday = require("../models/Holiday");
const GlobalSettings = require("../models/GlobalSettings");
const User = require("../models/User");

jest.setTimeout(30000);

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/music_college";
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  await mongoose.connection.close(true);
});

describe("Scheduling utils", () => {
  let teacher, student;

  beforeEach(async () => {
    await Promise.all([
      Lesson.deleteMany({}),
      Availability.deleteMany({}),
      Holiday.deleteMany({}),
      GlobalSettings.deleteMany({}),
      User.deleteMany({}),
    ]);

    teacher = await User.create({ name: "T", email: "t@test.com", password: "x", role: "teacher" });
    student = await User.create({ name: "S", email: "s@test.com", password: "x", role: "student" });

    // global hours open 08:00-22:00 all days
    await GlobalSettings.create({ openHour: 8, closeHour: 22, daysOpen: [0,1,2,3,4,5,6] });

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24*60*60000);

    // Availability: both free 09:00-12:00 today and tomorrow
    await Availability.create({
      userId: teacher._id,
      weeklyRules: [
        { day: today.getDay(), start: "09:00", end: "12:00" },
        { day: tomorrow.getDay(), start: "09:00", end: "12:00" },
      ],
      exceptions: [],
    });
    await Availability.create({
      userId: student._id,
      weeklyRules: [
        { day: today.getDay(), start: "09:00", end: "12:00" },
        { day: tomorrow.getDay(), start: "09:00", end: "12:00" },
      ],
      exceptions: [],
    });
  });

  it("greedy should not return times overlapping existing lessons (teacher)", async () => {
    const base = new Date();
    const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 30, 0, 0);
    await Lesson.create({
      title: "Busy",
      teacherId: teacher._id,
      studentId: student._id,
      date: at,
      duration: 60,
      status: "scheduled",
    });

    const res = await suggestSlots({
      teacherId: teacher._id,
      studentId: student._id,
      from: new Date(base.getFullYear(), base.getMonth(), base.getDate(), 8, 0, 0, 0),
      days: 1,
      durationMin: 60,
      stepMinutes: 15,
      bufferMinutes: 0,
      maxSuggestions: 10,
      algorithm: "greedy",
    });

    // All suggestions must avoid the 09:30-10:30 busy slot
    for (const s of res) {
      const sStart = new Date(s.start).getTime();
      const sEnd = new Date(s.end).getTime();
      const busyStart = at.getTime();
      const busyEnd = busyStart + 60 * 60000;
      const overlap = (sStart < busyEnd) && (sEnd > busyStart);
      expect(overlap).toBe(false);
    }
  });

  it("buffer should forbid suggestions within +/- buffer around busy slots", async () => {
    const base = new Date();
    const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 10, 0, 0, 0);
    await Lesson.create({
      title: "Busy",
      teacherId: teacher._id,
      studentId: student._id,
      date: at,
      duration: 60,
      status: "scheduled",
    });

    const res = await suggestSlots({
      teacherId: teacher._id,
      studentId: student._id,
      from: new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 0, 0, 0),
      days: 1,
      durationMin: 60,
      stepMinutes: 15,
      bufferMinutes: 30,
      maxSuggestions: 20,
      algorithm: "greedy",
    });

    const forbiddenWindow = { start: at.getTime() - 30*60000, end: at.getTime() + 90*60000 };
    for (const s of res) {
      const sStart = new Date(s.start).getTime();
      const sEnd = new Date(s.end).getTime();
      const overlap = (sStart < forbiddenWindow.end) && (sEnd > forbiddenWindow.start);
      expect(overlap).toBe(false);
    }
  });
});
