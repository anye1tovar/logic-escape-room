const db = require("../db/initDb");

function listRates(dayType) {
  return new Promise((resolve, reject) => {
    const params = [];
    let query = "SELECT * FROM rates";

    if (dayType) {
      query += " WHERE day_type = ?";
      params.push(dayType);
    }

    query += " ORDER BY day_type ASC, players DESC";

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

module.exports = async function initRatesConsumer() {
  return { listRates };
};
