const request = require("supertest");
const { app } = require("../index");
const mongoose = require("mongoose");

// If you created .env.test you can load it; otherwise your index.js already loads env.
// require("dotenv").config({ path: ".env.test" });

async function waitForMongoReady(timeoutMs = 15000) {
  const start = Date.now();
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Mongo never reached readyState=1 within timeout");
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

beforeAll(async () => {
  // IMPORTANT: do NOT call mongoose.connect here.
  // index.js already calls mongoose.connect on import.
  await waitForMongoReady();
});

afterAll(async () => {
  // Close once at the end
  await mongoose.connection.close();
});

describe("Auth flow", () => {
  const email = `u${Date.now()}@test.com`;
  const password = "secret123";

  it("signup -> 200/201", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email,
      password,
      role: "student"
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("login -> 200 and token", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("profile (Bearer token) -> 200 and same email", async () => {
    const login = await request(app).post("/api/auth/login").send({ email, password });
    const token = login.body.token;

    const res = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    const gotEmail = res.body?.email || res.body?.user?.email;
    expect(gotEmail).toBe(email);
  });

  it("login wrong password -> 400/401", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password: "wrong" });
    expect([400, 401]).toContain(res.statusCode);
  });
});
