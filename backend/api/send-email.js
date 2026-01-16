const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("OK: use POST /api/send-email with { name, email, message }.");
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, message } = req.body || {};

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
      from: `"Places To Visit Contact" <${process.env.MAIL_USER}>`,
      to: "krstic.rade@gmail.com",
      subject: "New Contact Form Message",
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}\n`
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
};
