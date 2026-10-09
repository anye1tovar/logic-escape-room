const db = require("../db/initDb");

async function getOpeningHoursByDayOfWeek(dayOfWeek) {
  const result = await db.query(
    "SELECT * FROM opening_hours WHERE day_of_week = $1 LIMIT 1;",
    [dayOfWeek]
  );
  return result.rows[0] || null;
}

async function listOpeningHours() {
  const result = await db.query(
    "SELECT * FROM opening_hours ORDER BY day_of_week ASC;"
  );
  return result.rows || [];
}

module.exports = async function initOpeningHoursConsumer() {
  return { getOpeningHoursByDayOfWeek, listOpeningHours };
};
