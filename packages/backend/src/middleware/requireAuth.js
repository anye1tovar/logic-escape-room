const crypto = require("crypto");

function base64UrlDecode(input) {
  const normalized = String(input || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf8");
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signHmacSha256(secret, data) {
  return crypto
    .createHmac("sha256", String(secret || ""))
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function verifyToken(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;
  const expected = signHmacSha256(secret, `${headerPart}.${payloadPart}`);
  if (expected !== signaturePart) return null;

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload && typeof payload.exp === "number" && now >= payload.exp) return null;
  return payload;
}

function requireAuth(config, options) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
    const token = match?.[1] || "";

    const payload = verifyToken(token, config?.secret);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });

    if (Array.isArray(options?.roles) && options.roles.length > 0) {
      const role = String(payload.role || "").toLowerCase();
      const allowed = options.roles.map((r) => String(r).toLowerCase());
      if (!allowed.includes(role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    req.user = payload;
    next();
  };
}

module.exports = requireAuth;
module.exports.verifyToken = verifyToken;
