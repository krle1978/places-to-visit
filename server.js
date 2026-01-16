const path = require("path");
const express = require("express");

const commentsHandler = require("./api/comments");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// API
app.use("/api/comments", (req, res) => commentsHandler(req, res));

// Static files
// Root (so it can serve index.html, contact.html, etc.)
app.use(express.static(__dirname));

// Assets folder explicitly (optional but helpful)
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Optional: homepage fallback
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
