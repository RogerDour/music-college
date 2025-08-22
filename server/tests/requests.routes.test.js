const express = require("express");
const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const requestsRouter = require("../routes/requests");
const lessonsRouter = require("../routes/lesson");
const Lesson = require("../models/Lesson");
const LessonRequest = require("../models/LessonRequest");

const JWT_SECRET = process.env.JWT_SECRET || "test_secret";

function token(payload) {
  return jwt.sign(payload, JWT_SECRET);
}

function appFactory() {
  const app = express();
  app.use(express.json());
  app.use("/api/requests", requestsRouter);
  app.use("/api/lessons", lessonsRouter); // for side-effect lesson creation
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
  await Promise.all([Lesson.deleteMany({}), LessonRequest.deleteMany({})]);
});

test("student creates request → teacher lists → approve creates lesson", async () => {
  const app = appFactory();

  const studentT = token({ id: "64b0000000000000000000aa", role: "student" });
  const teacherT = token({ id: "64b0000000000000000000bb", role: "teacher" });

  // student creates
  const create = await request(app)
    .post("/api/requests")
    .set("Authorization", `Bearer ${studentT}`)
    .send({
      teacherId: "64b0000000000000000000bb",
      start: "2030-02-02T10:00:00.000Z",
      duration: 45,
      title: "Try me",
    })
    .expect(200);

  // teacher lists
  const list = await request(app)
    .get("/api/requests")
    .set("Authorization", `Bearer ${teacherT}`)
    .expect(200);

  expect(list.body.items.length).toBe(1);

  const reqId = create.body._id;

  // approve
  const approve = await request(app)
    .post(`/api/requests/${reqId}/approve`)
    .set("Authorization", `Bearer ${teacherT}`)
    .expect(200);

  expect(approve.body.ok).toBe(true);
  const lessons = await Lesson.find({}).lean();
  expect(lessons.length).toBe(1);
});
