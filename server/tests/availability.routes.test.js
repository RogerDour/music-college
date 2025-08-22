// server/tests/availability.routes.test.js
const express = require("express");
const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const availabilityRouter = require("../routes/availability");
const Availability = require("../models/Availability");
const Holiday = require("../models/Holiday");

const JWT_SECRET = process.env.JWT_SECRET || "test_secret";

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET);
}

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/availability", availabilityRouter);
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
  await Promise.all([Availability.deleteMany({}), Holiday.deleteMany({})]);
});

describe("Availability routes", () => {
  it("upserts and reads /me", async () => {
    const app = makeApp();
    const token = makeToken({ id: "u1", role: "teacher" });

    const putRes = await request(app)
      .put("/api/availability/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        weeklyRules: [{ day: 1, start: "09:00", end: "12:00" }],
        exceptions: [],
      })
      .expect(200);

    expect(putRes.body.weeklyRules).toHaveLength(1);

    const getRes = await request(app)
      .get("/api/availability/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(getRes.body.weeklyRules).toHaveLength(1);
  });

  it("rejects invalid weeklyRules", async () => {
    const app = makeApp();
    const token = makeToken({ id: "u1", role: "teacher" });

    await request(app)
      .put("/api/availability/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ weeklyRules: [{ day: 9, start: "09:00", end: "12:00" }] })
      .expect(400);
  });

  it("admin can manage holidays", async () => {
    const app = makeApp();
    const admin = makeToken({ id: "a1", role: "admin" });

    // Add a holiday
    const add = await request(app)
      .post("/api/availability/holidays")
      .set("Authorization", `Bearer ${admin}`)
      .send({ holidays: [{ date: new Date(), label: "TestDay" }] })
      .expect(200);

    expect(add.body.ok).toBe(true);
    expect(add.body.holidays.length).toBeGreaterThanOrEqual(1);

    // List
    const list = await request(app)
      .get("/api/availability/holidays")
      .set("Authorization", `Bearer ${admin}`)
      .expect(200);
    expect(Array.isArray(list.body.holidays)).toBe(true);

    // Delete by id
    const id = list.body.holidays[0]._id;
    await request(app)
      .delete(`/api/availability/holidays/${id}`)
      .set("Authorization", `Bearer ${admin}`)
      .expect(200);
  });

  it("student cannot access others' availability", async () => {
    const app = makeApp();
    const student = makeToken({ id: "s1", role: "student" });

    await request(app)
      .get("/api/availability/anotherUser")
      .set("Authorization", `Bearer ${student}`)
      .expect(403);
  });
});
