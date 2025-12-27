const db = require("../db/initDb");

function isHoliday(dateString) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT 1 AS ok FROM colombian_holidays WHERE holiday_date = ? LIMIT 1;",
      [dateString],
      (err, row) => {
        if (err) return reject(err);
        resolve(Boolean(row));
      }
    );
  });
}

module.exports = async function initColombianHolidaysConsumer() {
  return { isHoliday };
};

