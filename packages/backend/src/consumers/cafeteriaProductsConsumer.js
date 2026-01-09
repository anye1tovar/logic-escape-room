const db = require("../db/initDb");

async function listProducts() {
  const result = await db.query(
    `
      SELECT
        name,
        price,
        description,
        available,
        category,
        image
      FROM cafeteria_products
      ORDER BY category ASC, name ASC;
    `
  );
  return (result.rows || []).map((row) => ({
    ...row,
    available: Boolean(row.available),
  }));
}

module.exports = async function initCafeteriaProductsConsumer() {
  return { listProducts };
};
