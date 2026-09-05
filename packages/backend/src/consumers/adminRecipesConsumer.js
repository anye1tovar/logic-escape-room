const db = require("../db/initDb");

function isTruthy(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function notFound(message = "Not found") {
  const err = new Error(message);
  err.status = 404;
  return err;
}

async function listProducts() {
  const result = await db.query(
    `
      SELECT
        product.id,
        product.name,
        product.price,
        product.available,
        active_recipe.id AS active_recipe_id,
        active_recipe.version AS active_version,
        draft_recipe.id AS draft_recipe_id,
        draft_recipe.version AS draft_version,
        COALESCE(version_info.latest_version, 0)::INTEGER AS latest_version
      FROM cafeteria_products product
      LEFT JOIN LATERAL (
        SELECT id, version
        FROM product_recipes
        WHERE product_id = product.id AND active = TRUE
        LIMIT 1
      ) active_recipe ON TRUE
      LEFT JOIN LATERAL (
        SELECT id, version
        FROM product_recipes
        WHERE product_id = product.id AND status = 'DRAFT'
        LIMIT 1
      ) draft_recipe ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(version) AS latest_version
        FROM product_recipes
        WHERE product_id = product.id
      ) version_info ON TRUE
      ORDER BY product.available DESC, lower(product.name) ASC;
    `,
  );
  return result.rows || [];
}

async function getRecipe(recipeId, executor = db) {
  const recipeResult = await executor.query(
    `
      SELECT recipe.*, product.name AS product_name, product.price AS product_price
      FROM product_recipes recipe
      JOIN cafeteria_products product ON product.id = recipe.product_id
      WHERE recipe.id = $1
      LIMIT 1;
    `,
    [recipeId],
  );
  const recipe = recipeResult.rows[0];
  if (!recipe) return null;
  const itemResult = await executor.query(
    `
      SELECT
        item.*,
        supply.name AS supply_name,
        supply.consumption_unit,
        supply.active AS supply_active
      FROM product_recipe_items item
      JOIN inventory_supplies supply ON supply.id = item.supply_id
      WHERE item.recipe_id = $1
      ORDER BY item.id ASC;
    `,
    [recipeId],
  );
  return { ...recipe, items: itemResult.rows || [] };
}

async function loadCurrentCosts(supplyIds) {
  if (supplyIds.length === 0) return new Map();
  const result = await db.query(
    `
      SELECT
        supply.id,
        supply.name,
        supply.consumption_unit,
        supply.track_expiration,
        supply.active,
        CASE
          WHEN supply.track_expiration = TRUE AND fefo.unit_cost IS NOT NULL
            THEN fefo.unit_cost
          ELSE average_cost.unit_cost
        END AS unit_cost,
        CASE
          WHEN supply.track_expiration = TRUE AND fefo.unit_cost IS NOT NULL
            THEN 'FEFO'
          WHEN average_cost.unit_cost IS NOT NULL
            THEN 'WEIGHTED_AVERAGE'
          ELSE NULL
        END AS costing_method
      FROM inventory_supplies supply
      LEFT JOIN LATERAL (
        SELECT
          item.line_total::NUMERIC / NULLIF(item.converted_quantity, 0) AS unit_cost
        FROM supply_batches batch
        JOIN supply_purchase_items item ON item.supply_batch_id = batch.id
        JOIN supply_purchases purchase ON purchase.id = item.purchase_id
        WHERE batch.supply_id = supply.id
          AND batch.status = 'ACTIVE'
          AND batch.current_quantity > 0
          AND (batch.expiration_date IS NULL OR batch.expiration_date >= CURRENT_DATE::TEXT)
          AND purchase.status = 'ACTIVE'
        ORDER BY batch.expiration_date ASC NULLS LAST, batch.id ASC
        LIMIT 1
      ) fefo ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          SUM(item.line_total)::NUMERIC /
            NULLIF(SUM(item.converted_quantity), 0) AS unit_cost
        FROM supply_purchase_items item
        JOIN supply_purchases purchase ON purchase.id = item.purchase_id
        WHERE item.supply_id = supply.id
          AND purchase.status = 'ACTIVE'
      ) average_cost ON TRUE
      WHERE supply.id = ANY($1::INTEGER[]);
    `,
    [supplyIds],
  );
  return new Map((result.rows || []).map((row) => [Number(row.id), row]));
}

async function calculatePreview(payload) {
  const productResult = await db.query(
    "SELECT id, name, price, available FROM cafeteria_products WHERE id = $1 LIMIT 1;",
    [payload.productId],
  );
  const product = productResult.rows[0];
  if (!product) throw notFound("Product not found");

  const costs = await loadCurrentCosts(payload.items.map((item) => item.supplyId));
  const items = payload.items.map((item) => {
    const supply = costs.get(item.supplyId);
    if (!supply) throw notFound("Supply not found");
    const effectiveQuantity = item.quantity * (1 + item.wastePercent / 100);
    const unitCost = supply.unit_cost == null ? null : Number(supply.unit_cost);
    const lineCost = unitCost == null ? null : effectiveQuantity * unitCost;
    return {
      ...item,
      supplyName: supply.name,
      unit: supply.consumption_unit,
      supplyActive: isTruthy(supply.active),
      effectiveQuantity: Math.round(effectiveQuantity * 1000) / 1000,
      unitCost: unitCost == null ? null : Math.round(unitCost * 10000) / 10000,
      lineCost: lineCost == null ? null : Math.round(lineCost * 100) / 100,
      costingMethod: supply.costing_method,
      costIncomplete: unitCost == null,
    };
  });
  const completeCosts = items.filter((item) => item.lineCost != null);
  const directCost = completeCosts.reduce((sum, item) => sum + item.lineCost, 0);
  const price = Number(product.price || 0);
  const grossProfit = price - directCost;
  const grossMargin = price > 0 ? (grossProfit / price) * 100 : null;
  const suggestedPrice = Math.ceil(
    directCost / (1 - payload.targetMarginPercent / 100),
  );

  return {
    product,
    targetMarginPercent: payload.targetMarginPercent,
    items,
    directCost: Math.round(directCost * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMargin: grossMargin == null ? null : Math.round(grossMargin * 100) / 100,
    suggestedPrice,
    costIncomplete: completeCosts.length !== items.length,
  };
}

function recipeToPreviewPayload(recipe) {
  return {
    productId: Number(recipe.product_id),
    targetMarginPercent: Number(recipe.target_margin_percent),
    items: recipe.items.map((item) => ({
      supplyId: Number(item.supply_id),
      quantity: Number(item.quantity),
      wastePercent: Number(item.waste_percent),
      notes: item.notes,
    })),
  };
}

async function enrichRecipe(recipe) {
  if (!recipe) return null;
  return { ...recipe, preview: await calculatePreview(recipeToPreviewPayload(recipe)) };
}

async function getProductRecipes(productId) {
  const productResult = await db.query(
    "SELECT id, name, price, available FROM cafeteria_products WHERE id = $1 LIMIT 1;",
    [productId],
  );
  const product = productResult.rows[0];
  if (!product) throw notFound("Product not found");
  const recipesResult = await db.query(
    `
      SELECT *
      FROM product_recipes
      WHERE product_id = $1
      ORDER BY version DESC;
    `,
    [productId],
  );
  const recipes = [];
  for (const row of recipesResult.rows || []) {
    recipes.push(await getRecipe(row.id));
  }
  const activeRecipe = recipes.find((recipe) => isTruthy(recipe.active)) || null;
  const draftRecipe = recipes.find((recipe) => recipe.status === "DRAFT") || null;
  return {
    product,
    activeRecipe: await enrichRecipe(activeRecipe),
    draftRecipe: await enrichRecipe(draftRecipe),
    history: recipes.filter(
      (recipe) => recipe.status !== "DRAFT" && !isTruthy(recipe.active),
    ),
    nextVersion: Math.max(0, ...recipes.map((recipe) => Number(recipe.version))) + 1,
  };
}

async function assertActiveSupplies(client, items) {
  if (items.length === 0) return new Map();
  const result = await client.query(
    `
      SELECT id, name, consumption_unit, active
      FROM inventory_supplies
      WHERE id = ANY($1::INTEGER[])
      FOR SHARE;
    `,
    [items.map((item) => item.supplyId)],
  );
  if (result.rows.length !== items.length) throw notFound("Supply not found");
  const inactive = result.rows.find((row) => !isTruthy(row.active));
  if (inactive) {
    const err = new Error(`Supply ${inactive.name} is inactive`);
    err.status = 409;
    throw err;
  }
  return new Map(result.rows.map((row) => [Number(row.id), row]));
}

async function saveDraft(payload) {
  const client = await db.pool.connect();
  let recipeId;
  try {
    await client.query("BEGIN");
    const product = await client.query(
      "SELECT id FROM cafeteria_products WHERE id = $1 FOR UPDATE;",
      [payload.productId],
    );
    if (!product.rows[0]) throw notFound("Product not found");
    const supplies = await assertActiveSupplies(client, payload.items);
    const existing = await client.query(
      `
        SELECT * FROM product_recipes
        WHERE product_id = $1 AND status = 'DRAFT'
        FOR UPDATE;
      `,
      [payload.productId],
    );
    const draft = existing.rows[0];
    if (draft) {
      recipeId = draft.id;
      await client.query(
        `
          UPDATE product_recipes
          SET target_margin_percent = $1, updated_at = $2, updated_by = $3
          WHERE id = $4;
        `,
        [payload.targetMarginPercent, payload.now, payload.userId, recipeId],
      );
      await client.query("DELETE FROM product_recipe_items WHERE recipe_id = $1;", [recipeId]);
    } else {
      const versionResult = await client.query(
        "SELECT COALESCE(MAX(version), 0)::INTEGER + 1 AS version FROM product_recipes WHERE product_id = $1;",
        [payload.productId],
      );
      const inserted = await client.query(
        `
          INSERT INTO product_recipes (
            product_id, version, status, active, target_margin_percent,
            created_at, created_by, updated_at, updated_by
          )
          VALUES ($1, $2, 'DRAFT', FALSE, $3, $4, $5, $4, $5)
          RETURNING id;
        `,
        [
          payload.productId,
          versionResult.rows[0].version,
          payload.targetMarginPercent,
          payload.now,
          payload.userId,
        ],
      );
      recipeId = inserted.rows[0].id;
    }

    for (const item of payload.items) {
      const supply = supplies.get(item.supplyId);
      await client.query(
        `
          INSERT INTO product_recipe_items (
            recipe_id, supply_id, supply_name_snapshot, quantity,
            unit_snapshot, waste_percent, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `,
        [
          recipeId,
          item.supplyId,
          supply.name,
          item.quantity,
          supply.consumption_unit,
          item.wastePercent,
          item.notes,
        ],
      );
    }
    await client.query(
      `
        INSERT INTO audit_events (entity_type, entity_id, action, metadata, created_by, created_at)
        VALUES ('PRODUCT_RECIPE', $1, 'SAVE_DRAFT', $2, $3, $4);
      `,
      [String(recipeId), JSON.stringify({ itemCount: payload.items.length }), payload.userId, payload.now],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return enrichRecipe(await getRecipe(recipeId));
}

async function activateRecipe(payload) {
  const client = await db.pool.connect();
  let productId;
  try {
    await client.query("BEGIN");
    const initial = await client.query(
      "SELECT product_id FROM product_recipes WHERE id = $1;",
      [payload.recipeId],
    );
    if (!initial.rows[0]) throw notFound("Recipe not found");
    productId = initial.rows[0].product_id;
    await client.query("SELECT id FROM cafeteria_products WHERE id = $1 FOR UPDATE;", [productId]);
    const recipeResult = await client.query(
      "SELECT * FROM product_recipes WHERE id = $1 FOR UPDATE;",
      [payload.recipeId],
    );
    const recipe = recipeResult.rows[0];
    if (recipe.status !== "DRAFT") {
      const err = new Error("Only a draft recipe can be activated");
      err.status = 409;
      throw err;
    }
    const items = await client.query(
      `
        SELECT item.supply_id, supply.name, supply.active
        FROM product_recipe_items item
        JOIN inventory_supplies supply ON supply.id = item.supply_id
        WHERE item.recipe_id = $1;
      `,
      [payload.recipeId],
    );
    if (items.rows.length === 0) {
      const err = new Error("An active recipe requires at least one supply");
      err.status = 400;
      throw err;
    }
    const inactive = items.rows.find((item) => !isTruthy(item.active));
    if (inactive) {
      const err = new Error(`Supply ${inactive.name} is inactive`);
      err.status = 409;
      throw err;
    }
    await client.query(
      `
        UPDATE product_recipes
        SET active = FALSE, status = 'ARCHIVED', updated_at = $2, updated_by = $3
        WHERE product_id = $1 AND active = TRUE;
      `,
      [productId, payload.now, payload.userId],
    );
    await client.query(
      `
        UPDATE product_recipes
        SET active = TRUE, status = 'ACTIVE', activated_at = $2,
            activated_by = $3, updated_at = $2, updated_by = $3
        WHERE id = $1;
      `,
      [payload.recipeId, payload.now, payload.userId],
    );
    await client.query(
      `
        INSERT INTO audit_events (entity_type, entity_id, action, metadata, created_by, created_at)
        VALUES ('PRODUCT_RECIPE', $1, 'ACTIVATE', $2, $3, $4);
      `,
      [String(payload.recipeId), JSON.stringify({ productId }), payload.userId, payload.now],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return enrichRecipe(await getRecipe(payload.recipeId));
}

async function deleteDraft(recipeId) {
  const result = await db.query(
    "DELETE FROM product_recipes WHERE id = $1 AND status = 'DRAFT' RETURNING id;",
    [recipeId],
  );
  if (!result.rows[0]) {
    const err = new Error("Only a draft recipe can be deleted");
    err.status = 409;
    throw err;
  }
  return { ok: true };
}

module.exports = async function initAdminRecipesConsumer() {
  return {
    listProducts,
    getProductRecipes,
    calculatePreview,
    saveDraft,
    activateRecipe,
    deleteDraft,
  };
};
