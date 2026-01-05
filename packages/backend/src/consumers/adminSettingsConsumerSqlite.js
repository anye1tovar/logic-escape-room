const db = require("../db/initDb");

function listSettings() {
  return new Promise((resolve, reject) => {
    db.all("SELECT key, value FROM settings ORDER BY key ASC;", (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function setSetting(payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO settings (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [payload.key, payload.value],
      function (err) {
        if (err) return reject(err);
        resolve({ ok: true });
      }
    );
  });
}

function deleteSetting(key) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM settings WHERE key = ?;", [key], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = async function initConsumer() {
  return { listSettings, setSetting, deleteSetting };
};

