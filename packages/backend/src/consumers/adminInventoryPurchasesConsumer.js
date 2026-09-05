const db = require("../db/initDb");

function isTruthy(value) {
  return value === true || value === 1 || value === "1";
}

async function assertAccountCanSpend(client, accountId, amount) {
  const accountResult = await client.query(
    `
      SELECT id, active
      FROM financial_accounts account
      WHERE account.id = $1
      FOR UPDATE OF account;
    `,
    [accountId],
  );
  const account = accountResult.rows[0];
  if (!account || !isTruthy(account.active)) {
    const err = new Error("Financial account not found or inactive");
    err.status = 404;
    throw err;
  }
  const balanceResult = await client.query(
    `
      SELECT COALESCE(SUM(amount), 0)::INTEGER AS balance
      FROM financial_movements
      WHERE financial_account_id = $1
        AND status = 'ACTIVE';
    `,
    [accountId],
  );
  if (Number(balanceResult.rows[0]?.balance || 0) < amount) {
    const err = new Error("Insufficient funds in financial account");
    err.status = 409;
    throw err;
  }
}

async function createExpenseWithClient(client, payload) {
  const expenseResult = await client.query(
    `
      INSERT INTO expenses (
        category,
        cost_center,
        allocation_mode,
        description,
        total_amount,
        occurred_at,
        notes,
        created_by,
        created_at,
        status
      )
      VALUES ('SUPPLIES', 'CAFETERIA', 'DIRECT', $1, $2, $3, NULL, $4, $5, 'ACTIVE')
      RETURNING *;
    `,
    [
      payload.description,
      payload.totalPaid,
      payload.receivedAt,
      payload.createdBy,
      payload.createdAt,
    ],
  );
  const expense = expenseResult.rows[0];

  for (const allocation of payload.allocations) {
    let movementId = null;
    if (allocation.sourceType === "FINANCIAL_ACCOUNT") {
      await assertAccountCanSpend(
        client,
        allocation.financialAccountId,
        allocation.amount,
      );
      const movementResult = await client.query(
        `
          INSERT INTO financial_movements (
            financial_account_id,
            type,
            amount,
            occurred_at,
            description,
            source_type,
            source_id,
            created_by,
            created_at,
            status
          )
          VALUES ($1, 'EXPENSE', $2, $3, $4, 'EXPENSE', $5, $6, $7, 'ACTIVE')
          RETURNING id;
        `,
        [
          allocation.financialAccountId,
          -allocation.amount,
          payload.receivedAt,
          payload.description,
          String(expense.id),
          payload.createdBy,
          payload.createdAt,
        ],
      );
      movementId = movementResult.rows[0]?.id ?? null;
    }

    await client.query(
      `
        INSERT INTO expense_funding_allocations (
          expense_id,
          source_type,
          financial_account_id,
          owner_name,
          contribution_kind,
          amount,
          financial_movement_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `,
      [
        expense.id,
        allocation.sourceType,
        allocation.financialAccountId,
        allocation.ownerName,
        allocation.contributionKind,
        allocation.amount,
        movementId,
      ],
    );
  }

  return expense;
}

async function createInventoryPurchase(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    if (payload.requestKey) {
      const existing = await client.query(
        "SELECT * FROM inventory_purchases WHERE request_key = $1 LIMIT 1;",
        [payload.requestKey],
      );
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return { ...existing.rows[0], duplicate: true };
      }
    }

    const purchaseResult = await client.query(
      `
        INSERT INTO inventory_purchases (
          request_key,
          received_at,
          supplier,
          description,
          total_paid,
          created_by,
          created_at,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
        RETURNING *;
      `,
      [
        payload.requestKey,
        payload.receivedAt,
        payload.supplier,
        payload.description,
        payload.totalPaid,
        payload.createdBy,
        payload.createdAt,
      ],
    );
    const purchase = purchaseResult.rows[0];
    let expenseId = null;

    if (payload.totalPaid && payload.allocations.length > 0) {
      const expense = await createExpenseWithClient(client, {
        ...payload,
        description:
          payload.description ||
          `Compra de inventario #${purchase.id}`,
      });
      expenseId = expense.id;
      await client.query(
        "UPDATE inventory_purchases SET expense_id = $1 WHERE id = $2;",
        [expenseId, purchase.id],
      );
    }

    for (const item of payload.items) {
      const productResult = await client.query(
        `
          SELECT id, name, track_inventory, track_expiration
          FROM cafeteria_products
          WHERE id = $1
          FOR UPDATE;
        `,
        [item.productId],
      );
      const product = productResult.rows[0];
      if (!product) {
        const err = new Error("Product not found");
        err.status = 404;
        throw err;
      }
      if (!isTruthy(product.track_inventory)) {
        const err = new Error("Product does not track inventory");
        err.status = 409;
        throw err;
      }

      let batchId = null;
      if (isTruthy(product.track_expiration)) {
        if (!item.expirationDate) {
          const err = new Error("Expiration date is required for this product");
          err.status = 400;
          throw err;
        }
        const batchResult = await client.query(
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
            RETURNING id;
          `,
          [
            item.productId,
            item.quantity,
            payload.receivedAt,
            item.expirationDate,
            item.lotNumber,
            String(purchase.id),
            payload.createdBy,
            payload.createdAt,
          ],
        );
        batchId = batchResult.rows[0]?.id ?? null;
      }

      const movementResult = await client.query(
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
          VALUES ($1, $2, 'PURCHASE', $3, $4, 'INVENTORY_PURCHASE', $5, $6, $7, $8)
          RETURNING id;
        `,
        [
          item.productId,
          batchId,
          item.quantity,
          payload.receivedAt,
          String(purchase.id),
          payload.description || "Compra de inventario",
          payload.createdBy,
          payload.createdAt,
        ],
      );
      const movementId = movementResult.rows[0]?.id ?? null;

      await client.query(
        `
          INSERT INTO inventory_purchase_items (
            purchase_id,
            product_id,
            product_name_snapshot,
            quantity,
            unit_cost,
            line_total,
            expiration_date,
            lot_number,
            inventory_batch_id,
            inventory_movement_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `,
        [
          purchase.id,
          item.productId,
          product.name,
          item.quantity,
          null,
          item.lineTotal,
          item.expirationDate,
          item.lotNumber,
          batchId,
          movementId,
        ],
      );
    }

    await client.query(
      `
        INSERT INTO audit_events (
          entity_type,
          entity_id,
          action,
          metadata,
          created_by,
          created_at
        )
        VALUES ('INVENTORY_PURCHASE', $1, 'CREATE', $2, $3, $4);
      `,
      [
        String(purchase.id),
        JSON.stringify({
          itemCount: payload.items.length,
          totalPaid: payload.totalPaid,
          expenseId,
        }),
        payload.createdBy,
        payload.createdAt,
      ],
    );

    await client.query("COMMIT");
    return { ...purchase, expense_id: expenseId };
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505" && payload.requestKey) {
      const existing = await db.query(
        "SELECT * FROM inventory_purchases WHERE request_key = $1 LIMIT 1;",
        [payload.requestKey],
      );
      if (existing.rows[0]) return { ...existing.rows[0], duplicate: true };
    }
    throw err;
  } finally {
    client.release();
  }
}

async function listInventoryPurchases() {
  const result = await db.query(
    `
      SELECT
        purchase.*,
        COALESCE(COUNT(item.id), 0)::INTEGER AS item_count,
        COALESCE(SUM(item.quantity), 0)::INTEGER AS total_quantity
      FROM inventory_purchases purchase
      LEFT JOIN inventory_purchase_items item ON item.purchase_id = purchase.id
      GROUP BY purchase.id
      ORDER BY purchase.received_at DESC, purchase.id DESC
      LIMIT 50;
    `,
  );
  return result.rows || [];
}

module.exports = async function initConsumer() {
  return {
    createInventoryPurchase,
    listInventoryPurchases,
  };
};
