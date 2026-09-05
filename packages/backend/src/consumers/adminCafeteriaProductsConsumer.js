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
        COALESCE(category.name, product.category) AS category,
        COALESCE((
          SELECT SUM(movement.quantity_delta)
          FROM inventory_movements movement
          WHERE movement.product_id = product.id
        ), 0)::INTEGER AS current_stock,
        COALESCE((
          SELECT SUM(batch.current_quantity)
          FROM inventory_batches batch
          WHERE batch.product_id = product.id
            AND batch.status = 'ACTIVE'
        ), 0)::INTEGER AS physical_stock,
        COALESCE((
          SELECT SUM(batch.current_quantity)
          FROM inventory_batches batch
          WHERE batch.product_id = product.id
            AND batch.status = 'ACTIVE'
            AND batch.expiration_date >= CURRENT_DATE::TEXT
        ), 0)::INTEGER AS sellable_stock,
        (
          SELECT MIN(batch.expiration_date)
          FROM inventory_batches batch
          WHERE batch.product_id = product.id
            AND batch.status = 'ACTIVE'
            AND batch.current_quantity > 0
        ) AS nearest_expiration_date,
        active_recipe.id AS active_recipe_id,
        active_recipe.version AS active_recipe_version,
        recipe_stock.controlled_item_count,
        recipe_stock.max_quantity AS recipe_max_quantity
      FROM cafeteria_products product
      LEFT JOIN cafeteria_categories category ON category.id = product.category_id
      LEFT JOIN LATERAL (
        SELECT id, version
        FROM product_recipes
        WHERE product_id = product.id AND active = TRUE
        LIMIT 1
      ) active_recipe ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE requirement.track_inventory = TRUE)::INTEGER
            AS controlled_item_count,
          FLOOR(MIN(
            requirement.available_stock / NULLIF(requirement.required_quantity, 0)
          ) FILTER (WHERE requirement.track_inventory = TRUE))::INTEGER
            AS max_quantity
        FROM (
          SELECT
            supply.track_inventory,
            ROUND(
              item.quantity * (1 + item.waste_percent / 100),
              3
            ) AS required_quantity,
            CASE
              WHEN supply.track_expiration = TRUE THEN COALESCE((
                SELECT SUM(batch.current_quantity)
                FROM supply_batches batch
                WHERE batch.supply_id = supply.id
                  AND batch.current_quantity > 0
                  AND batch.status = 'ACTIVE'
                  AND (
                    batch.expiration_date IS NULL OR
                    batch.expiration_date >= CURRENT_DATE::TEXT
                  )
              ), 0)
              ELSE COALESCE((
                SELECT SUM(movement.quantity_delta)
                FROM supply_inventory_movements movement
                WHERE movement.supply_id = supply.id
              ), 0)
            END AS available_stock
          FROM product_recipe_items item
          JOIN inventory_supplies supply ON supply.id = item.supply_id
          WHERE item.recipe_id = active_recipe.id
        ) requirement
      ) recipe_stock ON active_recipe.id IS NOT NULL
      ORDER BY
        category.sort_order ASC NULLS LAST,
        COALESCE(category.name, product.category, '') ASC,
        product.name ASC;
    `,
  );
  return result.rows || [];
}

async function createProduct(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO cafeteria_products (
        name, price, description, available, category, image, category_id,
        track_inventory, minimum_stock, unit, track_expiration,
        expiration_alert_days, critical_expiration_alert_days
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         COALESCE((SELECT name FROM cafeteria_categories WHERE id = $7), $5),
         $6,
         $7,
         $8,
         $9,
         $10,
         $11,
         $12,
         $13
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
        payload.trackInventory ?? false,
        payload.minimumStock ?? null,
        payload.unit ?? "unidad",
        payload.trackExpiration ?? false,
        payload.expirationAlertDays ?? 30,
        payload.criticalExpirationAlertDays ?? 7,
      ],
    );
    const productId = result.rows[0]?.id ?? null;
    if (productId && payload.trackInventory && payload.initialStock > 0) {
      let batchId = null;
      if (payload.trackExpiration) {
        const batch = await createInventoryBatchWithClient(client, {
          productId,
          receivedQuantity: payload.initialStock,
          expirationDate: payload.expirationDate,
          lotNumber: payload.lotNumber,
          purchaseId: null,
          createdBy: payload.createdBy,
          createdAt: payload.createdAt,
        });
        batchId = batch.id;
      }
      await createInventoryMovementWithClient(client, {
        productId,
        inventoryBatchId: batchId,
        type: "INITIAL_STOCK",
        quantityDelta: payload.initialStock,
        occurredAt: payload.createdAt,
        sourceType: "CAFETERIA_PRODUCT",
        sourceId: String(productId),
        reason: "Stock inicial",
        createdBy: payload.createdBy,
        createdAt: payload.createdAt,
      });
    }
    await client.query("COMMIT");
    return { id: productId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
       category_id = $7,
       track_inventory = $8,
       minimum_stock = $9,
       unit = $10,
       track_expiration = $11,
       expiration_alert_days = $12,
       critical_expiration_alert_days = $13
     WHERE id = $14;`,
    [
      payload.name,
      payload.price,
      payload.description ?? null,
      payload.available ?? true,
      payload.category ?? null,
      payload.image ?? null,
      payload.categoryId ?? null,
      payload.trackInventory ?? false,
      payload.minimumStock ?? null,
      payload.unit ?? "unidad",
      payload.trackExpiration ?? false,
      payload.expirationAlertDays ?? 30,
      payload.criticalExpirationAlertDays ?? 7,
      id,
    ],
  );
  return { changes: result.rowCount };
}

async function listInventoryMovements(productId, filters = {}) {
  const values = [productId];
  const clauses = ["movement.product_id = $1"];

  if (filters.type) {
    values.push(filters.type);
    clauses.push(`movement.type = $${values.length}`);
  }
  if (filters.dateFromMs != null) {
    values.push(filters.dateFromMs);
    clauses.push(`movement.occurred_at >= $${values.length}`);
  }
  if (filters.dateToMs != null) {
    values.push(filters.dateToMs);
    clauses.push(`movement.occurred_at <= $${values.length}`);
  }

  const countResult = await db.query(
    `
      SELECT COUNT(*)::INTEGER AS total
      FROM inventory_movements movement
      WHERE ${clauses.join(" AND ")};
    `,
    values,
  );

  values.push(filters.limit, filters.offset);
  const result = await db.query(
    `
      SELECT
        movement.*,
        batch.expiration_date,
        batch.lot_number,
        creator.name AS created_by_name
      FROM inventory_movements movement
      LEFT JOIN inventory_batches batch ON batch.id = movement.inventory_batch_id
      LEFT JOIN users creator ON creator.id = movement.created_by
      WHERE ${clauses.join(" AND ")}
      ORDER BY movement.occurred_at DESC, movement.id DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length};
    `,
    values,
  );
  return {
    rows: result.rows || [],
    total: Number(countResult.rows[0]?.total || 0),
  };
}

async function getProductStock(productId) {
  const result = await db.query(
    `
      SELECT
        product.*,
        COALESCE(SUM(movement.quantity_delta), 0)::INTEGER AS current_stock
      FROM cafeteria_products product
      LEFT JOIN inventory_movements movement ON movement.product_id = product.id
      WHERE product.id = $1
      GROUP BY product.id
      LIMIT 1;
    `,
    [productId],
  );
  return result.rows[0] || null;
}

async function createInventoryMovement(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const product = await assertInventoryMovementAllowed(client, payload.productId, payload.quantityDelta);
    let movement = null;
    const tracksExpiration =
      product.track_expiration === true ||
      product.track_expiration === 1 ||
      product.track_expiration === "1";
    if (tracksExpiration && payload.quantityDelta > 0) {
      const batch = await createInventoryBatchWithClient(client, {
        productId: payload.productId,
        receivedQuantity: payload.quantityDelta,
        expirationDate: payload.expirationDate,
        lotNumber: payload.lotNumber,
        purchaseId: payload.purchaseId,
        createdBy: payload.createdBy,
        createdAt: payload.createdAt,
      });
      movement = await createInventoryMovementWithClient(client, {
        ...payload,
        inventoryBatchId: batch.id,
      });
    } else if (tracksExpiration && payload.quantityDelta < 0) {
      movement = await consumeInventoryBatchesForManualMovement(client, payload);
    } else {
      movement = await createInventoryMovementWithClient(client, payload);
    }
    await client.query("COMMIT");
    return movement;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function assertInventoryMovementAllowed(client, productId, quantityDelta) {
  const productResult = await client.query(
    `
      SELECT id, track_inventory, track_expiration
      FROM cafeteria_products product
      WHERE product.id = $1
      FOR UPDATE OF product;
    `,
    [productId],
  );
  const product = productResult.rows[0];
  if (!product) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  if (!(product.track_inventory === true || product.track_inventory === 1 || product.track_inventory === "1")) {
    const err = new Error("Product does not track inventory");
    err.status = 409;
    throw err;
  }
  const stockResult = await client.query(
    `
      SELECT COALESCE(SUM(quantity_delta), 0)::INTEGER AS current_stock
      FROM inventory_movements
      WHERE product_id = $1;
    `,
    [productId],
  );
  if (Number(stockResult.rows[0]?.current_stock || 0) + quantityDelta < 0) {
    const err = new Error("Insufficient stock");
    err.status = 409;
    throw err;
  }
  return product;
}

async function createInventoryMovementWithClient(client, payload) {
  const result = await client.query(
    `
      INSERT INTO inventory_movements (
        product_id,
        inventory_batch_id,
        type,
        quantity_delta,
        occurred_at,
        source_type,
        source_id,
        reason,
        created_by,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `,
    [
      payload.productId,
      payload.inventoryBatchId ?? null,
      payload.type,
      payload.quantityDelta,
      payload.occurredAt,
      payload.sourceType,
      payload.sourceId,
      payload.reason,
      payload.createdBy,
      payload.createdAt,
    ],
  );
  return result.rows[0] || null;
}

async function createInventoryBatchWithClient(client, payload) {
  const result = await client.query(
    `
      INSERT INTO inventory_batches (
        product_id,
        received_quantity,
        current_quantity,
        received_at,
        expiration_date,
        lot_number,
        purchase_id,
        created_by,
        created_at,
        status
      )
      VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
      RETURNING *;
    `,
    [
      payload.productId,
      payload.receivedQuantity,
      payload.createdAt,
      payload.expirationDate,
      payload.lotNumber,
      payload.purchaseId,
      payload.createdBy,
      payload.createdAt,
    ],
  );
  return result.rows[0];
}

async function consumeInventoryBatchesForManualMovement(client, payload) {
  let remaining = Math.abs(Number(payload.quantityDelta || 0));
  const batches = await client.query(
    `
      SELECT *
      FROM inventory_batches
      WHERE product_id = $1
        AND current_quantity > 0
        AND status = 'ACTIVE'
      ORDER BY expiration_date ASC, id ASC
      FOR UPDATE;
    `,
    [payload.productId],
  );
  const movements = [];
  for (const batch of batches.rows || []) {
    if (remaining <= 0) break;
    const quantity = Math.min(Number(batch.current_quantity || 0), remaining);
    if (quantity <= 0) continue;
    await client.query(
      "UPDATE inventory_batches SET current_quantity = current_quantity - $1 WHERE id = $2;",
      [quantity, batch.id],
    );
    const movement = await createInventoryMovementWithClient(client, {
      ...payload,
      inventoryBatchId: batch.id,
      quantityDelta: -quantity,
    });
    movements.push(movement);
    remaining -= quantity;
  }
  if (remaining > 0) {
    const err = new Error("Insufficient stock");
    err.status = 409;
    throw err;
  }
  return movements[0] || null;
}

async function listInventoryBatches(productId) {
  const result = await db.query(
    `
      SELECT *
      FROM inventory_batches
      WHERE product_id = $1
      ORDER BY expiration_date ASC, id ASC;
    `,
    [productId],
  );
  return result.rows || [];
}

async function writeOffExpiredBatches(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const batches = await client.query(
      `
        SELECT batch.*
        FROM inventory_batches batch
        JOIN cafeteria_products product ON product.id = batch.product_id
        WHERE batch.product_id = $1
          AND batch.current_quantity > 0
          AND batch.status = 'ACTIVE'
          AND batch.expiration_date < CURRENT_DATE::TEXT
          AND product.track_inventory = TRUE
          AND product.track_expiration = TRUE
        ORDER BY batch.expiration_date ASC, batch.id ASC
        FOR UPDATE OF batch;
      `,
      [payload.productId],
    );
    const movements = [];
    for (const batch of batches.rows || []) {
      const quantity = Number(batch.current_quantity || 0);
      if (quantity <= 0) continue;
      await client.query(
        "UPDATE inventory_batches SET current_quantity = 0 WHERE id = $1;",
        [batch.id],
      );
      const movement = await createInventoryMovementWithClient(client, {
        productId: payload.productId,
        inventoryBatchId: batch.id,
        type: "WASTE_EXPIRED",
        quantityDelta: -quantity,
        occurredAt: payload.createdAt,
        sourceType: "EXPIRED_BATCH",
        sourceId: String(batch.id),
        reason: payload.reason,
        createdBy: payload.createdBy,
        createdAt: payload.createdAt,
      });
      movements.push(movement);
    }
    await client.query("COMMIT");
    return movements;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
    listInventoryMovements,
    getProductStock,
    createInventoryMovement,
    listInventoryBatches,
    writeOffExpiredBatches,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    listPromotions,
    createPromotion,
    deletePromotion,
  };
};
