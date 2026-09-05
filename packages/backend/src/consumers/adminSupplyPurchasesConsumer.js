const db = require("../db/initDb");

function isTruthy(value) {
  return value === true || value === 1 || value === "1";
}

async function assertAccountCanSpend(client, accountId, amount) {
  const accountResult = await client.query(
    `SELECT id, active FROM financial_accounts WHERE id = $1 FOR UPDATE;`,
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
      WHERE financial_account_id = $1 AND status = 'ACTIVE';
    `,
    [accountId],
  );
  if (Number(balanceResult.rows[0]?.balance || 0) < amount) {
    const err = new Error("Insufficient funds in financial account");
    err.status = 409;
    throw err;
  }
}

async function createExpense(client, payload, purchaseId) {
  const description = payload.description || `Compra de insumos #${purchaseId}`;
  const result = await client.query(
    `
      INSERT INTO expenses (
        category, cost_center, allocation_mode,
        description, total_amount, occurred_at, notes,
        created_by, created_at, status
      )
      VALUES ('SUPPLIES', 'CAFETERIA', 'DIRECT', $1, $2, $3, NULL, $4, $5, 'ACTIVE')
      RETURNING *;
    `,
    [description, payload.totalPaid, payload.receivedAt, payload.createdBy, payload.createdAt],
  );
  const expense = result.rows[0];

  for (const allocation of payload.allocations) {
    let movementId = null;
    if (allocation.sourceType === "FINANCIAL_ACCOUNT") {
      await assertAccountCanSpend(
        client,
        allocation.financialAccountId,
        allocation.amount,
      );
      const movement = await client.query(
        `
          INSERT INTO financial_movements (
            financial_account_id, type, amount, occurred_at, description,
            source_type, source_id, created_by, created_at, status
          )
          VALUES ($1, 'EXPENSE', $2, $3, $4, 'EXPENSE', $5, $6, $7, 'ACTIVE')
          RETURNING id;
        `,
        [
          allocation.financialAccountId,
          -allocation.amount,
          payload.receivedAt,
          description,
          String(expense.id),
          payload.createdBy,
          payload.createdAt,
        ],
      );
      movementId = movement.rows[0]?.id ?? null;
    }

    await client.query(
      `
        INSERT INTO expense_funding_allocations (
          expense_id, source_type, financial_account_id, owner_name,
          contribution_kind, amount, financial_movement_id
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

async function createPurchase(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT * FROM supply_purchases WHERE request_key = $1 LIMIT 1;",
      [payload.requestKey],
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      return { ...existing.rows[0], duplicate: true };
    }

    const purchaseResult = await client.query(
      `
        INSERT INTO supply_purchases (
          request_key, received_at, supplier, description, total_amount,
          total_paid, created_by, created_at, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
        RETURNING *;
      `,
      [
        payload.requestKey,
        payload.receivedAt,
        payload.supplier,
        payload.description,
        payload.totalAmount,
        payload.totalPaid,
        payload.createdBy,
        payload.createdAt,
      ],
    );
    const purchase = purchaseResult.rows[0];
    let expenseId = null;

    if (payload.totalPaid != null) {
      const expense = await createExpense(client, payload, purchase.id);
      expenseId = expense.id;
      await client.query(
        "UPDATE supply_purchases SET expense_id = $1 WHERE id = $2;",
        [expenseId, purchase.id],
      );
    }

    for (const item of payload.items) {
      const supplyResult = await client.query(
        `
          SELECT id, name, purchase_unit, consumption_unit, conversion_factor,
                 track_inventory, track_expiration, active
          FROM inventory_supplies
          WHERE id = $1
          FOR UPDATE;
        `,
        [item.supplyId],
      );
      const supply = supplyResult.rows[0];
      if (!supply || !isTruthy(supply.active)) {
        const err = new Error("Supply not found or inactive");
        err.status = 404;
        throw err;
      }
      if (!isTruthy(supply.track_inventory)) {
        const err = new Error("Supply does not track inventory");
        err.status = 409;
        throw err;
      }

      const convertedQuantity = Math.round(
        item.purchasedQuantity * Number(supply.conversion_factor) * 1000,
      ) / 1000;
      if (!Number.isFinite(convertedQuantity) || convertedQuantity <= 0) {
        const err = new Error("Converted quantity is outside the supported precision");
        err.status = 400;
        throw err;
      }
      if (isTruthy(supply.track_expiration) && !item.expirationDate) {
        const err = new Error("Expiration date is required for this supply");
        err.status = 400;
        throw err;
      }

      let batchId = null;
      if (isTruthy(supply.track_expiration)) {
        const batch = await client.query(
          `
            INSERT INTO supply_batches (
              supply_id, received_quantity, current_quantity, received_at,
              expiration_date, lot_number, purchase_id, created_by, created_at, status
            )
            VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
            RETURNING id;
          `,
          [
            item.supplyId,
            convertedQuantity,
            payload.receivedAt,
            item.expirationDate,
            item.lotNumber,
            purchase.id,
            payload.createdBy,
            payload.createdAt,
          ],
        );
        batchId = batch.rows[0]?.id ?? null;
      }

      const movement = await client.query(
        `
          INSERT INTO supply_inventory_movements (
            supply_id, supply_batch_id, type, quantity_delta, occurred_at,
            source_type, source_id, reason, created_by, created_at
          )
          VALUES ($1, $2, 'PURCHASE', $3, $4, 'SUPPLY_PURCHASE', $5, $6, $7, $8)
          RETURNING id;
        `,
        [
          item.supplyId,
          batchId,
          convertedQuantity,
          payload.receivedAt,
          String(purchase.id),
          payload.description || "Compra de insumos",
          payload.createdBy,
          payload.createdAt,
        ],
      );

      await client.query(
        `
          INSERT INTO supply_purchase_items (
            purchase_id, supply_id, supply_name_snapshot, purchase_unit_snapshot,
            consumption_unit_snapshot, conversion_factor_snapshot,
            purchased_quantity, converted_quantity, line_total, expiration_date,
            lot_number, supply_batch_id, inventory_movement_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
        `,
        [
          purchase.id,
          item.supplyId,
          supply.name,
          supply.purchase_unit,
          supply.consumption_unit,
          supply.conversion_factor,
          item.purchasedQuantity,
          convertedQuantity,
          item.lineTotal,
          item.expirationDate,
          item.lotNumber,
          batchId,
          movement.rows[0]?.id ?? null,
        ],
      );
    }

    await client.query(
      `
        INSERT INTO audit_events (
          entity_type, entity_id, action, metadata, created_by, created_at
        )
        VALUES ('SUPPLY_PURCHASE', $1, 'CREATE', $2, $3, $4);
      `,
      [
        String(purchase.id),
        JSON.stringify({
          itemCount: payload.items.length,
          totalAmount: payload.totalAmount,
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
    if (err.code === "23505") {
      const existing = await db.query(
        "SELECT * FROM supply_purchases WHERE request_key = $1 LIMIT 1;",
        [payload.requestKey],
      );
      if (existing.rows[0]) return { ...existing.rows[0], duplicate: true };
    }
    throw err;
  } finally {
    client.release();
  }
}

async function listPurchases() {
  const result = await db.query(
    `
      SELECT
        purchase.*,
        COUNT(item.id)::INTEGER AS item_count,
        COALESCE(SUM(item.purchased_quantity), 0)::NUMERIC(14, 3) AS purchased_quantity,
        COALESCE(SUM(item.converted_quantity), 0)::NUMERIC(14, 3) AS converted_quantity
      FROM supply_purchases purchase
      LEFT JOIN supply_purchase_items item ON item.purchase_id = purchase.id
      GROUP BY purchase.id
      ORDER BY purchase.received_at DESC, purchase.id DESC
      LIMIT 50;
    `,
  );
  return result.rows || [];
}

module.exports = async function initAdminSupplyPurchasesConsumer() {
  return { createPurchase, listPurchases };
};
