const request = require("supertest");
const { app } = require("../index");
const mongoose = require("mongoose");

async function waitForMongoReady(timeoutMs = 15000) {
  const start = Date.now();
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Mongo never reached readyState=1 within timeout");
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

let teacherToken;
let studentToken;
let studentId;

beforeAll(async () => {
  await waitForMongoReady();

  // create teacher
  const tEmail = `t${Date.now()}@t.com`;
  await request(app).post("/api/auth/signup").send({
    name: "Teacher One",
    email: tEmail,
    password: "pass12345",
    role: "teacher"
  });
  const tLogin = await request(app).post("/api/auth/login").send({
    email: tEmail,
    password: "pass12345"
  });
  teacherToken = tLogin.body.token;

  // create student
  const sEmail = `s${Date.now()}@s.com`;
  await request(app).post("/api/auth/signup").send({
    name: "Student One",
    email: sEmail,
    password: "pass12345",
    role: "student"
  });
  const sLogin = await request(app).post("/api/auth/login").send({
    email: sEmail,
    password: "pass12345"
  });
  studentToken = sLogin.body.token;

  // get student id from profile
  const sProfile = await request(app)
    .get("/api/profile")
    .set("Authorization", `Bearer ${studentToken}`);

  studentId = sProfile.body?._id || sProfile.body?.user?._id;
});

describe("Lessons", () => {
  it("teacher can create a lesson -> 200/201 and returns _id", async () => {
    const res = await request(app)
      .post("/api/lessons")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        title: "Test Lesson",
        studentId,
        date: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body?._id).toBeTruthy();
  });
});

// 👇 add this at the very end
afterAll(async () => {
  await mongoose.connection.close(true);
});
