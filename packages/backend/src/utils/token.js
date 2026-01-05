const crypto = require("crypto");

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

function createToken(payload, options) {
  const header = { alg: "HS256", typ: "JWT" };
  const issuedAt = Math.floor(Date.now() / 1000);
  const ttlSeconds = Number(options?.ttlSeconds || 0);
  const exp = ttlSeconds > 0 ? issuedAt + ttlSeconds : undefined;

  const body = {
    ...payload,
    iat: issuedAt,
    ...(exp ? { exp } : {}),
  };

  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(body));
  const signature = signHmacSha256(options?.secret, `${headerPart}.${payloadPart}`);
  return `${headerPart}.${payloadPart}.${signature}`;
}

module.exports = {
  createToken,
};

