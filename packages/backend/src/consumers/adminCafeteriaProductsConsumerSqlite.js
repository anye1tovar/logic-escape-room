const db = require("../db/initDb");

function listProducts() {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM cafeteria_products ORDER BY category ASC, name ASC;",
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

function createProduct(payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO cafeteria_products (name, price, description, available, category, image)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        payload.name,
        payload.price,
        payload.description ?? null,
        payload.available ?? 1,
        payload.category ?? null,
        payload.image ?? null,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
}

function updateProduct(id, payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE cafeteria_products
       SET name = ?, price = ?, description = ?, available = ?, category = ?, image = ?
       WHERE id = ?;`,
      [
        payload.name,
        payload.price,
        payload.description ?? null,
        payload.available ?? 1,
        payload.category ?? null,
        payload.image ?? null,
        id,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

function deleteProduct(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM cafeteria_products WHERE id = ?;", [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = async function initConsumer() {
  return { listProducts, createProduct, updateProduct, deleteProduct };
};
