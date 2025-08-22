const express = require("express");
const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const lessonsRouter = require("../routes/lesson");
const Lesson = require("../models/Lesson");

const JWT_SECRET = process.env.JWT_SECRET || "test_secret";

function token(payload) {
  return jwt.sign(payload, JWT_SECRET);
}

function appFactory() {
  const app = express();
  app.use(express.json());
  app.use("/api/lessons", lessonsRouter);
  return app;
}

beforeAll(async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/music_college_test";
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close(true);
});

beforeEach(async () => {
  await Lesson.deleteMany({});
});

test("create lesson & prevent overlap", async () => {
  const app = appFactory();
  const t = token({ id: "64b000000000000000000001", role: "teacher" });

  // create baseline lesson
  await request(app)
    .post("/api/lessons")
    .set("Authorization", `Bearer ${t}`)
    .send({
      title: "L1",
      date: "2030-01-01T10:00:00.000Z",
      duration: 60,
    })
    .expect(201);

  // overlapping attempt -> 409
  const r = await request(app)
    .post("/api/lessons")
    .set("Authorization", `Bearer ${t}`)
    .send({
      title: "L2",
      date: "2030-01-01T10:30:00.000Z",
      duration: 30,
    })
    .expect(409);

  expect(r.body.error).toMatch(/Teacher has another lesson/);
});

test("create weekly recurring - returns created list", async () => {
  const app = appFactory();
  const t = token({ id: "64b000000000000000000001", role: "teacher" });

  const res = await request(app)
    .post("/api/lessons/recurring")
    .set("Authorization", `Bearer ${t}`)
    .send({
      title: "Series",
      teacherId: "64b000000000000000000001",
      studentId: "64b000000000000000000002",
      startDate: "2030-01-06T10:00:00.000Z", // Sunday week anchor
      duration: 60,
      interval: 1,
      count: 3,
      byDay: [1, 3], // Mon & Wed
    })
    .expect(200);

  expect(res.body.ok).toBe(true);
  expect(Array.isArray(res.body.created)).toBe(true);
  expect(res.body.created.length).toBe(3);
});
