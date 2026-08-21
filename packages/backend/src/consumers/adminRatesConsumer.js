const db = require("../db/initDb");

async function listRates() {
  const result = await db.query(
    "SELECT * FROM rates ORDER BY day_type ASC, players DESC;"
  );
  return result.rows || [];
}

async function createRate(payload) {
  const result = await db.query(
    `INSERT INTO rates (day_type, day_label, day_range, players, price_per_person, currency)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id;`,
    [
      payload.dayType,
      payload.dayLabel ?? null,
      payload.dayRange ?? null,
      payload.players,
      payload.pricePerPerson,
      payload.currency ?? "COP",
    ]
  );
  return { id: result.rows[0]?.id ?? null };
}

async function updateRate(id, payload) {
  const result = await db.query(
    `UPDATE rates
     SET day_type = $1, day_label = $2, day_range = $3, players = $4, price_per_person = $5, currency = $6
     WHERE id = $7;`,
    [
      payload.dayType,
      payload.dayLabel ?? null,
      payload.dayRange ?? null,
      payload.players,
      payload.pricePerPerson,
      payload.currency ?? "COP",
      id,
    ]
  );
  return { changes: result.rowCount };
}

async function deleteRate(id) {
  const result = await db.query("DELETE FROM rates WHERE id = $1;", [id]);
  return { changes: result.rowCount };
}

module.exports = async function initConsumer() {
  return { listRates, createRate, updateRate, deleteRate };
};
