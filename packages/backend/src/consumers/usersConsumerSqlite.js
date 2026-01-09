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

module.exports = async function initConsumer() {
  return {
    getUserByEmail,
    getUserById,
    listUsers,
  };
};
