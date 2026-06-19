const db = require("../db/initDb");

async function listProducts() {
  const result = await db.query(
    `
      SELECT
        product.name,
        product.price,
        product.description,
        product.available,
        COALESCE(category.name, product.category) AS category,
        product.image,
        category.image AS "categoryImage",
        category.sort_order AS "categorySortOrder"
      FROM cafeteria_products product
      LEFT JOIN cafeteria_categories category ON category.id = product.category_id
      WHERE COALESCE(category.active, TRUE) = TRUE
      ORDER BY
        category.sort_order ASC NULLS LAST,
        COALESCE(category.name, product.category, '') ASC,
        product.name ASC;
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
