const db = require("../db/initDb");

async function listProducts() {
  const result = await db.query(
    `
      SELECT
        product.name,
        product.price,
        product.description,
        product.available,
        product.track_inventory,
        recipe_stock.controlled_count,
        recipe_stock.max_quantity AS recipe_max_quantity,
        CASE
          WHEN product.track_expiration = TRUE THEN COALESCE((
            SELECT SUM(batch.current_quantity)
            FROM inventory_batches batch
            WHERE batch.product_id = product.id
              AND batch.status = 'ACTIVE'
              AND batch.expiration_date >= CURRENT_DATE::TEXT
          ), 0)
          ELSE COALESCE((
            SELECT SUM(movement.quantity_delta)
            FROM inventory_movements movement
            WHERE movement.product_id = product.id
          ), 0)
        END AS sellable_stock,
        COALESCE(category.name, product.category) AS category,
        product.image,
        category.image AS "categoryImage",
        category.sort_order AS "categorySortOrder"
      FROM cafeteria_products product
      LEFT JOIN cafeteria_categories category ON category.id = product.category_id
      LEFT JOIN LATERAL (
        SELECT id FROM product_recipes WHERE product_id = product.id AND active = TRUE LIMIT 1
      ) active_recipe ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE requirement.track_inventory = TRUE)::INTEGER AS controlled_count,
          FLOOR(MIN(requirement.available_stock / NULLIF(requirement.required_quantity, 0))
            FILTER (WHERE requirement.track_inventory = TRUE)) AS max_quantity
        FROM (
          SELECT supply.track_inventory,
            item.quantity * (1 + item.waste_percent / 100) AS required_quantity,
            CASE WHEN supply.track_expiration = TRUE THEN COALESCE((
              SELECT SUM(batch.current_quantity) FROM supply_batches batch
              WHERE batch.supply_id = supply.id AND batch.status = 'ACTIVE' AND batch.current_quantity > 0
                AND (batch.expiration_date IS NULL OR batch.expiration_date >= CURRENT_DATE::TEXT)
            ), 0) ELSE COALESCE((SELECT SUM(m.quantity_delta) FROM supply_inventory_movements m WHERE m.supply_id = supply.id), 0) END AS available_stock
          FROM product_recipe_items item JOIN inventory_supplies supply ON supply.id = item.supply_id
          WHERE item.recipe_id = active_recipe.id
          UNION ALL
          SELECT component.track_inventory,
            item.quantity * (1 + item.waste_percent / 100),
            CASE WHEN component.track_expiration = TRUE THEN COALESCE((
              SELECT SUM(batch.current_quantity) FROM inventory_batches batch
              WHERE batch.product_id = component.id AND batch.status = 'ACTIVE' AND batch.current_quantity > 0
                AND batch.expiration_date >= CURRENT_DATE::TEXT
            ), 0) ELSE COALESCE((SELECT SUM(m.quantity_delta) FROM inventory_movements m WHERE m.product_id = component.id), 0) END
          FROM product_recipe_items item JOIN cafeteria_products component ON component.id = item.product_id
          WHERE item.recipe_id = active_recipe.id
        ) requirement
      ) recipe_stock ON active_recipe.id IS NOT NULL
      WHERE COALESCE(category.active, TRUE) = TRUE
        AND product.product_type <> 'INTERNAL'
      ORDER BY
        category.sort_order ASC NULLS LAST,
        COALESCE(category.name, product.category, '') ASC,
        product.name ASC;
    `,
  );
  return (result.rows || []).map((row) => {
    const tracksInventory = Boolean(row.track_inventory);
    const hasStock = Number(row.sellable_stock || 0) > 0;
    const { track_inventory, sellable_stock, controlled_count, recipe_max_quantity, ...product } = row;
    return {
      ...product,
      available: Boolean(row.available) && (!tracksInventory || hasStock) &&
        (Number(row.controlled_count || 0) === 0 || Number(row.recipe_max_quantity || 0) > 0),
    };
  });
}

async function listPromotions() {
  const result = await db.query(`
    SELECT
      promotion.id,
      promotion.name,
      promotion.description,
      promotion.promotional_price AS "promotionalPrice",
      promotion.starts_at AS "startsAt",
      promotion.ends_at AS "endsAt",
      promotion.days_of_week AS "daysOfWeek",
      promotion.starts_time AS "startsTime",
      promotion.ends_time AS "endsTime",
      COALESCE(SUM(item.quantity * product.price), 0)::INTEGER AS "originalPrice",
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'name', product.name,
            'image', product.image,
            'quantity', item.quantity
          ) ORDER BY product.name
        ) FILTER (WHERE product.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM cafeteria_promotions promotion
    JOIN cafeteria_promotion_items item ON item.promotion_id = promotion.id
    JOIN cafeteria_products product ON product.id = item.product_id
    WHERE promotion.active = TRUE
    GROUP BY promotion.id
    HAVING COUNT(product.id) > 0
      AND BOOL_AND(product.available = TRUE)
    ORDER BY promotion.sort_order ASC, promotion.name ASC;
  `);
  return result.rows || [];
}

module.exports = async function initCafeteriaProductsConsumer() {
  return { listProducts, listPromotions };
};
