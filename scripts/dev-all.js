const path = require("path");
const { spawn } = require("child_process");

require("./write-runtime-config");

const repoRoot = path.resolve(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

const spawnOpts = {
  cwd: repoRoot,
  stdio: "inherit",
  shell: true,
};

const backend = spawn(npmCmd, ["--prefix", "backend", "start"], spawnOpts);

const frontend = spawn(
  npxCmd,
  [
    "live-server",
    "--host=localhost",
    "--port=3000",
    "--open=./index.html",
    "--ignore=backend/**",
  ],
  spawnOpts
);

const shutdown = (code) => {
  if (backend && !backend.killed) backend.kill();
  if (frontend && !frontend.killed) frontend.kill();
  process.exit(code ?? 0);
};

backend.on("exit", (code) => shutdown(code));
frontend.on("exit", (code) => shutdown(code));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
