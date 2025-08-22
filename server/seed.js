// server/seed.js
require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Course = require("./models/Course");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");

  const adminEmail = "admin@example.com";
  const teacherEmail = "teacher@example.com";
  const studentEmail = "student@example.com";

  const [admin, teacher, student] = await Promise.all([
    User.findOneAndUpdate({ email: adminEmail }, { name: "Admin", email: adminEmail, password: bcrypt.hashSync("Passw0rd!",8), role: "admin" }, { upsert: true, new: true }),
    User.findOneAndUpdate({ email: teacherEmail }, { name: "Teacher", email: teacherEmail, password: bcrypt.hashSync("Passw0rd!",8), role: "teacher" }, { upsert: true, new: true }),
    User.findOneAndUpdate({ email: studentEmail }, { name: "Student", email: studentEmail, password: bcrypt.hashSync("Passw0rd!",8), role: "student" }, { upsert: true, new: true }),
  ]);

  await Course.deleteMany({});
  const guitar = await Course.create({ title: "Guitar", teacherId: teacher._id, capacity: 10 });

  console.log({ admin: admin.email, teacher: teacher.email, student: student.email, course: guitar.title });
  await mongoose.disconnect();
}

run().catch(e => (console.error(e), process.exit(1)));
