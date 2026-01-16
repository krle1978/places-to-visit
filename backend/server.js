const path = require("path");
const express = require("express");

const commentsHandler = require("./api/comments");
const sendEmailHandler = require("./api/send-email");

process.chdir(__dirname);

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api/comments", (req, res) => commentsHandler(req, res));
app.use("/api/send-email", (req, res) => sendEmailHandler(req, res));

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true, service: "places-to-visit-backend" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
