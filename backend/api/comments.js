const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const VERSION = "comments-api-2026-01-16-2048";

const memoryStore = new Map();
const localDirPath = path.join(process.cwd(), "data", "comments");
const legacyFilePath = path.join(process.cwd(), "data", "comments.json");

// ----- Limits -----
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

const MAX_STORE_ITEMS = 100;  // keep last 100 per key
const MAX_RETURN_ITEMS = 50;  // return last 50 per key

const rateLimitStore = new Map();

// ----- KV -----
const getKvClient = () => {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    const { kv } = require("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
};

// ----- Memory fallback -----
const readFromMemory = (key) => memoryStore.get(key) || [];

const writeToMemory = (key, value) => {
  const existing = memoryStore.get(key) || [];
  existing.push(value);
  const trimmed = existing.slice(-MAX_STORE_ITEMS);
  memoryStore.set(key, trimmed);
  return trimmed;
};

// ----- Rate limit -----
const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
};

const isRateLimited = (req, key) => {
  const ip = getClientIp(req);
  const bucketKey = `${ip}:${sanitizeKey(key)}`;
  const now = Date.now();

  const recent = rateLimitStore.get(bucketKey) || [];
  const filtered = recent.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (filtered.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(bucketKey, filtered);
    return true;
  }

  filtered.push(now);
  rateLimitStore.set(bucketKey, filtered);
  return false;
};

// ----- Key helpers -----
const sanitizeKey = (key) => {
  if (!key) return "unknown";
  return String(key).toLowerCase().replace(/[^a-z0-9-_]/g, "_");
};

const toKvKey = (key) => `comments:${sanitizeKey(key)}`;
const toLocalKey = (key) => sanitizeKey(key);
const toSingleFileKey = (key) => `comments:${sanitizeKey(key)}`;

const getLocalFilePath = (localKey) => path.join(localDirPath, `${localKey}.json`);
const useSingleFile = () => {
  const value = String(process.env.COMMENTS_SINGLE_FILE || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
};

// ----- Local storage (dev) -----
const readFromFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error && error.code === "ENOENT") return {};
    return {};
  }
};

const writeToFile = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

const readFromLocal = async (key) => {
  if (useSingleFile()) {
    const all = await readFromFile(legacyFilePath);
    const singleKey = toSingleFileKey(key);
    return Array.isArray(all[singleKey]) ? all[singleKey] : [];
  }

  const localKey = toLocalKey(key);
  const filePath = getLocalFilePath(localKey);
  const data = await readFromFile(filePath);
  if (Array.isArray(data)) return data;

  // Legacy migration: legacy JSON could be { "<localKey>": [ ... ] }
  const legacy = await readFromFile(legacyFilePath);
  const legacyKey = toSingleFileKey(key);
  if (legacy && Array.isArray(legacy[localKey])) {
    const migrated = legacy[localKey];
    await writeToFile(filePath, migrated);
    return migrated;
  }
  if (legacy && Array.isArray(legacy[legacyKey])) {
    const migrated = legacy[legacyKey];
    await writeToFile(filePath, migrated);
    return migrated;
  }

  return [];
};

const writeToLocal = async (key, value) => {
  if (useSingleFile()) {
    const all = await readFromFile(legacyFilePath);
    const singleKey = toSingleFileKey(key);
    const existing = Array.isArray(all[singleKey]) ? all[singleKey] : [];
    existing.push(value);
    const trimmed = existing.slice(-MAX_STORE_ITEMS);
    all[singleKey] = trimmed;
    await writeToFile(legacyFilePath, all);
    return trimmed;
  }

  const localKey = toLocalKey(key);
  const filePath = getLocalFilePath(localKey);
  const data = await readFromFile(filePath);
  const existing = Array.isArray(data) ? data : [];
  existing.push(value);
  const trimmed = existing.slice(-MAX_STORE_ITEMS);
  await writeToFile(filePath, trimmed);
  return trimmed;
};

// ----- KV storage -----
const readFromKv = async (kv, kvKey) => {
  const items = await kv.lrange(kvKey, -MAX_RETURN_ITEMS, -1);
  return Array.isArray(items)
    ? items
        .map((item) => {
          if (item == null) return null;
          if (typeof item === "object") return item;
          try {
            return JSON.parse(item);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    : [];
};

const writeToKv = async (kv, kvKey, value) => {
  await kv.rpush(kvKey, JSON.stringify(value));
  await kv.ltrim(kvKey, -MAX_STORE_ITEMS, -1);
  return readFromKv(kv, kvKey);
};

// ----- Response -----
const jsonResponse = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

// ----- Cookies / session -----
const parseCookieHeader = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
};

const getSessionId = (req) => {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  return cookies.comments_sid || "";
};

const ensureSessionId = (req, res, isProd) => {
  const existing = getSessionId(req);
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  const cookieParts = [
    `comments_sid=${encodeURIComponent(sessionId)}`,
    "Path=/",
    isProd ? "SameSite=None" : "SameSite=Lax",
    "HttpOnly",
  ];
  if (isProd) cookieParts.push("Secure");
  res.setHeader("Set-Cookie", cookieParts.join("; "));
  return sessionId;
};

const stripSession = (comments) =>
  Array.isArray(comments) ? comments.map(({ sessionId, ...rest }) => rest) : [];

// ----- Body parsing (Vercel-friendly) -----
// 1) tries req.body if present
// 2) else reads raw via events (more compatible than for-await on Vercel prod)
// 3) supports JSON and x-www-form-urlencoded
const readBodyAsString = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

const parseUrlEncoded = (raw) => {
  try {
    return Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return null;
  }
};

const getPayload = async (req) => {
  // If some runtime provided parsed body (rare in your setup), accept it
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    const s = req.body.trim();
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      const form = parseUrlEncoded(s);
      return form;
    }
  }
  if (Buffer.isBuffer(req.body)) {
    const s = req.body.toString("utf8").trim();
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      const form = parseUrlEncoded(s);
      return form;
    }
  }

  const raw = (await readBodyAsString(req)).trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const form = parseUrlEncoded(raw);
    return form;
  }
};

const normalizePathToKey = (rawPath) => {
  if (!rawPath) return "";
  let pathname = rawPath;

  if (/^https?:\/\//i.test(rawPath)) {
    try {
      pathname = new URL(rawPath).pathname;
    } catch {
      pathname = rawPath;
    }
  } else {
    pathname = rawPath.split("?")[0].split("#")[0];
  }

  pathname = decodeURIComponent(pathname).replace(/\\/g, "/").trim();
  if (!pathname) return "";

  const cleaned = pathname.replace(/\/index\.html?$/i, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (!parts.length) return "";

  let startIndex = 0;
  const destinationsIndex = parts.findIndex((part) => part.toLowerCase() === "destinations");
  if (destinationsIndex !== -1) startIndex = destinationsIndex + 1;
  if (parts[startIndex] && parts[startIndex].toLowerCase() === "country") {
    startIndex += 1;
  }

  const keyParts = parts.slice(startIndex);
  if (!keyParts.length) return "";

  return keyParts
    .join("-")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getKeyFromRequest = (req, payload) => {
  const direct =
    (payload && payload.key) || (req.query && req.query.key) || "";
  const directValue = String(direct).trim();
  if (directValue) {
    if (
      /[\\/]/.test(directValue) ||
      /\.html?$/i.test(directValue) ||
      /^https?:\/\//i.test(directValue)
    ) {
      const normalized = normalizePathToKey(directValue);
      if (normalized) return normalized;
    }
    return directValue;
  }

  const pathHint =
    (payload && (payload.path || payload.page || payload.url)) ||
    (req.query && (req.query.path || req.query.page || req.query.url)) ||
    req.headers.referer ||
    req.headers.referrer ||
    "";

  return normalizePathToKey(String(pathHint || ""));
};

// ----- Main handler -----
module.exports = async (req, res) => {
  const kv = getKvClient();
  const isProd = process.env.NODE_ENV === "production";
  const shouldUseKv = Boolean(kv && isProd);

  // Debug endpoint
  if (req.method === "GET" && req.query && req.query.debug === "1") {
    return jsonResponse(res, 200, {
      ok: true,
      version: VERSION,
      nodeEnv: process.env.NODE_ENV || "unknown",
      hasReqBody: typeof req.body,
      hasKvEnv: Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
      shouldUseKv,
    });
  }

  if (req.method === "GET") {
    const key = getKeyFromRequest(req);
    if (!key) return jsonResponse(res, 400, { error: "Missing key." });

    const kvKey = toKvKey(key);

    let data;
    if (shouldUseKv) {
      data = await readFromKv(kv, kvKey);
    } else {
      try {
        data = await readFromLocal(key);
      } catch {
        data = readFromMemory(toLocalKey(key));
      }
    }

    return jsonResponse(res, 200, { comments: stripSession(data) });
  }

  if (req.method === "POST") {
    try {
      const payload = await getPayload(req);
      if (!payload) return jsonResponse(res, 400, { error: "Invalid JSON payload." });

      // Allow key from body or query
      const key = getKeyFromRequest(req, payload);
      const name = String(payload.name || "Anonymous").trim();
      const comment = String(payload.comment || "").trim();

      // honeypot field (optional)
      const honeypot = String(payload.website || "").trim();

      if (!key || !comment) {
        return jsonResponse(res, 400, { error: "Missing key or comment." });
      }
      if (honeypot) {
        return jsonResponse(res, 400, { error: "Invalid submission." });
      }
      if (isRateLimited(req, key)) {
        return jsonResponse(res, 429, { error: "Too many comments. Please wait a bit." });
      }

      const sessionId = ensureSessionId(req, res, isProd);

      const entry = {
        id: crypto.randomUUID(),
        name: name.slice(0, 60),
        text: comment.slice(0, 500),
        createdAt: new Date().toISOString(),
        sessionId,
      };

      const kvKey = toKvKey(key);

      let data;
      if (shouldUseKv) {
        data = await writeToKv(kv, kvKey, entry);
      } else {
        try {
          data = await writeToLocal(key, entry);
        } catch {
          data = writeToMemory(toLocalKey(key), entry);
        }
      }

      return jsonResponse(res, 201, { comments: stripSession(data), createdId: entry.id });
    } catch (error) {
      console.error("POST /api/comments error:", error);
      const message =
        process.env.NODE_ENV === "development"
          ? `Invalid payload: ${error.message}`
          : "Invalid JSON payload.";
      return jsonResponse(res, 400, { error: message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const payload = await getPayload(req);
      if (!payload) return jsonResponse(res, 400, { error: "Invalid JSON payload." });

      const key = getKeyFromRequest(req, payload);
      const id = String(payload.id || "").trim();

      if (!key || !id) {
        return jsonResponse(res, 400, { error: "Missing key or id." });
      }

      const sessionId = getSessionId(req);
      if (!sessionId) return jsonResponse(res, 401, { error: "Missing session." });

      const kvKey = toKvKey(key);

      const loadAll = async () => {
        if (shouldUseKv) return readFromKv(kv, kvKey);
        return readFromLocal(key);
      };

      const saveAll = async (items) => {
        const trimmed = items.slice(-MAX_STORE_ITEMS);

        if (shouldUseKv) {
          await kv.del(kvKey);
          if (trimmed.length) {
            await kv.rpush(kvKey, ...trimmed.map((item) => JSON.stringify(item)));
            await kv.ltrim(kvKey, -MAX_STORE_ITEMS, -1);
          }
          return trimmed;
        }

        if (useSingleFile()) {
          const all = await readFromFile(legacyFilePath);
          const singleKey = toSingleFileKey(key);
          all[singleKey] = trimmed;
          await writeToFile(legacyFilePath, all);
        } else {
          await writeToFile(getLocalFilePath(toLocalKey(key)), trimmed);
        }
        return trimmed;
      };

      const existing = await loadAll();
      const filtered = existing.filter(
        (item) => !(item.id === id && item.sessionId === sessionId)
      );

      if (filtered.length === existing.length) {
        return jsonResponse(res, 404, { error: "Comment not found." });
      }

      const data = await saveAll(filtered);
      return jsonResponse(res, 200, { comments: stripSession(data) });
    } catch (error) {
      console.error("DELETE /api/comments error:", error);
      return jsonResponse(res, 400, { error: "Invalid JSON payload." });
    }
  }

  return jsonResponse(res, 405, { error: "Method not allowed." });
};
