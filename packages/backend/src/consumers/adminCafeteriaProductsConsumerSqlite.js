const db = require("../db/initDb");

async function listProducts() {
  const result = await db.query(
    "SELECT * FROM cafeteria_products ORDER BY category ASC, name ASC;"
  );
  return result.rows || [];
}

async function createProduct(payload) {
  const result = await db.query(
    `INSERT INTO cafeteria_products (name, price, description, available, category, image)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id;`,
    [
      payload.name,
      payload.price,
      payload.description ?? null,
      payload.available ?? true,
      payload.category ?? null,
      payload.image ?? null,
    ]
  );
  return { id: result.rows[0]?.id ?? null };
}

async function updateProduct(id, payload) {
  const result = await db.query(
    `UPDATE cafeteria_products
     SET name = $1, price = $2, description = $3, available = $4, category = $5, image = $6
     WHERE id = $7;`,
    [
      payload.name,
      payload.price,
      payload.description ?? null,
      payload.available ?? true,
      payload.category ?? null,
      payload.image ?? null,
      id,
    ]
  );
  return { changes: result.rowCount };
}

async function deleteProduct(id) {
  const result = await db.query(
    "DELETE FROM cafeteria_products WHERE id = $1;",
    [id]
  );
  return { changes: result.rowCount };
}

module.exports = async function initConsumer() {
  return { listProducts, createProduct, updateProduct, deleteProduct };
};
