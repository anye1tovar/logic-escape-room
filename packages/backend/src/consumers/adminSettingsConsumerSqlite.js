const db = require("../db/initDb");

async function listSettings() {
  const result = await db.query(
    "SELECT key, value FROM settings ORDER BY key ASC;"
  );
  return result.rows || [];
}

async function setSetting(payload) {
  await db.query(
    `INSERT INTO settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [payload.key, payload.value]
  );
  return { ok: true };
}

async function deleteSetting(key) {
  const result = await db.query("DELETE FROM settings WHERE key = $1;", [key]);
  return { changes: result.rowCount };
}

module.exports = async function initConsumer() {
  return { listSettings, setSetting, deleteSetting };
};
