const db = require("../db/initDb");

async function listHolidays() {
  const result = await db.query(
    "SELECT holiday_date, name FROM colombian_holidays ORDER BY holiday_date ASC;"
  );
  return result.rows || [];
}

async function createHoliday(payload) {
  await db.query(
    "INSERT INTO colombian_holidays (holiday_date, name) VALUES ($1, $2);",
    [payload.date, payload.name ?? null]
  );
  return { ok: true };
}

async function deleteHoliday(date) {
  const result = await db.query(
    "DELETE FROM colombian_holidays WHERE holiday_date = $1;",
    [date]
  );
  return { changes: result.rowCount };
}

module.exports = async function initConsumer() {
  return { listHolidays, createHoliday, deleteHoliday };
};
