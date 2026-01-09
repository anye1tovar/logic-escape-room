const db = require("../db/initDb");

async function isHoliday(dateString) {
  const result = await db.query(
    "SELECT 1 AS ok FROM colombian_holidays WHERE holiday_date = $1 LIMIT 1;",
    [dateString]
  );
  return Boolean(result.rows[0]);
}

module.exports = async function initColombianHolidaysConsumer() {
  return { isHoliday };
};
