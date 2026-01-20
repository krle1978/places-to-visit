const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("OK: use POST /api/send-email with { name, email, message }.");
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, message, subject } = req.body || {};
  const resolvedSubject =
    String(subject || "").trim() || "Comment from Places To Visit";

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
    // tls: { rejectUnauthorized: false }  // ovo izbaci, nije ti potrebno za Gmail i ruóno je security-wise
  });

  try {
    await transporter.sendMail({
      from: `"${name}" <${process.env.MAIL_USER}>`,
      replyTo: `"${name}" <${email}>`,
      to: process.env.MAIL_USER,
      subject: resolvedSubject,
      text: message
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
};

