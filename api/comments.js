export default async function handler(req, res) {
  const base = process.env.RENDER_API_BASE_URL;
  if (!base) {
    return res.status(500).json({ error: "Missing RENDER_API_BASE_URL" });
  }

  const qs = new URLSearchParams(req.query || {}).toString();
  const url = `${base}/api/comments${qs ? `?${qs}` : ""}`;

  try {
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
    res.setHeader("Cache-Control", "no-store");
    return res.send(text);
  } catch (e) {
    console.error("Proxy error:", e);
    return res.status(502).json({ error: "Upstream unavailable" });
  }
}
