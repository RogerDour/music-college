// server/services/mail.js
const nodemailer = require("nodemailer");

const HOST = process.env.SMTP_HOST || "";
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER || "";
const PASS = process.env.SMTP_PASS || "";
const FROM = process.env.MAIL_FROM || process.env.FROM_EMAIL || "Music College <no-reply@local>";

const transporter = (HOST && USER && PASS)
  ? nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // true for 465, false for 587/25/2525
      auth: { user: USER, pass: PASS },
    })
  : null;

async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    // Dev fallback: print to console so you can copy the link
    console.warn("[mail] SMTP not configured — printing email to console");
    console.log("====== EMAIL (DEV) ======");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(html || text || "");
    console.log("=========================");
    return { dev: true };
  }
  return transporter.sendMail({ from: FROM, to, subject, html, text });
}

function resetTemplate({ title, body }) {
  return `
<!doctype html><html><body style="font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:auto;padding:16px;border:1px solid #eee;border-radius:8px">
    <h2>${title}</h2>
    <div>${body}</div>
  </div>
</body></html>`;
}

// ✅ Added: bookingTemplate used by lessons route
function bookingTemplate({ studentName, teacherName, date }) {
  const when = new Date(date).toLocaleString();
  return `
<!doctype html><html><body style="font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:auto;padding:16px;border:1px solid #eee;border-radius:8px">
    <h2>Your lesson is booked 🎵</h2>
    <p>Hi ${studentName || "Student"},</p>
    <p>Your lesson with <b>${teacherName || "your teacher"}</b> is scheduled for:</p>
    <p style="font-size:16px"><b>${when}</b></p>
    <p>See you soon!</p>
    <hr />
    <p style="color:#666">Music College</p>
  </div>
</body></html>`;
}

module.exports = { sendMail, resetTemplate, bookingTemplate };
