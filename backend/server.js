const path = require("path");
const express = require("express");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const commentsHandler = require("./api/comments");
const sendEmailHandler = require("./api/send-email");

process.chdir(__dirname);

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const ALLOWED_ORIGINS = new Set([
  "https://places-to-visit-byrk.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  // Preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  next();
});

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
