const nodemailer = require("nodemailer");

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

const parseJson = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("OK: use POST /api/send-email with { name, email, message }.");
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const rawBody = await readBody(req);
  const payload = parseJson(rawBody) || {};
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const message = String(payload.message || "").trim();

  if (!name || !email || !message) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing fields" }));
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      minVersion: "TLSv1.2",
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  try {
    await transporter.sendMail({
      from: `"${name}" <${process.env.MAIL_USER}>`,
      replyTo: `"${name}" <${email}>`,
      to: process.env.MAIL_USER,
      subject: "Comment from Places To Vidit",
      text: message,
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("Email error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Failed to send email" }));
  }
};
