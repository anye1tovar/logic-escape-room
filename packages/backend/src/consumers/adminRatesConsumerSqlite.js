const db = require("../db/initDb");

function listRates() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM rates ORDER BY day_type ASC, players DESC;", (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function createRate(payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO rates (day_type, day_label, day_range, players, price_per_person, currency)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        payload.dayType,
        payload.dayLabel ?? null,
        payload.dayRange ?? null,
        payload.players,
        payload.pricePerPerson,
        payload.currency ?? "COP",
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
}

function updateRate(id, payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE rates
       SET day_type = ?, day_label = ?, day_range = ?, players = ?, price_per_person = ?, currency = ?
       WHERE id = ?;`,
      [
        payload.dayType,
        payload.dayLabel ?? null,
        payload.dayRange ?? null,
        payload.players,
        payload.pricePerPerson,
        payload.currency ?? "COP",
        id,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

function deleteRate(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM rates WHERE id = ?;", [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = async function initConsumer() {
  return { listRates, createRate, updateRate, deleteRate };
};

