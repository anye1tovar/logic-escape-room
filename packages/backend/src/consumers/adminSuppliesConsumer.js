const db = require("../db/initDb");

async function listSupplies() {
  const result = await db.query(
    `
      SELECT
        supply.*,
        COALESCE((
          SELECT SUM(movement.quantity_delta)
          FROM supply_inventory_movements movement
          WHERE movement.supply_id = supply.id
        ), 0)::NUMERIC(14, 3) AS current_stock,
        EXISTS (
          SELECT 1
          FROM supply_inventory_movements movement
          WHERE movement.supply_id = supply.id
        ) OR EXISTS (
          SELECT 1
          FROM product_recipe_items recipe_item
          WHERE recipe_item.supply_id = supply.id
        ) OR EXISTS (
          SELECT 1
          FROM supply_purchase_items purchase_item
          WHERE purchase_item.supply_id = supply.id
        ) AS has_movements
      FROM inventory_supplies supply
      ORDER BY active DESC, COALESCE(category, '') ASC, lower(name) ASC;
    `,
  );
  return result.rows || [];
}

async function listCategories() {
  const result = await db.query(
    `
      SELECT DISTINCT trim(category) AS name
      FROM inventory_supplies
      WHERE category IS NOT NULL
        AND trim(category) <> ''
      ORDER BY trim(category) ASC;
    `,
  );
  return result.rows || [];
}

async function createSupply(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `
        INSERT INTO inventory_supplies (
          name,
          category,
          purchase_unit,
          consumption_unit,
          conversion_factor,
          track_inventory,
          track_expiration,
          minimum_stock,
          active,
          created_at,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10)
        RETURNING *;
      `,
      [
        payload.name,
        payload.category,
        payload.purchaseUnit,
        payload.consumptionUnit,
        payload.conversionFactor,
        payload.trackInventory,
        payload.trackExpiration,
        payload.minimumStock,
        payload.createdAt,
        payload.createdBy,
      ],
    );
    const supply = result.rows[0];
    if (payload.trackInventory && payload.initialStock > 0) {
      await client.query(
        `
          INSERT INTO supply_inventory_movements (
            supply_id,
            type,
            quantity_delta,
            occurred_at,
            source_type,
            source_id,
            reason,
            created_by,
            created_at
          )
          VALUES ($1, 'INITIAL_STOCK', $2, $3, 'INVENTORY_SUPPLY', $4, 'Stock inicial', $5, $6);
        `,
        [
          supply.id,
          payload.initialStock,
          payload.createdAt,
          String(supply.id),
          payload.createdBy,
          payload.createdAt,
        ],
      );
    }
    await client.query("COMMIT");
    return supply;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateSupply(id, payload) {
  const result = await db.query(
    `
      UPDATE inventory_supplies
      SET
        name = $1,
        category = $2,
        purchase_unit = $3,
        consumption_unit = $4,
        conversion_factor = $5,
        track_inventory = $6,
        track_expiration = $7,
        minimum_stock = $8,
        active = $9
      WHERE id = $10
      RETURNING *;
    `,
    [
      payload.name,
      payload.category,
      payload.purchaseUnit,
      payload.consumptionUnit,
      payload.conversionFactor,
      payload.trackInventory,
      payload.trackExpiration,
      payload.minimumStock,
      payload.active,
      id,
    ],
  );
  return result.rows[0] || null;
}

async function deactivateOrDeleteSupply(id) {
  const countResult = await db.query(
    `
      SELECT (
        EXISTS (
          SELECT 1 FROM supply_inventory_movements WHERE supply_id = $1
        ) OR EXISTS (
          SELECT 1 FROM product_recipe_items WHERE supply_id = $1
        ) OR EXISTS (
          SELECT 1 FROM supply_purchase_items WHERE supply_id = $1
        )
      ) AS has_history;
    `,
    [id],
  );
  const hasMovements = countResult.rows[0]?.has_history === true;
  if (hasMovements) {
    const result = await db.query(
      `
        UPDATE inventory_supplies
        SET active = FALSE
        WHERE id = $1
        RETURNING *;
      `,
      [id],
    );
    return { row: result.rows[0] || null, deactivated: true };
  }

  const result = await db.query(
    "DELETE FROM inventory_supplies WHERE id = $1 RETURNING *;",
    [id],
  );
  return { row: result.rows[0] || null, deactivated: false };
}

module.exports = async function initConsumer() {
  return {
    listSupplies,
    listCategories,
    createSupply,
    updateSupply,
    deactivateOrDeleteSupply,
  };
};
