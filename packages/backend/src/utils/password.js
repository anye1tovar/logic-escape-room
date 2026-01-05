const crypto = require("crypto");

const PBKDF2_ITERATIONS = 120_000;
const KEYLEN = 32;
const DIGEST = "sha256";

function hashPassword(password, saltBase64) {
  const passwordString = String(password || "");
  if (!passwordString) {
    const err = new Error("Password is required");
    err.status = 400;
    throw err;
  }

  const salt =
    saltBase64 ||
    crypto.randomBytes(16).toString("base64");

  const derived = crypto.pbkdf2Sync(
    passwordString,
    Buffer.from(salt, "base64"),
    PBKDF2_ITERATIONS,
    KEYLEN,
    DIGEST
  );

  return {
    salt,
    hash: derived.toString("base64"),
    algo: `pbkdf2_${DIGEST}`,
    iterations: PBKDF2_ITERATIONS,
  };
}

function safeEqualBase64(a, b) {
  const aBuf = Buffer.from(String(a || ""), "base64");
  const bBuf = Buffer.from(String(b || ""), "base64");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyPassword(password, { salt, hash }) {
  if (!salt || !hash) return false;
  const { hash: computed } = hashPassword(password, salt);
  return safeEqualBase64(computed, hash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};

