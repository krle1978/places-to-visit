const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const memoryStore = new Map();
const localDirPath = path.join(process.cwd(), "data", "comments");
const legacyFilePath = path.join(process.cwd(), "data", "comments.json");

const getKvClient = () => {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }

  try {
    const { kv } = require("@vercel/kv");
    return kv;
  } catch (error) {
    return null;
  }
};

const readFromMemory = (key) => {
  return memoryStore.get(key) || [];
};

const writeToMemory = (key, value) => {
  const existing = memoryStore.get(key) || [];
  existing.push(value);
  memoryStore.set(key, existing);
  return existing;
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket && req.socket.remoteAddress
    ? req.socket.remoteAddress
    : "unknown";
};

const isRateLimited = (req, key) => {
  const ip = getClientIp(req);
  const bucketKey = `${ip}:${key}`;
  const now = Date.now();
  const recent =
    rateLimitStore.get(bucketKey) || [];
  const filtered = recent.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (filtered.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(bucketKey, filtered);
    return true;
  }
  filtered.push(now);
  rateLimitStore.set(bucketKey, filtered);
  return false;
};

const sanitizeKey = (key) => {
  if (!key) {
    return "unknown";
  }
  return String(key).toLowerCase().replace(/[^a-z0-9-_]/g, "_");
};

const getLocalFilePath = (key) => {
  return path.join(localDirPath, `${sanitizeKey(key)}.json`);
};

const readFromFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {};
    }
    return {};
  }
};

const writeToFile = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

const readFromLocal = async (key) => {
  const filePath = getLocalFilePath(key);
  const data = await readFromFile(filePath);
  if (Array.isArray(data)) {
    return data;
  }

  const legacy = await readFromFile(legacyFilePath);
  if (legacy && Array.isArray(legacy[key])) {
    const migrated = legacy[key];
    await writeToFile(filePath, migrated);
    return migrated;
  }

  return [];
};

const writeToLocal = async (key, value) => {
  const filePath = getLocalFilePath(key);
  const data = await readFromFile(filePath);
  const existing = Array.isArray(data) ? data : [];
  existing.push(value);
  await writeToFile(filePath, existing);
  return existing;
};

const readFromKv = async (kv, key) => {
  const items = await kv.lrange(key, 0, -1);
  return Array.isArray(items)
    ? items
        .map((item) => {
          try {
            return JSON.parse(item);
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean)
    : [];
};

const writeToKv = async (kv, key, value) => {
  await kv.rpush(key, JSON.stringify(value));
  return readFromKv(kv, key);
};

const parseJsonBuffer = (buffer) => {
  if (!buffer || buffer.length === 0) {
    return {};
  }

  const hasNulls = buffer.includes(0x00);
  const text = buffer.toString(hasNulls ? "utf16le" : "utf8");
  return JSON.parse(text || "{}");
};

const readRawBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
};

const getPayload = async (req) => {
  const raw = await readRawBody(req);
  if (raw.length) {
    return parseJsonBuffer(raw);
  }

  let body;
  try {
    body = req.body;
  } catch (error) {
    body = undefined;
  }

  if (body && typeof body === "object" && !Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === "string") {
    return JSON.parse(body || "{}");
  }

  if (Buffer.isBuffer(body)) {
    return parseJsonBuffer(body);
  }

  return {};
};

const jsonResponse = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const parseCookieHeader = (cookieHeader) => {
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) {
      return acc;
    }
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
  if (existing) {
    return existing;
  }
  const sessionId = crypto.randomUUID();
  const cookieParts = [
    `comments_sid=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "SameSite=Lax",
    "HttpOnly",
  ];
  if (isProd) {
    cookieParts.push("Secure");
  }
  res.setHeader("Set-Cookie", cookieParts.join("; "));
  return sessionId;
};

const stripSession = (comments) => {
  return Array.isArray(comments)
    ? comments.map(({ sessionId, ...rest }) => rest)
    : [];
};

module.exports = async (req, res) => {
  const kv = getKvClient();
  const isProd = process.env.NODE_ENV === "production";
  const storeKey = (key) => `comments:${key}`;
  const shouldUseKv = Boolean(kv && isProd);

  if (req.method === "GET") {
    const key = req.query.key;
    if (!key) {
      return jsonResponse(res, 400, { error: "Missing key." });
    }

    let data;
    if (shouldUseKv) {
      data = await readFromKv(kv, storeKey(key));
    } else {
      try {
        data = await readFromLocal(storeKey(key));
      } catch (error) {
        data = readFromMemory(storeKey(key));
      }
    }

    return jsonResponse(res, 200, { comments: stripSession(data) });
  }

  if (req.method === "POST") {
    try {
      const payload = await getPayload(req);

      const key = payload.key;
      const name = (payload.name || "Anonymous").trim();
      const comment = (payload.comment || "").trim();
      const honeypot = (payload.website || "").trim();

      if (!key || !comment) {
        return jsonResponse(res, 400, { error: "Missing key or comment." });
      }

      if (honeypot) {
        return jsonResponse(res, 400, { error: "Invalid submission." });
      }

      if (isRateLimited(req, key)) {
        return jsonResponse(res, 429, {
          error: "Too many comments. Please wait a bit.",
        });
      }

      const sessionId = ensureSessionId(req, res, isProd);
      const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: name.slice(0, 60),
        text: comment.slice(0, 500),
        createdAt: new Date().toISOString(),
        sessionId,
      };

      let data;
      if (shouldUseKv) {
        data = await writeToKv(kv, storeKey(key), entry);
      } else {
        try {
          data = await writeToLocal(storeKey(key), entry);
        } catch (error) {
          data = writeToMemory(storeKey(key), entry);
        }
      }

      return jsonResponse(res, 201, {
        comments: stripSession(data),
        createdId: entry.id,
      });
    } catch (error) {
      console.error("POST /api/comments error:", error);
      const message =
        process.env.NODE_ENV === "development"
          ? `Invalid JSON payload: ${error.message}`
          : "Invalid JSON payload.";
      return jsonResponse(res, 400, { error: message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const payload = await getPayload(req);
      const key = payload.key;
      const id = payload.id;

      if (!key || !id) {
        return jsonResponse(res, 400, { error: "Missing key or id." });
      }

      const sessionId = getSessionId(req);
      if (!sessionId) {
        return jsonResponse(res, 401, { error: "Missing session." });
      }

      const loadAll = async () => {
        if (shouldUseKv) {
          return readFromKv(kv, storeKey(key));
        }
        return readFromLocal(storeKey(key));
      };

      const saveAll = async (items) => {
        if (shouldUseKv) {
          await kv.del(storeKey(key));
          if (items.length) {
            await kv.rpush(
              storeKey(key),
              ...items.map((item) => JSON.stringify(item))
            );
          }
          return items;
        }
        const filePath = getLocalFilePath(storeKey(key));
        await writeToFile(filePath, items);
        return items;
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
