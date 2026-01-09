const { hashPassword } = require("../utils/password");

const VALID_ROLES = new Set(["admin", "game_master"]);

function normalizeEmail(email) {
  const raw = String(email || "").trim().toLowerCase();
  return raw || null;
}

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  return value || null;
}

function parseActive(input, fallback) {
  if (input == null) return fallback;
  const value = String(input).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(value)) return true;
  if (["0", "false", "no", "n"].includes(value)) return false;
  return fallback;
}

function normalizeName(input, fallback) {
  if (input == null) return fallback;
  const value = String(input).trim();
  return value ? value : null;
}

function validateRole(role) {
  if (!role || !VALID_ROLES.has(role)) {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }
}

function buildAdminUsersService(consumer) {
  async function listUsers() {
    return consumer.listUsers();
  }

  async function createUser(input) {
    const email = normalizeEmail(input?.email);
    const password = String(input?.password || "");
    const role = normalizeRole(input?.role) || "admin";

    if (!email) {
      const err = new Error("Email is required");
      err.status = 400;
      throw err;
    }

    if (!password.trim()) {
      const err = new Error("Password is required");
      err.status = 400;
      throw err;
    }

    validateRole(role);

    const existing = await consumer.getUserByEmail(email);
    if (existing) {
      const err = new Error("Email already exists");
      err.status = 409;
      throw err;
    }

    const { hash, salt } = hashPassword(password);
    const createdAt = Date.now();
    const active = parseActive(input?.active, true);
    const name = normalizeName(input?.name, null);

    return consumer.createUser({
      email,
      passwordHash: hash,
      passwordSalt: salt,
      name,
      role,
      active,
      createdAt,
    });
  }

  async function updateUser(id, input) {
    const user = await consumer.getUserById(id);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const role = input?.role != null ? normalizeRole(input.role) : user.role;
    if (input?.role != null) validateRole(role);

    const active =
      input?.active != null
        ? parseActive(input.active, true)
        : user.active === 1 || user.active === true || user.active === "1";

    const name = normalizeName(input?.name, user.name ?? null);

    return consumer.updateUser(id, { name, role, active });
  }

  async function resetPassword(id, input) {
    const user = await consumer.getUserById(id);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const password = String(input?.password || "");
    if (!password.trim()) {
      const err = new Error("Password is required");
      err.status = 400;
      throw err;
    }

    const { hash, salt } = hashPassword(password);
    return consumer.updatePassword(id, { passwordHash: hash, passwordSalt: salt });
  }

  return {
    listUsers,
    createUser,
    updateUser,
    resetPassword,
  };
}

module.exports = buildAdminUsersService;
