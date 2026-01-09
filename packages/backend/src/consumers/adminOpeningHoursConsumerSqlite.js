const db = require("../db/initDb");

async function listOpeningHours() {
  const result = await db.query(
    "SELECT * FROM opening_hours ORDER BY day_of_week ASC;"
  );
  return result.rows || [];
}

async function upsertOpeningHour(payload) {
  await db.query(
    `INSERT INTO opening_hours (day_of_week, open_time, close_time, is_open)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(day_of_week) DO UPDATE SET
       open_time = excluded.open_time,
       close_time = excluded.close_time,
       is_open = excluded.is_open;`,
    [payload.dayOfWeek, payload.openTime, payload.closeTime, payload.isOpen]
  );
  return { ok: true };
}

module.exports = async function initConsumer() {
  return { listOpeningHours, upsertOpeningHour };
};
