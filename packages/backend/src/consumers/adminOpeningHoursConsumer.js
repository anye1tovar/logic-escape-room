const db = require("../db/initDb");

async function listOpeningHours() {
  const result = await db.query(
    "SELECT * FROM opening_hours ORDER BY day_of_week ASC;"
  );
  return result.rows || [];
}

async function upsertOpeningHour(payload) {
  await db.query(
    `INSERT INTO opening_hours (day_of_week, open_time, close_time, is_open, requires_advance_booking)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(day_of_week) DO UPDATE SET
       open_time = excluded.open_time,
       close_time = excluded.close_time,
       is_open = excluded.is_open,
       requires_advance_booking = excluded.requires_advance_booking;`,
    [
      payload.dayOfWeek,
      payload.openTime,
      payload.closeTime,
      payload.isOpen,
      payload.requiresAdvanceBooking,
    ]
  );
  return { ok: true };
}

module.exports = async function initConsumer() {
  return { listOpeningHours, upsertOpeningHour };
};
