// server/tests/auth.middleware.test.js
const { authenticate, authorize } = require("../middleware/auth");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "test_secret";

function makeRes() {
  return {
    statusCode: 200,
    _json: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this._json = obj; return this; },
  };
}

function makeNext() {
  const fn = jest.fn();
  return fn;
}

describe("auth middleware", () => {
  it("rejects missing token", () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = makeNext();
    authenticate(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts valid token & attaches user", () => {
    const token = jwt.sign({ id: "abc123", role: "Teacher" }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = makeNext();

    // temporarily override env for this test invocation
    process.env.JWT_SECRET = JWT_SECRET;
    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: "abc123", role: "teacher" });
  });

  it("authorize enforces role", () => {
    const req = { user: { id: "u1", role: "teacher" } };
    const res = makeRes();
    const next = makeNext();
    authorize("admin", "teacher")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("authorize blocks wrong role", () => {
    const req = { user: { id: "u1", role: "student" } };
    const res = makeRes();
    const next = makeNext();
    authorize("admin", "teacher")(req, res, next);
    expect(res.statusCode).toBe(403);
  });
});
