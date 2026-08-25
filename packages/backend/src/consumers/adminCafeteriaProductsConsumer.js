const db = require("../db/initDb");

async function listProducts() {
  const result = await db.query(
    `
      SELECT
        product.*,
        category.name AS category_name,
        category.image AS category_image,
        category.sort_order AS category_sort_order,
        category.active AS category_active,
        COALESCE(category.name, product.category) AS category
      FROM cafeteria_products product
      LEFT JOIN cafeteria_categories category ON category.id = product.category_id
      ORDER BY
        category.sort_order ASC NULLS LAST,
        COALESCE(category.name, product.category, '') ASC,
        product.name ASC;
    `,
  );
  return result.rows || [];
}

async function createProduct(payload) {
  const result = await db.query(
    `INSERT INTO cafeteria_products (name, price, description, available, category, image, category_id)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       COALESCE((SELECT name FROM cafeteria_categories WHERE id = $7), $5),
       $6,
       $7
     )
     RETURNING id;`,
    [
      payload.name,
      payload.price,
      payload.description ?? null,
      payload.available ?? true,
      payload.category ?? null,
      payload.image ?? null,
      payload.categoryId ?? null,
    ],
  );
  return { id: result.rows[0]?.id ?? null };
}

async function updateProduct(id, payload) {
  const result = await db.query(
    `UPDATE cafeteria_products
     SET
       name = $1,
       price = $2,
       description = $3,
       available = $4,
       category = COALESCE((SELECT name FROM cafeteria_categories WHERE id = $7), $5),
       image = $6,
       category_id = $7
     WHERE id = $8;`,
    [
      payload.name,
      payload.price,
      payload.description ?? null,
      payload.available ?? true,
      payload.category ?? null,
      payload.image ?? null,
      payload.categoryId ?? null,
      id,
    ],
  );
  return { changes: result.rowCount };
}

async function deleteProduct(id) {
  const result = await db.query(
    "DELETE FROM cafeteria_products WHERE id = $1;",
    [id],
  );
  return { changes: result.rowCount };
}

async function listCategories() {
  const result = await db.query(
    `SELECT id, name, slug, image, sort_order, active
     FROM cafeteria_categories
     ORDER BY sort_order ASC, name ASC;`,
  );
  return result.rows || [];
}

async function createCategory(payload) {
  const result = await db.query(
    `INSERT INTO cafeteria_categories (name, slug, image, sort_order, active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id;`,
    [
      payload.name,
      payload.slug,
      payload.image ?? null,
      payload.sortOrder ?? 0,
      payload.active ?? true,
    ],
  );
  return { id: result.rows[0]?.id ?? null };
}

async function updateCategory(id, payload) {
  const result = await db.query(
    `UPDATE cafeteria_categories
     SET name = $1, slug = $2, image = $3, sort_order = $4, active = $5
     WHERE id = $6;`,
    [
      payload.name,
      payload.slug,
      payload.image ?? null,
      payload.sortOrder ?? 0,
      payload.active ?? true,
      id,
    ],
  );
  if (result.rowCount) {
    await db.query(
      `UPDATE cafeteria_products
       SET category = $1
       WHERE category_id = $2;`,
      [payload.name, id],
    );
  }
  return { changes: result.rowCount };
}

async function deleteCategory(id) {
  await db.query(
    `UPDATE cafeteria_products
     SET category_id = NULL, category = NULL
     WHERE category_id = $1;`,
    [id],
  );
  const result = await db.query(
    "DELETE FROM cafeteria_categories WHERE id = $1;",
    [id],
  );
  return { changes: result.rowCount };
}

async function listPromotions() {
  const result = await db.query(`
    SELECT promotion.id, promotion.name, promotion.description,
      promotion.promotional_price AS "promotionalPrice", promotion.active,
      promotion.starts_at AS "startsAt", promotion.ends_at AS "endsAt",
      promotion.days_of_week AS "daysOfWeek", promotion.starts_time AS "startsTime",
      promotion.ends_time AS "endsTime",
      COALESCE(SUM(item.quantity * product.price), 0)::INTEGER AS "originalPrice",
      COALESCE(JSON_AGG(JSON_BUILD_OBJECT('productId', product.id, 'name', product.name, 'quantity', item.quantity)
        ORDER BY product.name) FILTER (WHERE product.id IS NOT NULL), '[]'::json) AS items
    FROM cafeteria_promotions promotion
    LEFT JOIN cafeteria_promotion_items item ON item.promotion_id = promotion.id
    LEFT JOIN cafeteria_products product ON product.id = item.product_id
    GROUP BY promotion.id
    ORDER BY promotion.sort_order ASC, promotion.name ASC;
  `);
  return result.rows || [];
}

async function createPromotion(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO cafeteria_promotions (name, description, promotional_price, active, starts_at, ends_at, days_of_week, starts_time, ends_time, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id;`,
      [
        payload.name,
        payload.description ?? null,
        payload.promotionalPrice,
        payload.active ?? true,
        payload.startsAt ?? null,
        payload.endsAt ?? null,
        payload.daysOfWeek ?? [],
        payload.startsTime ?? null,
        payload.endsTime ?? null,
        payload.sortOrder ?? 0,
      ],
    );
    for (const item of payload.items) {
      await client.query(
        `INSERT INTO cafeteria_promotion_items (promotion_id, product_id, quantity) VALUES ($1, $2, $3);`,
        [result.rows[0].id, item.productId, item.quantity],
      );
    }
    await client.query("COMMIT");
    return { id: result.rows[0]?.id ?? null };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function deletePromotion(id) {
  const result = await db.query(
    "DELETE FROM cafeteria_promotions WHERE id = $1;",
    [id],
  );
  return { changes: result.rowCount };
}

module.exports = async function initConsumer() {
  return {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    listPromotions,
    createPromotion,
    deletePromotion,
  };
};
