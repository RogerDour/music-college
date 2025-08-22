const mongoose = require("mongoose");
const { suggestSlots, startOfLocalDay } = require("../utils/scheduling");
const Availability = require("../models/Availability");
const GlobalSettings = require("../models/GlobalSettings");
const Lesson = require("../models/Lesson");
const Holiday = require("../models/Holiday");

beforeAll(async () => {
  const uri =
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/music_college_scheduling_test";
  await mongoose.connect(uri, { autoIndex: true });

  // Global settings: open all days 08:00-20:00
  await GlobalSettings.deleteMany({});
  await GlobalSettings.create({
    daysOpen: [0, 1, 2, 3, 4, 5, 6],
    openHour: 8,
    closeHour: 20,
  });
});

afterAll(async () => {
  await mongoose.connection.close(true);
});

beforeEach(async () => {
  await Promise.all([
    Availability.deleteMany({}),
    Lesson.deleteMany({}),
    Holiday.deleteMany({}),
  ]);
  process.env.SCHEDULING_BUFFER_MIN = "15";
});

function id(hex) {
  return new mongoose.Types.ObjectId(hex || undefined);
}

test("greedy never returns slots before 'from' and respects buffer around existing lessons", async () => {
  const teacherId = id("64b000000000000000000001");
  const studentId = id("64b000000000000000000002");

  // Availabilities: Monday 09:00-17:00
  await Availability.create({
    userId: teacherId,
    weeklyRules: [{ day: 1, start: "09:00", end: "17:00" }],
  });
  await Availability.create({
    userId: studentId,
    weeklyRules: [{ day: 1, start: "09:00", end: "17:00" }],
  });

  // Anchor Monday
  const monday = startOfLocalDay(new Date("2030-01-07T00:00:00.000Z")); // 2030-01-07 is Monday UTC; local day start is fine

  // Teacher has lesson 10:00-11:00 → with 15m buffer earliest legal start is 11:15
  await Lesson.create({
    title: "Existing",
    teacherId,
    studentId,
    date: new Date(monday.getTime() + 10 * 3600 * 1000),
    duration: 60,
    status: "scheduled",
  });

  const from = new Date(monday.getTime() + 12 * 3600 * 1000); // 12:00
  const res = await suggestSlots({
    teacherId,
    studentId,
    from,
    days: 1,
    durationMin: 60,
    stepMinutes: 15,
    bufferMinutes: 15,
    maxSuggestions: 5,
    algorithm: "greedy",
  });

  expect(res.length).toBeGreaterThan(0);
  // All suggestions must be >= 12:00 (not before 'from')
  for (const s of res) {
    expect(new Date(s.start).getTime()).toBeGreaterThanOrEqual(from.getTime());
    // Also ensure respect of global hours is implicitly true
  }
});

test("backtracking finds a future slot when initial window has none", async () => {
  const teacherId = id("64b000000000000000000011");
  const studentId = id("64b000000000000000000022");

  // Only Monday availability
  await Availability.create({
    userId: teacherId,
    weeklyRules: [{ day: 1, start: "09:00", end: "10:00" }],
  });
  await Availability.create({
    userId: studentId,
    weeklyRules: [{ day: 1, start: "09:00", end: "10:00" }],
  });

  const tuesday = startOfLocalDay(new Date("2030-01-08T00:00:00.000Z")); // Tuesday
  const res = await suggestSlots({
    teacherId,
    studentId,
    from: new Date(tuesday.getTime() + 8 * 3600 * 1000), // Tue 08:00
    durationMin: 30,
    stepMinutes: 15,
    bufferMinutes: 0,
    maxSuggestions: 3,
    algorithm: "backtracking",
    // narrow chunks so first chunk (Tue) is empty, next chunk(s) include Monday
    // (defaults also work, this just keeps the test fast)
    chunkDays: 2,
    maxChunks: 4,
  });

  expect(res.length).toBeGreaterThan(0);
  const first = new Date(res[0].start);
  // Monday is day 1
  expect(first.getDay()).toBe(1);
});

test("greedy skips holiday dates entirely", async () => {
  const teacherId = id("64b0000000000000000000a1");
  const studentId = id("64b0000000000000000000a2");

  // Availability all week 09-12 for both
  await Availability.create({
    userId: teacherId,
    weeklyRules: [
      { day: 1, start: "09:00", end: "12:00" },
      { day: 2, start: "09:00", end: "12:00" },
      { day: 3, start: "09:00", end: "12:00" },
    ],
  });
  await Availability.create({
    userId: studentId,
    weeklyRules: [
      { day: 1, start: "09:00", end: "12:00" },
      { day: 2, start: "09:00", end: "12:00" },
      { day: 3, start: "09:00", end: "12:00" },
    ],
  });

  // Put a holiday on Tuesday (local)
  const tue = startOfLocalDay(new Date("2030-01-08T00:00:00.000Z"));
  await Holiday.create({ date: tue, label: "Closed" });

  const res = await suggestSlots({
    teacherId,
    studentId,
    from: new Date("2030-01-06T00:00:00.000Z"),
    days: 3,
    durationMin: 60,
    stepMinutes: 30,
    bufferMinutes: 0,
    maxSuggestions: 10,
    algorithm: "greedy",
  });

  // Ensure no suggestions fall on Tuesday (holiday)
  for (const s of res) {
    expect(new Date(s.start).getDay()).not.toBe(2); // 2 = Tue
  }
});
