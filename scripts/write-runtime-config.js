const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env");

const parseEnv = (content) => {
  const result = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) return;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  });
  return result;
};

let apiBaseUrl = process.env.API_BASE_URL || process.env.VITE_API_URL;

if (!apiBaseUrl && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  const parsed = parseEnv(content);
  apiBaseUrl = parsed.API_BASE_URL || parsed.VITE_API_URL;
}

if (!apiBaseUrl) {
  apiBaseUrl = "http://localhost:3001";
}

const outputPath = path.join(repoRoot, "runtime-config.json");
const payload = { apiBaseUrl };

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`Wrote runtime config to ${outputPath}`);
