const db = require("../db/initDb");

function getOpeningHoursByDayOfWeek(dayOfWeek) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM opening_hours WHERE day_of_week = ? LIMIT 1;",
      [dayOfWeek],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

module.exports = async function initOpeningHoursConsumer() {
  return { getOpeningHoursByDayOfWeek };
};

