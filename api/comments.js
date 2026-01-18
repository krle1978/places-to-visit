export default async function handler(req, res) {
  const BASE = process.env.RENDER_API_BASE_URL;

  if (!BASE) {
    res.status(500).json({ error: "Missing RENDER_API_BASE_URL." });
    return;
  }

  const qs = new URLSearchParams(req.query || {}).toString();
  const url = `${BASE}/api/comments${qs ? `?${qs}` : ""}`;

  const upstream = await fetch(url, {
    method: req.method,
    headers: { "Content-Type": "application/json" },
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : JSON.stringify(req.body || {}),
  });

  const text = await upstream.text();
  res.status(upstream.status);
  res.setHeader(
    "Content-Type",
    upstream.headers.get("content-type") || "application/json"
  );
  res.send(text);
}
