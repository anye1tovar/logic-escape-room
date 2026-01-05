const db = require("../db/initDb");

function listOpeningHours() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM opening_hours ORDER BY day_of_week ASC;", (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function upsertOpeningHour(payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO opening_hours (day_of_week, open_time, close_time, is_open)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(day_of_week) DO UPDATE SET
         open_time = excluded.open_time,
         close_time = excluded.close_time,
         is_open = excluded.is_open;`,
      [payload.dayOfWeek, payload.openTime, payload.closeTime, payload.isOpen],
      function (err) {
        if (err) return reject(err);
        resolve({ ok: true });
      }
    );
  });
}

module.exports = async function initConsumer() {
  return { listOpeningHours, upsertOpeningHour };
};

