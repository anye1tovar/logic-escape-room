const db = require("../db/initDb");

function normalizeEmail(email) {
  const raw = String(email || "").trim().toLowerCase();
  return raw || null;
}

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return resolve(null);
    db.get(
      "SELECT * FROM users WHERE email = ? LIMIT 1;",
      [normalized],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE id = ? LIMIT 1;", [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function listUsers() {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id, email, name, role, active, created_at FROM users ORDER BY id DESC;",
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

module.exports = async function initConsumer() {
  return {
    getUserByEmail,
    getUserById,
    listUsers,
  };
};

