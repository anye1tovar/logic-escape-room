const db = require("../db/initDb");

async function listRates(dayType) {
  const params = [];
  let query = "SELECT * FROM rates";

  if (dayType) {
    query += " WHERE day_type = $1";
    params.push(dayType);
  }

  query += " ORDER BY day_type ASC, players DESC";

  const result = await db.query(query, params);
  return result.rows || [];
}

module.exports = async function initRatesConsumer() {
  return { listRates };
};
