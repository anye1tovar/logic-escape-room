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
        ) AS has_movements,
        EXISTS (SELECT 1 FROM product_recipe_items item WHERE item.supply_id = supply.id) AS has_recipe_usage,
        EXISTS (SELECT 1 FROM supply_purchase_items item WHERE item.supply_id = supply.id) AS has_purchase_history,
        EXISTS (SELECT 1 FROM order_item_cost_components item WHERE item.supply_id = supply.id) AS has_cost_history
      FROM inventory_supplies supply
      ORDER BY lower(name) ASC;
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

async function getSupplyStock(id) {
  const result = await db.query(
    `
      SELECT supply.*, COALESCE(SUM(movement.quantity_delta), 0)::NUMERIC(14, 3) AS current_stock
      FROM inventory_supplies supply
      LEFT JOIN supply_inventory_movements movement ON movement.supply_id = supply.id
      WHERE supply.id = $1
      GROUP BY supply.id;
    `,
    [id],
  );
  return result.rows[0] || null;
}

async function listInventoryMovements(supplyId) {
  const result = await db.query(
    `
      SELECT movement.*, batch.expiration_date, batch.lot_number, creator.name AS created_by_name
      FROM supply_inventory_movements movement
      LEFT JOIN supply_batches batch ON batch.id = movement.supply_batch_id
      LEFT JOIN users creator ON creator.id = movement.created_by
      WHERE movement.supply_id = $1
      ORDER BY movement.occurred_at DESC, movement.id DESC
      LIMIT 100;
    `,
    [supplyId],
  );
  return result.rows || [];
}

async function createInventoryMovement(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const supplyResult = await client.query(
      `SELECT id, track_inventory, track_expiration
       FROM inventory_supplies WHERE id = $1 FOR UPDATE;`,
      [payload.supplyId],
    );
    const supply = supplyResult.rows[0];
    if (!supply) {
      const err = new Error("Supply not found");
      err.status = 404;
      throw err;
    }
    if (!supply.track_inventory) {
      const err = new Error("Supply does not track inventory");
      err.status = 409;
      throw err;
    }

    const tracksExpiration = supply.track_expiration === true || supply.track_expiration === 1 || supply.track_expiration === "1";
    const insertMovement = async (quantityDelta, supplyBatchId = null) => {
      const result = await client.query(
        `INSERT INTO supply_inventory_movements (
          supply_id, supply_batch_id, type, quantity_delta, occurred_at,
          source_type, source_id, reason, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'MANUAL_INVENTORY', NULL, $6, $7, $8)
        RETURNING *;`,
        [
          payload.supplyId,
          supplyBatchId,
          payload.type,
          quantityDelta,
          payload.createdAt,
          payload.reason,
          payload.createdBy,
          payload.createdAt,
        ],
      );
      return result.rows[0];
    };

    if (!tracksExpiration) {
      const stockResult = await client.query(
        `SELECT COALESCE(SUM(quantity_delta), 0)::NUMERIC(14, 3) AS current_stock
         FROM supply_inventory_movements WHERE supply_id = $1;`,
        [payload.supplyId],
      );
      if (Number(stockResult.rows[0]?.current_stock || 0) + payload.quantityDelta < -0.0005) {
        const err = new Error("Insufficient stock");
        err.status = 409;
        throw err;
      }
      const movement = await insertMovement(payload.quantityDelta);
      await client.query("COMMIT");
      return movement;
    }

    if (payload.quantityDelta > 0) {
      const batchResult = await client.query(
        `INSERT INTO supply_batches (
          supply_id, received_quantity, current_quantity, received_at,
          expiration_date, lot_number, purchase_id, created_by, created_at, status
        ) VALUES ($1, $2, $2, $3, $4, $5, NULL, $6, $7, 'ACTIVE')
        RETURNING id;`,
        [payload.supplyId, payload.quantityDelta, payload.createdAt, payload.expirationDate, payload.lotNumber, payload.createdBy, payload.createdAt],
      );
      const movement = await insertMovement(payload.quantityDelta, batchResult.rows[0].id);
      await client.query("COMMIT");
      return movement;
    }

    let remaining = Math.abs(payload.quantityDelta);
    const batches = await client.query(
      `SELECT id, current_quantity FROM supply_batches
       WHERE supply_id = $1 AND current_quantity > 0 AND status = 'ACTIVE'
       ORDER BY expiration_date ASC NULLS LAST, id ASC FOR UPDATE;`,
      [payload.supplyId],
    );
    const movements = [];
    for (const batch of batches.rows) {
      if (remaining <= 0.0005) break;
      const consumed = Math.min(Number(batch.current_quantity), remaining);
      await client.query(
        `UPDATE supply_batches
         SET current_quantity = current_quantity - $1,
             status = CASE WHEN current_quantity - $1 <= 0.0005 THEN 'DEPLETED' ELSE status END
         WHERE id = $2;`,
        [consumed, batch.id],
      );
      movements.push(await insertMovement(-consumed, batch.id));
      remaining = Math.round((remaining - consumed) * 1000) / 1000;
    }
    if (remaining > 0.0005) {
      const err = new Error("Insufficient stock");
      err.status = 409;
      throw err;
    }
    await client.query("COMMIT");
    return movements.length === 1 ? movements[0] : movements;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listSupplyRecipeUsages(id) {
  const result = await db.query(
    `
      SELECT recipe.id AS recipe_id, recipe.product_id, recipe.version,
        recipe.status, recipe.active, product.name AS product_name
      FROM product_recipe_items item
      JOIN product_recipes recipe ON recipe.id = item.recipe_id
      JOIN cafeteria_products product ON product.id = recipe.product_id
      WHERE item.supply_id = $1
      ORDER BY recipe.active DESC, recipe.status ASC, lower(product.name), recipe.version DESC;
    `,
    [id],
  );
  return result.rows || [];
}

async function getSupplyUsageCounts(id) {
  const result = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM supply_purchase_items WHERE supply_id=$1)::INTEGER AS purchase_lines,
      (SELECT COUNT(*) FROM order_item_cost_components WHERE supply_id=$1)::INTEGER AS cost_records,
      (SELECT COUNT(*) FROM supply_inventory_movements WHERE supply_id=$1)::INTEGER AS movements,
      (SELECT COUNT(*) FROM supply_batches WHERE supply_id=$1)::INTEGER AS batches;
  `, [id]);
  return result.rows[0] || { purchase_lines: 0, cost_records: 0, movements: 0, batches: 0 };
}

async function deactivateOrDeleteSupply(id) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query("SELECT id FROM inventory_supplies WHERE id=$1 FOR UPDATE;", [id]);
    if (!locked.rows[0]) {
      await client.query("ROLLBACK");
      return { row: null, deactivated: false };
    }
    const usage = await client.query(`
      SELECT EXISTS(SELECT 1 FROM product_recipe_items WHERE supply_id=$1)
        OR EXISTS(SELECT 1 FROM supply_purchase_items WHERE supply_id=$1)
        OR EXISTS(SELECT 1 FROM order_item_cost_components WHERE supply_id=$1) AS has_associations;
    `, [id]);
    if (usage.rows[0]?.has_associations) {
      const result = await client.query("UPDATE inventory_supplies SET active=FALSE WHERE id=$1 RETURNING *;", [id]);
      await client.query("COMMIT");
      return { row: result.rows[0] || null, deactivated: true };
    }
    await client.query("DELETE FROM supply_inventory_movements WHERE supply_id=$1;", [id]);
    await client.query("DELETE FROM supply_batches WHERE supply_id=$1;", [id]);
    const result = await client.query("DELETE FROM inventory_supplies WHERE id=$1 RETURNING *;", [id]);
    await client.query("COMMIT");
    return { row: result.rows[0] || null, deactivated: false };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = async function initConsumer() {
  return {
    listSupplies,
    listCategories,
    createSupply,
    updateSupply,
    getSupplyStock,
    listInventoryMovements,
    listSupplyRecipeUsages,
    getSupplyUsageCounts,
    createInventoryMovement,
    deactivateOrDeleteSupply,
  };
};
