const db = require("../db/initDb");

function listHolidays() {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT holiday_date, name FROM colombian_holidays ORDER BY holiday_date ASC;",
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

function createHoliday(payload) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO colombian_holidays (holiday_date, name) VALUES (?, ?);",
      [payload.date, payload.name ?? null],
      function (err) {
        if (err) return reject(err);
        resolve({ ok: true });
      }
    );
  });
}

function deleteHoliday(date) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM colombian_holidays WHERE holiday_date = ?;",
      [date],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

module.exports = async function initConsumer() {
  return { listHolidays, createHoliday, deleteHoliday };
};

