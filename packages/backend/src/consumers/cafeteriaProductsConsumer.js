const db = require("../db/initDb");

function listProducts() {
  return new Promise((resolve, reject) => {
    db.all(
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
      `,
      (err, rows) => {
        if (err) return reject(err);
        resolve(
          (rows || []).map((row) => ({
            ...row,
            available: row.available === 1,
          }))
        );
      }
    );
  });
}

module.exports = async function initCafeteriaProductsConsumer() {
  return { listProducts };
};

