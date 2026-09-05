function isTruthy(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function roundQuantity(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

async function getWeightedSupplyCost(client, supplyId) {
  const result = await client.query(
    `
      SELECT
        SUM(item.line_total)::NUMERIC /
          NULLIF(SUM(item.converted_quantity), 0) AS unit_cost
      FROM supply_purchase_items item
      JOIN supply_purchases purchase ON purchase.id = item.purchase_id
      WHERE item.supply_id = $1 AND purchase.status = 'ACTIVE';
    `,
    [supplyId]
  );
  const value = result.rows[0]?.unit_cost;
  return value == null ? null : Number(value);
}

async function getSupplyBatchCost(client, batchId) {
  const result = await client.query(
    `
      SELECT
        item.line_total::NUMERIC /
          NULLIF(item.converted_quantity, 0) AS unit_cost
      FROM supply_purchase_items item
      JOIN supply_purchases purchase ON purchase.id = item.purchase_id
      WHERE item.supply_batch_id = $1 AND purchase.status = 'ACTIVE'
      ORDER BY item.id DESC
      LIMIT 1;
    `,
    [batchId]
  );
  const value = result.rows[0]?.unit_cost;
  return value == null ? null : Number(value);
}

async function getWeightedProductCost(client, productId) {
  const result = await client.query(
    `
      SELECT
        SUM(item.line_total)::NUMERIC /
          NULLIF(SUM(item.quantity), 0) AS unit_cost
      FROM inventory_purchase_items item
      JOIN inventory_purchases purchase ON purchase.id = item.purchase_id
      WHERE item.product_id = $1
        AND purchase.status = 'ACTIVE'
        AND item.line_total IS NOT NULL;
    `,
    [productId]
  );
  const value = result.rows[0]?.unit_cost;
  return value == null ? null : Number(value);
}

async function getProductBatchCost(client, batchId) {
  const result = await client.query(
    `
      SELECT
        item.line_total::NUMERIC /
          NULLIF(item.quantity, 0) AS unit_cost
      FROM inventory_purchase_items item
      JOIN inventory_purchases purchase ON purchase.id = item.purchase_id
      WHERE item.inventory_batch_id = $1
        AND purchase.status = 'ACTIVE'
        AND item.line_total IS NOT NULL
      ORDER BY item.id DESC
      LIMIT 1;
    `,
    [batchId]
  );
  const value = result.rows[0]?.unit_cost;
  return value == null ? null : Number(value);
}

function makeComponent({
  supplyId = null,
  productId = null,
  supplyBatchId = null,
  inventoryBatchId = null,
  quantity,
  unitCost,
  costingMethod,
}) {
  const incomplete = unitCost == null || !Number.isFinite(unitCost);
  return {
    supplyId,
    productId,
    supplyBatchId,
    inventoryBatchId,
    quantity: roundQuantity(quantity),
    unitCost: incomplete ? null : unitCost,
    totalCost: incomplete ? 0 : Math.round(Number(quantity) * unitCost),
    costingMethod: incomplete ? null : costingMethod,
    costIncomplete: incomplete,
  };
}

async function buildRecipeComponents(client, item) {
  const recipeResult = await client.query(
    `
      SELECT
        recipe_item.supply_id,
        recipe_item.quantity,
        recipe_item.waste_percent,
        supply.track_inventory,
        supply.track_expiration
      FROM product_recipe_items recipe_item
      JOIN inventory_supplies supply ON supply.id = recipe_item.supply_id
      WHERE recipe_item.recipe_id = $1
      ORDER BY recipe_item.supply_id ASC;
    `,
    [item.recipe_id]
  );
  const components = [];
  for (const recipeItem of recipeResult.rows || []) {
    const expectedQuantity = roundQuantity(
      Number(recipeItem.quantity || 0) *
        (1 + Number(recipeItem.waste_percent || 0) / 100) *
        Number(item.quantity || 0)
    );
    const tracksInventory = isTruthy(recipeItem.track_inventory);
    const tracksExpiration = isTruthy(recipeItem.track_expiration);
    if (tracksInventory && tracksExpiration) {
      const movements = await client.query(
        `
          SELECT supply_batch_id, -SUM(quantity_delta)::NUMERIC(14, 3) AS quantity
          FROM supply_inventory_movements
          WHERE source_type = 'ORDER_ITEM'
            AND source_id = $1
            AND recipe_id = $2
            AND supply_id = $3
            AND supply_batch_id IS NOT NULL
          GROUP BY supply_batch_id
          HAVING SUM(quantity_delta) < 0
          ORDER BY supply_batch_id ASC;
        `,
        [String(item.id), item.recipe_id, recipeItem.supply_id]
      );
      if (movements.rows.length === 0) {
        components.push(
          makeComponent({
            supplyId: recipeItem.supply_id,
            quantity: expectedQuantity,
            unitCost: null,
            costingMethod: "FEFO",
          })
        );
      }
      for (const movement of movements.rows || []) {
        components.push(
          makeComponent({
            supplyId: recipeItem.supply_id,
            supplyBatchId: movement.supply_batch_id,
            quantity: Number(movement.quantity),
            unitCost: await getSupplyBatchCost(client, movement.supply_batch_id),
            costingMethod: "FEFO",
          })
        );
      }
      continue;
    }

    let quantity = expectedQuantity;
    if (tracksInventory) {
      const movement = await client.query(
        `
          SELECT -COALESCE(SUM(quantity_delta), 0)::NUMERIC(14, 3) AS quantity
          FROM supply_inventory_movements
          WHERE source_type = 'ORDER_ITEM'
            AND source_id = $1
            AND recipe_id = $2
            AND supply_id = $3;
        `,
        [String(item.id), item.recipe_id, recipeItem.supply_id]
      );
      quantity = Number(movement.rows[0]?.quantity || expectedQuantity);
    }
    components.push(
      makeComponent({
        supplyId: recipeItem.supply_id,
        quantity,
        unitCost: await getWeightedSupplyCost(client, recipeItem.supply_id),
        costingMethod: "WEIGHTED_AVERAGE",
      })
    );
  }
  if (components.length === 0) {
    components.push(
      makeComponent({
        productId: item.product_id,
        quantity: item.quantity,
        unitCost: null,
        costingMethod: "RECIPE_UNAVAILABLE",
      })
    );
  }
  return components;
}

async function buildDirectComponents(client, item) {
  const productResult = await client.query(
    `
      SELECT track_inventory, track_expiration
      FROM cafeteria_products
      WHERE id = $1;
    `,
    [item.product_id]
  );
  const product = productResult.rows[0] || {};
  if (!isTruthy(product.track_inventory)) {
    return [
      makeComponent({
        productId: item.product_id,
        quantity: item.quantity,
        unitCost: null,
        costingMethod: "UNAVAILABLE",
      }),
    ];
  }
  if (isTruthy(product.track_expiration)) {
    const movements = await client.query(
      `
        SELECT inventory_batch_id, -SUM(quantity_delta)::NUMERIC(14, 3) AS quantity
        FROM inventory_movements
        WHERE source_type = 'ORDER_ITEM'
          AND source_id = $1
          AND product_id = $2
          AND inventory_batch_id IS NOT NULL
        GROUP BY inventory_batch_id
        HAVING SUM(quantity_delta) < 0
        ORDER BY inventory_batch_id ASC;
      `,
      [String(item.id), item.product_id]
    );
    if (movements.rows.length === 0) {
      return [
        makeComponent({
          productId: item.product_id,
          quantity: item.quantity,
          unitCost: null,
          costingMethod: "FEFO",
        }),
      ];
    }
    const components = [];
    for (const movement of movements.rows) {
      components.push(
        makeComponent({
          productId: item.product_id,
          inventoryBatchId: movement.inventory_batch_id,
          quantity: Number(movement.quantity),
          unitCost: await getProductBatchCost(client, movement.inventory_batch_id),
          costingMethod: "FEFO",
        })
      );
    }
    return components;
  }
  return [
    makeComponent({
      productId: item.product_id,
      quantity: item.quantity,
      unitCost: await getWeightedProductCost(client, item.product_id),
      costingMethod: "WEIGHTED_AVERAGE",
    }),
  ];
}

function snapshotMethod(item, components) {
  const methods = new Set(
    components.map((component) => component.costingMethod).filter(Boolean)
  );
  const detail = methods.size === 1 ? [...methods][0] : methods.size > 1 ? "MIXED" : "UNAVAILABLE";
  return item.recipe_id ? `RECIPE_${detail}` : `DIRECT_${detail}`;
}

async function saveOrderItemCostSnapshot(client, item, timestamp) {
  const components = item.recipe_id
    ? await buildRecipeComponents(client, item)
    : await buildDirectComponents(client, item);
  const totalCost = components.reduce(
    (sum, component) => sum + component.totalCost,
    0
  );
  const quantity = Number(item.quantity || 0);
  const commercialUnitRevenue = Number(item.unit_price_snapshot || 0);
  const totalRevenue = Number(item.charged_subtotal || 0);
  const unitRevenue = quantity > 0 ? Math.round(totalRevenue / quantity) : 0;
  const unitCost = quantity > 0 ? Math.round(totalCost / quantity) : 0;
  const grossProfit = totalRevenue - totalCost;
  const grossMargin =
    totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000000) / 10000 : null;
  const costIncomplete = components.some((component) => component.costIncomplete);
  const snapshot = await client.query(
    `
      INSERT INTO order_item_cost_snapshots (
        order_item_id, product_id, recipe_id, quantity, commercial_unit_revenue,
        unit_revenue, total_revenue, unit_cost, total_cost, gross_profit,
        gross_margin, costing_method, cost_incomplete, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVE', $14, $14)
      ON CONFLICT (order_item_id) DO UPDATE SET
        product_id = EXCLUDED.product_id,
        recipe_id = EXCLUDED.recipe_id,
        quantity = EXCLUDED.quantity,
        commercial_unit_revenue = EXCLUDED.commercial_unit_revenue,
        unit_revenue = EXCLUDED.unit_revenue,
        total_revenue = EXCLUDED.total_revenue,
        unit_cost = EXCLUDED.unit_cost,
        total_cost = EXCLUDED.total_cost,
        gross_profit = EXCLUDED.gross_profit,
        gross_margin = EXCLUDED.gross_margin,
        costing_method = EXCLUDED.costing_method,
        cost_incomplete = EXCLUDED.cost_incomplete,
        status = 'ACTIVE',
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `,
    [
      item.id,
      item.product_id,
      item.recipe_id,
      quantity,
      commercialUnitRevenue,
      unitRevenue,
      totalRevenue,
      unitCost,
      totalCost,
      grossProfit,
      grossMargin,
      snapshotMethod(item, components),
      costIncomplete,
      timestamp,
    ]
  );
  const saved = snapshot.rows[0];
  await client.query(
    "DELETE FROM order_item_cost_components WHERE snapshot_id = $1;",
    [saved.id]
  );
  for (const component of components) {
    await client.query(
      `
        INSERT INTO order_item_cost_components (
          snapshot_id, supply_id, product_id, supply_batch_id,
          inventory_batch_id, quantity, unit_cost, total_cost,
          costing_method, cost_incomplete, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
      `,
      [
        saved.id,
        component.supplyId,
        component.productId,
        component.supplyBatchId,
        component.inventoryBatchId,
        component.quantity,
        component.unitCost,
        component.totalCost,
        component.costingMethod,
        component.costIncomplete,
        timestamp,
      ]
    );
  }
  return saved;
}

async function voidOrderItemCostSnapshot(client, orderItemId, timestamp) {
  await client.query(
    `
      UPDATE order_item_cost_snapshots
      SET status = 'VOIDED', updated_at = $2
      WHERE order_item_id = $1 AND status = 'ACTIVE';
    `,
    [orderItemId, timestamp]
  );
}

module.exports = { saveOrderItemCostSnapshot, voidOrderItemCostSnapshot };
