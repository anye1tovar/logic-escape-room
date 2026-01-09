const db = require("../db/initDb");

function normalizeEmail(email) {
  const raw = String(email || "").trim().toLowerCase();
  return raw || null;
}

async function getUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const result = await db.query(
    "SELECT * FROM users WHERE email = $1 LIMIT 1;",
    [normalized]
  );
  return result.rows[0] || null;
}

async function getUserById(id) {
  const result = await db.query(
    "SELECT * FROM users WHERE id = $1 LIMIT 1;",
    [id]
  );
  return result.rows[0] || null;
}

async function listUsers() {
  const result = await db.query(
    "SELECT id, email, name, role, active, created_at FROM users ORDER BY id DESC;"
  );
  return result.rows || [];
}

async function createUser(payload) {
  const result = await db.query(
    `INSERT INTO users (email, password_hash, password_salt, name, role, active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, name, role, active, created_at;`,
    [
      payload.email,
      payload.passwordHash,
      payload.passwordSalt,
      payload.name ?? null,
      payload.role,
      payload.active ?? true,
      payload.createdAt,
    ]
  );
  return result.rows[0] || null;
}

async function updateUser(id, payload) {
  const result = await db.query(
    `UPDATE users
     SET name = $1, role = $2, active = $3
     WHERE id = $4
     RETURNING id, email, name, role, active, created_at;`,
    [payload.name ?? null, payload.role, payload.active ?? true, id]
  );
  return result.rows[0] || null;
}

async function updatePassword(id, payload) {
  const result = await db.query(
    `UPDATE users
     SET password_hash = $1, password_salt = $2
     WHERE id = $3;`,
    [payload.passwordHash, payload.passwordSalt, id]
  );
  return { changes: result.rowCount };
}

module.exports = async function initConsumer() {
  return {
    getUserByEmail,
    getUserById,
    listUsers,
    createUser,
    updateUser,
    updatePassword,
  };
};
