const { verifyPassword } = require("../utils/password");
const { createToken } = require("../utils/token");

function normalizeEmail(email) {
  const raw = String(email || "").trim().toLowerCase();
  return raw || null;
}

function buildAuthService(usersConsumer, opts) {
  async function login({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const passwordString = String(password || "");

    if (!normalizedEmail || !passwordString.trim()) {
      const err = new Error("Email and password are required");
      err.status = 400;
      throw err;
    }

    const user = await usersConsumer.getUserByEmail(normalizedEmail);
    if (!user) {
      const err = new Error("Invalid credentials");
      err.status = 401;
      throw err;
    }

    const isActive = user.active === 1 || user.active === true || user.active === "1";
    if (!isActive) {
      const err = new Error("User is disabled");
      err.status = 403;
      throw err;
    }

    const ok = verifyPassword(passwordString, {
      salt: user.password_salt,
      hash: user.password_hash,
    });

    if (!ok) {
      const err = new Error("Invalid credentials");
      err.status = 401;
      throw err;
    }

    const publicUser = {
      id: user.id,
      email: user.email,
      name: user.name || null,
      role: user.role || "admin",
    };

    const token = createToken(
      { sub: String(user.id), email: user.email, role: publicUser.role },
      { secret: opts?.secret, ttlSeconds: opts?.tokenTtlSeconds }
    );

    return { user: publicUser, token };
  }

  return {
    login,
  };
}

module.exports = buildAuthService;

