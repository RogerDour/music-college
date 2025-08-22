/**
 * Requires a running MongoDB for integration. Set MONGODB_URI if needed.
 */
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
const JWT_SECRET = process.env.JWT_SECRET;

const lessonsRouter = require("../routes/lesson");
const Lesson = require("../models/Lesson");

function bearer(id, role) {
  return "Bearer " + jwt.sign({ id: String(id), role }, JWT_SECRET);
}

describe("Lessons list as student", () => {
  let app;
  let studentA, studentB, teacher;

  beforeAll(async () => {
    const uri =
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/music_college_lessons_list_test";
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use("/api/lessons", lessonsRouter);

    // deterministic ids
    studentA = new mongoose.Types.ObjectId("64b0000000000000000000a1");
    studentB = new mongoose.Types.ObjectId("64b0000000000000000000b1");
    teacher = new mongoose.Types.ObjectId("64b0000000000000000000t1");
  });

  afterAll(async () => {
    await mongoose.connection.close(true);
  });

  beforeEach(async () => {
    await Lesson.deleteMany({});
    const base = new Date("2030-01-01T10:00:00.000Z");
    await Lesson.insertMany([
      {
        title: "A1",
        teacherId: teacher,
        studentId: studentA,
        date: base,
        duration: 60,
        status: "scheduled",
      },
      {
        title: "B1",
        teacherId: teacher,
        studentId: studentB,
        date: new Date(base.getTime() + 3600 * 1000),
        duration: 60,
        status: "scheduled",
      },
    ]);
  });

  test("GET /api/lessons/ returns only my lessons for students", async () => {
    const res = await request(app)
      .get("/api/lessons/")
      .set("Authorization", bearer(studentA, "student"))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("A1");
  });

  test("GET /api/lessons/mine returns only my lessons for students", async () => {
    const res = await request(app)
      .get("/api/lessons/mine")
      .set("Authorization", bearer(studentB, "student"))
      .expect(200);

    expect(Array.isArray(res.body.lessons)).toBe(true);
    expect(res.body.lessons.length).toBe(1);
    expect(res.body.lessons[0].title).toBe("B1");
  });
});
