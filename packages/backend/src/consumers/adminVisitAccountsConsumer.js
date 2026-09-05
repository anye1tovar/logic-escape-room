const db = require("../db/initDb");
const {
  saveOrderItemCostSnapshot,
  voidOrderItemCostSnapshot,
} = require("../utils/orderItemCostSnapshot");

const VISIT_SELECT = `
  visit.*,
  reservation.room_id,
  reservation.date AS reservation_date,
  reservation.start_time AS reservation_start_time,
  reservation.end_time AS reservation_end_time,
  reservation.first_name,
  reservation.last_name,
  reservation.players,
  reservation.total AS reservation_total,
  room.name AS room_name,
  COALESCE((
    SELECT SUM(payment.amount)
    FROM reservation_payments payment
    WHERE payment.reservation_id = visit.reservation_id
      AND payment.status = 'CONFIRMED'
  ), 0) AS reservation_total_paid,
  COALESCE((
    SELECT SUM(item.charged_subtotal)
    FROM order_items item
    WHERE item.visit_account_id = visit.id
      AND item.status = 'ACTIVE'
  ), 0) AS order_charged_total,
  COALESCE((
    SELECT SUM(item.commercial_subtotal)
    FROM order_items item
    WHERE item.visit_account_id = visit.id
      AND item.status = 'ACTIVE'
      AND item.type = 'COURTESY'
  ), 0) AS courtesy_commercial_total,
  COALESCE(reservation.total, 0) + COALESCE((
    SELECT SUM(item.charged_subtotal)
    FROM order_items item
    WHERE item.visit_account_id = visit.id
      AND item.status = 'ACTIVE'
  ), 0) AS visit_total,
  COALESCE((
    SELECT SUM(payment.amount)
    FROM reservation_payments payment
    WHERE payment.reservation_id = visit.reservation_id
      AND payment.status = 'CONFIRMED'
  ), 0) + COALESCE((
    SELECT SUM(payment.amount)
    FROM visit_payments payment
    WHERE payment.visit_account_id = visit.id
      AND payment.status = 'CONFIRMED'
  ), 0) AS total_paid,
  GREATEST(
    COALESCE(reservation.total, 0) + COALESCE((
      SELECT SUM(item.charged_subtotal)
      FROM order_items item
      WHERE item.visit_account_id = visit.id
        AND item.status = 'ACTIVE'
    ), 0) - COALESCE((
      SELECT SUM(payment.amount)
      FROM reservation_payments payment
      WHERE payment.reservation_id = visit.reservation_id
        AND payment.status = 'CONFIRMED'
    ), 0) - COALESCE((
      SELECT SUM(payment.amount)
      FROM visit_payments payment
      WHERE payment.visit_account_id = visit.id
        AND payment.status = 'CONFIRMED'
    ), 0),
    0
  ) AS pending_amount
`;

async function listVisitAccounts(filters = {}) {
  const values = [];
  const clauses = [];
  const status = String(filters.status || "").trim().toUpperCase();

  if (status) {
    values.push(status);
    clauses.push(`visit.status = $${values.length}`);
  } else if (filters.openOnly !== false) {
    clauses.push("visit.status NOT IN ('CLOSED', 'CANCELLED')");
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await db.query(
    `
      SELECT ${VISIT_SELECT}
      FROM visit_accounts visit
      LEFT JOIN reservations reservation ON reservation.id = visit.reservation_id
      LEFT JOIN rooms room ON room.id = reservation.room_id
      ${whereSql}
      ORDER BY visit.opened_at DESC, visit.id DESC;
    `,
    values
  );
  return result.rows || [];
}

async function getVisitAccountById(id) {
  const result = await db.query(
    `
      SELECT ${VISIT_SELECT}
      FROM visit_accounts visit
      LEFT JOIN reservations reservation ON reservation.id = visit.reservation_id
      LEFT JOIN rooms room ON room.id = reservation.room_id
      WHERE visit.id = $1
      LIMIT 1;
    `,
    [id]
  );
  return result.rows[0] || null;
}

async function getReservationById(id) {
  const result = await db.query("SELECT * FROM reservations WHERE id = $1;", [
    id,
  ]);
  return result.rows[0] || null;
}

async function getActiveVisitByReservationId(reservationId) {
  const result = await db.query(
    `
      SELECT *
      FROM visit_accounts
      WHERE reservation_id = $1
        AND status IN ('OPEN', 'PARTIALLY_PAID', 'PAID')
      LIMIT 1;
    `,
    [reservationId]
  );
  return result.rows[0] || null;
}

async function createVisitAccount(payload) {
  const result = await db.query(
    `
      INSERT INTO visit_accounts (
        reservation_id,
        display_name,
        location_label,
        status,
        opened_at,
        opened_by,
        notes
      )
      VALUES ($1, $2, $3, 'OPEN', $4, $5, $6)
      RETURNING *;
    `,
    [
      payload.reservationId,
      payload.displayName,
      payload.locationLabel,
      payload.openedAt,
      payload.openedBy,
      payload.notes,
    ]
  );
  return result.rows[0] || null;
}

async function updateVisitAccount(id, payload) {
  const result = await db.query(
    `
      UPDATE visit_accounts
      SET
        display_name = $1,
        location_label = $2,
        notes = $3
      WHERE id = $4
      RETURNING *;
    `,
    [payload.displayName, payload.locationLabel, payload.notes, id]
  );
  return result.rows[0] || null;
}

async function setVisitStatus(id, payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM visit_accounts WHERE id = $1 FOR UPDATE;", [
      id,
    ]);

    if (payload.status === "CANCELLED") {
      const itemsResult = await client.query(
        `
          SELECT *
          FROM order_items
          WHERE visit_account_id = $1
            AND status = 'ACTIVE'
          FOR UPDATE;
        `,
        [id]
      );
      for (const item of itemsResult.rows || []) {
        await createOrderInventoryMovement(client, {
          item,
          quantityDelta: Number(item.quantity || 0),
          type: "REVERSAL",
          reason: payload.closeReason || "Cancelacion de cuenta",
          createdBy: payload.closedBy,
          createdAt: payload.closedAt,
        });
        await voidOrderItemCostSnapshot(client, item.id, payload.closedAt);
      }
      await client.query(
        `
          UPDATE order_items
          SET
            status = 'CANCELLED',
            cancelled_at = $1,
            cancelled_by = $2,
            cancel_reason = $3
          WHERE visit_account_id = $4
            AND status = 'ACTIVE';
        `,
        [
          payload.closedAt,
          payload.closedBy,
          payload.closeReason || "Cancelacion de cuenta",
          id,
        ]
      );
    }

    const result = await client.query(
      `
        UPDATE visit_accounts
        SET
          status = $1,
          closed_at = $2,
          closed_by = $3,
          close_reason = $4
        WHERE id = $5
        RETURNING *;
      `,
      [
        payload.status,
        payload.closedAt,
        payload.closedBy,
        payload.closeReason,
        id,
      ]
    );
    await client.query("COMMIT");
    return result.rows[0] || null;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getProductById(id) {
  const result = await db.query(
    `
      SELECT
        product.*,
        COALESCE((
          SELECT SUM(movement.quantity_delta)
          FROM inventory_movements movement
          WHERE movement.product_id = product.id
        ), 0)::INTEGER AS current_stock
      FROM cafeteria_products product
      WHERE product.id = $1
      LIMIT 1;
    `,
    [id]
  );
  return result.rows[0] || null;
}

async function listOrderItems(visitAccountId) {
  const result = await db.query(
    `
      SELECT
        item.*,
        COALESCE((
          SELECT SUM(allocation.amount)
          FROM payment_allocations allocation
          JOIN visit_payments payment ON payment.id = allocation.payment_id
          WHERE allocation.order_item_id = item.id
            AND payment.status = 'CONFIRMED'
        ), 0) AS paid_allocated,
        GREATEST(item.charged_subtotal - COALESCE((
          SELECT SUM(allocation.amount)
          FROM payment_allocations allocation
          JOIN visit_payments payment ON payment.id = allocation.payment_id
          WHERE allocation.order_item_id = item.id
            AND payment.status = 'CONFIRMED'
        ), 0), 0) AS pending_amount,
        creator.name AS created_by_name,
        canceller.name AS cancelled_by_name,
        recipe.version AS recipe_version,
        cost_snapshot.unit_cost,
        cost_snapshot.total_cost,
        cost_snapshot.gross_profit,
        cost_snapshot.gross_margin,
        cost_snapshot.costing_method,
        cost_snapshot.cost_incomplete,
        cost_snapshot.status AS cost_status,
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'name', COALESCE(supply.name, cost_product.name),
              'quantity', component.quantity,
              'unitCost', component.unit_cost,
              'totalCost', component.total_cost,
              'costingMethod', component.costing_method,
              'costIncomplete', component.cost_incomplete,
              'supplyBatchId', component.supply_batch_id,
              'inventoryBatchId', component.inventory_batch_id
            )
            ORDER BY component.id
          )
          FROM order_item_cost_components component
          LEFT JOIN inventory_supplies supply ON supply.id = component.supply_id
          LEFT JOIN cafeteria_products cost_product ON cost_product.id = component.product_id
          WHERE component.snapshot_id = cost_snapshot.id
        ), '[]'::JSON) AS cost_components,
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'supplyId', consumption.supply_id,
              'supplyName', consumption.supply_name,
              'quantity', consumption.quantity,
              'unit', consumption.unit
            )
            ORDER BY consumption.supply_name
          )
          FROM (
            SELECT
              movement.supply_id,
              supply.name AS supply_name,
              ROUND(-SUM(movement.quantity_delta), 3) AS quantity,
              supply.consumption_unit AS unit
            FROM supply_inventory_movements movement
            JOIN inventory_supplies supply ON supply.id = movement.supply_id
            WHERE movement.source_type = 'ORDER_ITEM'
              AND movement.source_id = item.id::TEXT
              AND movement.recipe_id = item.recipe_id
            GROUP BY movement.supply_id, supply.name, supply.consumption_unit
            HAVING SUM(movement.quantity_delta) < 0
          ) consumption
        ), '[]'::JSON) AS recipe_consumption
      FROM order_items item
      LEFT JOIN users creator ON creator.id = item.created_by
      LEFT JOIN users canceller ON canceller.id = item.cancelled_by
      LEFT JOIN product_recipes recipe ON recipe.id = item.recipe_id
      LEFT JOIN order_item_cost_snapshots cost_snapshot
        ON cost_snapshot.order_item_id = item.id
      WHERE item.visit_account_id = $1
      ORDER BY item.status ASC, item.created_at DESC, item.id DESC;
    `,
    [visitAccountId]
  );
  return result.rows || [];
}

async function getFinancialAccountForPayment(id) {
  const result = await db.query(
    `
      SELECT *
      FROM financial_accounts
      WHERE id = $1
      LIMIT 1;
    `,
    [id]
  );
  return result.rows[0] || null;
}

async function listPaymentFinancialAccounts() {
  const result = await db.query(
    `
      SELECT id, name, type
      FROM financial_accounts
      WHERE active = TRUE
        AND available_for_customer_payments = TRUE
      ORDER BY lower(name) ASC;
    `
  );
  return result.rows || [];
}

async function listVisitPayments(visitAccountId) {
  const result = await db.query(
    `
      SELECT
        payment.*,
        account.name AS financial_account_name,
        account.type AS financial_account_type,
        creator.name AS created_by_name,
        COALESCE(JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', allocation.id,
            'orderItemId', allocation.order_item_id,
            'component', allocation.component,
            'amount', allocation.amount
          )
          ORDER BY allocation.id
        ) FILTER (WHERE allocation.id IS NOT NULL), '[]'::json) AS allocations
      FROM visit_payments payment
      LEFT JOIN financial_accounts account
        ON account.id = payment.financial_account_id
      LEFT JOIN users creator ON creator.id = payment.created_by
      LEFT JOIN payment_allocations allocation ON allocation.payment_id = payment.id
      WHERE payment.visit_account_id = $1
      GROUP BY payment.id, account.id, creator.id
      ORDER BY payment.paid_at DESC, payment.id DESC;
    `,
    [visitAccountId]
  );
  return result.rows || [];
}

async function getVisitPaymentById(visitAccountId, paymentId) {
  const result = await db.query(
    `
      SELECT *
      FROM visit_payments
      WHERE visit_account_id = $1
        AND id = $2
      LIMIT 1;
    `,
    [visitAccountId, paymentId]
  );
  return result.rows[0] || null;
}

async function createVisitPayment(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT id FROM visit_accounts WHERE id = $1 FOR UPDATE;",
      [payload.visitAccountId]
    );
    const pendingResult = await client.query(
      `
        SELECT
          GREATEST(
            COALESCE(reservation.total, 0) + COALESCE((
              SELECT SUM(item.charged_subtotal)
              FROM order_items item
              WHERE item.visit_account_id = visit.id
                AND item.status = 'ACTIVE'
            ), 0) - COALESCE((
              SELECT SUM(payment.amount)
              FROM reservation_payments payment
              WHERE payment.reservation_id = visit.reservation_id
                AND payment.status = 'CONFIRMED'
            ), 0) - COALESCE((
              SELECT SUM(payment.amount)
              FROM visit_payments payment
              WHERE payment.visit_account_id = visit.id
                AND payment.status = 'CONFIRMED'
            ), 0),
            0
          ) AS pending_amount
        FROM visit_accounts visit
        LEFT JOIN reservations reservation ON reservation.id = visit.reservation_id
        WHERE visit.id = $1
        LIMIT 1;
      `,
      [payload.visitAccountId]
    );
    const pendingAmount = Number(pendingResult.rows[0]?.pending_amount || 0);
    if (payload.amount > pendingAmount) {
      const err = new Error("Payment exceeds visit pending amount");
      err.status = 409;
      throw err;
    }

    for (const allocation of payload.allocations) {
      if (!allocation.orderItemId) continue;
      const itemResult = await client.query(
        `
          SELECT
            item.id,
            item.charged_subtotal
          FROM order_items item
          WHERE item.id = $1
            AND item.visit_account_id = $2
            AND item.status = 'ACTIVE'
          FOR UPDATE OF item;
        `,
        [allocation.orderItemId, payload.visitAccountId]
      );
      const item = itemResult.rows[0];
      if (!item) {
        const err = new Error("Order item not found");
        err.status = 404;
        throw err;
      }
      const allocatedResult = await client.query(
        `
          SELECT COALESCE(SUM(allocation.amount), 0) AS allocated
          FROM payment_allocations allocation
          JOIN visit_payments payment ON payment.id = allocation.payment_id
          WHERE allocation.order_item_id = $1
            AND payment.status = 'CONFIRMED';
        `,
        [allocation.orderItemId]
      );
      const pending =
        Number(item.charged_subtotal || 0) -
        Number(allocatedResult.rows[0]?.allocated || 0);
      if (allocation.amount > pending) {
        const err = new Error("Payment allocation exceeds item pending amount");
        err.status = 409;
        throw err;
      }
    }

    const paymentResult = await client.query(
      `
        INSERT INTO visit_payments (
          visit_account_id,
          amount,
          financial_account_id,
          paid_at,
          notes,
          created_by,
          created_at,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMED')
        RETURNING *;
      `,
      [
        payload.visitAccountId,
        payload.amount,
        payload.financialAccountId,
        payload.paidAt,
        payload.notes,
        payload.createdBy,
        payload.createdAt,
      ]
    );
    const payment = paymentResult.rows[0];

    for (const allocation of payload.allocations) {
      await client.query(
        `
          INSERT INTO payment_allocations (
            payment_id,
            order_item_id,
            component,
            amount
          )
          VALUES ($1, $2, $3, $4);
        `,
        [
          payment.id,
          allocation.orderItemId,
          allocation.component,
          allocation.amount,
        ]
      );
    }

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
        VALUES ($1, 'INCOME', $2, $3, $4, 'VISIT_PAYMENT', $5, $6, $7, 'ACTIVE')
        RETURNING id;
      `,
      [
        payload.financialAccountId,
        payload.amount,
        payload.paidAt,
        payload.notes || `Pago visita #${payload.visitAccountId}`,
        String(payment.id),
        payload.createdBy,
        payload.createdAt,
      ]
    );
    const movementId = movementResult.rows[0]?.id ?? null;
    await client.query(
      "UPDATE visit_payments SET financial_movement_id = $1 WHERE id = $2;",
      [movementId, payment.id]
    );

    const status = await calculateVisitOperationalStatus(
      client,
      payload.visitAccountId
    );
    await client.query(
      `
        UPDATE visit_accounts
        SET status = $1
        WHERE id = $2
          AND status NOT IN ('CLOSED', 'CANCELLED');
      `,
      [status, payload.visitAccountId]
    );

    await createAuditEventWithClient(client, {
      entityType: "VISIT_PAYMENT",
      entityId: String(payment.id),
      action: "CREATE",
      metadata: {
        visitAccountId: payload.visitAccountId,
        financialAccountId: payload.financialAccountId,
        amount: payload.amount,
        allocationCount: payload.allocations.length,
      },
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });

    await client.query("COMMIT");
    return { ...payment, financial_movement_id: movementId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function voidVisitPayment(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT id FROM visit_accounts WHERE id = $1 FOR UPDATE;",
      [payload.visitAccountId]
    );
    const result = await client.query(
      `
        UPDATE visit_payments
        SET
          status = 'VOIDED',
          voided_at = $1,
          voided_by = $2,
          void_reason = $3
        WHERE id = $4
          AND visit_account_id = $5
          AND status = 'CONFIRMED'
        RETURNING *;
      `,
      [
        payload.voidedAt,
        payload.voidedBy,
        payload.reason,
        payload.paymentId,
        payload.visitAccountId,
      ]
    );
    const payment = result.rows[0] || null;
    if (!payment) {
      await client.query("ROLLBACK");
      return null;
    }

    if (payment.financial_movement_id) {
      await client.query(
        `
          UPDATE financial_movements
          SET
            status = 'VOIDED',
            description = COALESCE(description, '') || $1
          WHERE id = $2;
        `,
        [` | Anulado: ${payload.reason}`, payment.financial_movement_id]
      );
    }

    const status = await calculateVisitOperationalStatus(
      client,
      payload.visitAccountId
    );
    await client.query(
      `
        UPDATE visit_accounts
        SET status = $1
        WHERE id = $2
          AND status NOT IN ('CLOSED', 'CANCELLED');
      `,
      [status, payload.visitAccountId]
    );

    await createAuditEventWithClient(client, {
      entityType: "VISIT_PAYMENT",
      entityId: String(payment.id),
      action: "VOID",
      metadata: {
        visitAccountId: payload.visitAccountId,
        reason: payload.reason,
      },
      createdBy: payload.voidedBy,
      createdAt: payload.voidedAt,
    });

    await client.query("COMMIT");
    return payment;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function calculateVisitOperationalStatus(client, visitAccountId) {
  const result = await client.query(
    `
      SELECT
        COALESCE(reservation.total, 0) + COALESCE((
          SELECT SUM(item.charged_subtotal)
          FROM order_items item
          WHERE item.visit_account_id = visit.id
            AND item.status = 'ACTIVE'
        ), 0) AS total,
        COALESCE((
          SELECT SUM(payment.amount)
          FROM reservation_payments payment
          WHERE payment.reservation_id = visit.reservation_id
            AND payment.status = 'CONFIRMED'
        ), 0) + COALESCE((
          SELECT SUM(payment.amount)
          FROM visit_payments payment
          WHERE payment.visit_account_id = visit.id
            AND payment.status = 'CONFIRMED'
        ), 0) AS paid
      FROM visit_accounts visit
      LEFT JOIN reservations reservation ON reservation.id = visit.reservation_id
      WHERE visit.id = $1
      LIMIT 1;
    `,
    [visitAccountId]
  );
  const row = result.rows[0] || {};
  const total = Number(row.total || 0);
  const paid = Number(row.paid || 0);
  if (total > 0 && paid >= total) return "PAID";
  if (paid > 0) return "PARTIALLY_PAID";
  return "OPEN";
}

async function getOrderItemById(visitAccountId, itemId) {
  const result = await db.query(
    `
      SELECT
        item.*,
        COALESCE((
          SELECT SUM(allocation.amount)
          FROM payment_allocations allocation
          JOIN visit_payments payment ON payment.id = allocation.payment_id
          WHERE allocation.order_item_id = item.id
            AND payment.status = 'CONFIRMED'
        ), 0) AS paid_allocated
      FROM order_items item
      WHERE item.visit_account_id = $1
        AND item.id = $2
      LIMIT 1;
    `,
    [visitAccountId, itemId]
  );
  return result.rows[0] || null;
}

async function createOrderItem(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const recipeId = await getActiveRecipeIdForProduct(client, payload.productId);
    await assertInventoryAvailableForOrderItem(client, {
      productId: payload.productId,
      productName: payload.productNameSnapshot,
      recipeId,
      quantity: payload.quantity,
    });
    const result = await client.query(
      `
        INSERT INTO order_items (
          visit_account_id,
          product_id,
          product_name_snapshot,
          unit_price_snapshot,
          quantity,
          commercial_subtotal,
          charged_subtotal,
          type,
          courtesy_reason,
          notes,
          recipe_id,
          status,
          created_at,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE', $12, $13)
        RETURNING *;
      `,
      [
        payload.visitAccountId,
        payload.productId,
        payload.productNameSnapshot,
        payload.unitPriceSnapshot,
        payload.quantity,
        payload.commercialSubtotal,
        payload.chargedSubtotal,
        payload.type,
        payload.courtesyReason,
        payload.notes,
        recipeId,
        payload.createdAt,
        payload.createdBy,
      ]
    );
    const item = result.rows[0];
    await createOrderInventoryMovement(client, {
      item,
      quantityDelta: -payload.quantity,
      type: payload.type === "COURTESY" ? "COURTESY" : "SALE",
      reason: payload.type === "COURTESY" ? payload.courtesyReason : "Venta",
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });
    await saveOrderItemCostSnapshot(client, item, payload.createdAt);
    await createAuditEventWithClient(client, {
      entityType: "ORDER_ITEM",
      entityId: String(item.id),
      action: payload.type === "COURTESY" ? "CREATE_COURTESY" : "CREATE",
      metadata: {
        visitAccountId: payload.visitAccountId,
        productId: payload.productId,
        quantity: payload.quantity,
        type: payload.type,
        courtesyReason: payload.courtesyReason,
        recipeId,
      },
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });
    const status = await calculateVisitOperationalStatus(
      client,
      payload.visitAccountId
    );
    await client.query(
      `
        UPDATE visit_accounts
        SET status = $1
        WHERE id = $2
          AND status NOT IN ('CLOSED', 'CANCELLED');
      `,
      [status, payload.visitAccountId]
    );
    await client.query("COMMIT");
    return item;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateOrderItemQuantity(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const existingResult = await client.query(
      `
        SELECT *
        FROM order_items
        WHERE id = $1
          AND visit_account_id = $2
          AND status = 'ACTIVE'
        FOR UPDATE;
      `,
      [payload.itemId, payload.visitAccountId]
    );
    const existing = existingResult.rows[0] || null;
    if (!existing) {
      await client.query("COMMIT");
      return null;
    }
    const quantityDiff = payload.quantity - Number(existing.quantity || 0);
    if (quantityDiff > 0) {
      await assertInventoryAvailableForOrderItem(client, {
        productId: existing.product_id,
        productName: existing.product_name_snapshot,
        recipeId: existing.recipe_id,
        quantity: quantityDiff,
      });
    }
    const result = await client.query(
      `
        UPDATE order_items
        SET
          quantity = $1,
          commercial_subtotal = $2,
          charged_subtotal = $3
        WHERE id = $4
          AND visit_account_id = $5
          AND status = 'ACTIVE'
        RETURNING *;
      `,
      [
        payload.quantity,
        payload.commercialSubtotal,
        payload.chargedSubtotal,
        payload.itemId,
        payload.visitAccountId,
      ]
    );
    const item = result.rows[0] || null;
    if (item) {
      if (quantityDiff !== 0) {
        await createOrderInventoryMovement(client, {
          item,
          quantityDelta: -quantityDiff,
          type:
            quantityDiff > 0
              ? String(item.type) === "COURTESY"
                ? "COURTESY"
                : "SALE"
              : "REVERSAL",
          reason:
            quantityDiff > 0
              ? "Aumento de cantidad"
              : "Reduccion de cantidad",
          createdBy: payload.updatedBy,
          createdAt: payload.updatedAt,
        });
      }
      await saveOrderItemCostSnapshot(client, item, payload.updatedAt);
      await createAuditEventWithClient(client, {
        entityType: "ORDER_ITEM",
        entityId: String(item.id),
        action: "UPDATE_QUANTITY",
        metadata: {
          visitAccountId: payload.visitAccountId,
          quantity: payload.quantity,
        },
        createdBy: payload.updatedBy,
        createdAt: payload.updatedAt,
      });
      const status = await calculateVisitOperationalStatus(
        client,
        payload.visitAccountId
      );
      await client.query(
        `
          UPDATE visit_accounts
          SET status = $1
          WHERE id = $2
            AND status NOT IN ('CLOSED', 'CANCELLED');
        `,
        [status, payload.visitAccountId]
      );
    }
    await client.query("COMMIT");
    return item;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function cancelOrderItem(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `
        UPDATE order_items
        SET
          status = 'CANCELLED',
          cancelled_at = $1,
          cancelled_by = $2,
          cancel_reason = $3
        WHERE id = $4
          AND visit_account_id = $5
          AND status = 'ACTIVE'
        RETURNING *;
      `,
      [
        payload.cancelledAt,
        payload.cancelledBy,
        payload.reason,
        payload.itemId,
        payload.visitAccountId,
      ]
    );
    const item = result.rows[0] || null;
    if (item) {
      await createOrderInventoryMovement(client, {
        item,
        quantityDelta: Number(item.quantity || 0),
        type: "REVERSAL",
        reason: payload.reason,
        createdBy: payload.cancelledBy,
        createdAt: payload.cancelledAt,
      });
      await voidOrderItemCostSnapshot(client, item.id, payload.cancelledAt);
      await createAuditEventWithClient(client, {
        entityType: "ORDER_ITEM",
        entityId: String(item.id),
        action: "CANCEL",
        metadata: {
          visitAccountId: payload.visitAccountId,
          reason: payload.reason,
        },
        createdBy: payload.cancelledBy,
        createdAt: payload.cancelledAt,
      });
      const status = await calculateVisitOperationalStatus(
        client,
        payload.visitAccountId
      );
      await client.query(
        `
          UPDATE visit_accounts
          SET status = $1
          WHERE id = $2
            AND status NOT IN ('CLOSED', 'CANCELLED');
        `,
        [status, payload.visitAccountId]
      );
    }
    await client.query("COMMIT");
    return item;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getInventoryProductForUpdate(client, productId) {
  const productResult = await client.query(
    `
      SELECT id, track_inventory, track_expiration
      FROM cafeteria_products
      WHERE id = $1
      FOR UPDATE;
    `,
    [productId]
  );
  const product = productResult.rows[0] || null;
  if (!product) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  const stockResult = await client.query(
    `
      SELECT COALESCE(SUM(quantity_delta), 0)::INTEGER AS current_stock
      FROM inventory_movements
      WHERE product_id = $1;
    `,
    [productId]
  );
  return {
    ...product,
    current_stock: Number(stockResult.rows[0]?.current_stock || 0),
  };
}

async function getActiveRecipeIdForProduct(client, productId) {
  await client.query(
    "SELECT id FROM cafeteria_products WHERE id = $1 FOR SHARE;",
    [productId]
  );
  const result = await client.query(
    `
      SELECT id
      FROM product_recipes
      WHERE product_id = $1 AND active = TRUE
      LIMIT 1;
    `,
    [productId]
  );
  return result.rows[0]?.id ?? null;
}

function roundSupplyQuantity(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

async function getRecipeItemsForUpdate(client, recipeId) {
  const result = await client.query(
    `
      SELECT
        item.supply_id,
        item.quantity,
        item.waste_percent,
        supply.name AS supply_name,
        supply.consumption_unit,
        supply.track_inventory,
        supply.track_expiration
      FROM product_recipe_items item
      JOIN product_recipes recipe ON recipe.id = item.recipe_id
      JOIN inventory_supplies supply ON supply.id = item.supply_id
      WHERE recipe.id = $1
      ORDER BY item.supply_id ASC
      FOR UPDATE OF supply;
    `,
    [recipeId]
  );
  if (result.rows.length === 0) {
    const err = new Error("Recipe has no supplies");
    err.status = 409;
    throw err;
  }
  return result.rows;
}

function requiredSupplyQuantity(recipeItem, productQuantity) {
  return roundSupplyQuantity(
    Number(recipeItem.quantity || 0) *
      (1 + Number(recipeItem.waste_percent || 0) / 100) *
      Number(productQuantity || 0)
  );
}

async function getSupplyAvailableStock(client, recipeItem, { lockBatches = false } = {}) {
  const tracksExpiration =
    recipeItem.track_expiration === true ||
    recipeItem.track_expiration === 1 ||
    recipeItem.track_expiration === "1";
  if (!tracksExpiration) {
    const result = await client.query(
      `
        SELECT COALESCE(SUM(quantity_delta), 0)::NUMERIC(14, 3) AS stock
        FROM supply_inventory_movements
        WHERE supply_id = $1;
      `,
      [recipeItem.supply_id]
    );
    return Number(result.rows[0]?.stock || 0);
  }
  const result = await client.query(
    `
      SELECT id, current_quantity
      FROM supply_batches
      WHERE supply_id = $1
        AND current_quantity > 0
        AND status = 'ACTIVE'
        AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE::TEXT)
      ORDER BY expiration_date ASC NULLS LAST, id ASC
      ${lockBatches ? "FOR UPDATE" : ""};
    `,
    [recipeItem.supply_id]
  );
  return (result.rows || []).reduce(
    (sum, batch) => sum + Number(batch.current_quantity || 0),
    0
  );
}

async function assertRecipeInventoryAvailable(client, payload) {
  const recipeItems = await getRecipeItemsForUpdate(client, payload.recipeId);
  for (const recipeItem of recipeItems) {
    const tracksInventory =
      recipeItem.track_inventory === true ||
      recipeItem.track_inventory === 1 ||
      recipeItem.track_inventory === "1";
    if (!tracksInventory) continue;
    const required = requiredSupplyQuantity(recipeItem, payload.quantity);
    const available = await getSupplyAvailableStock(client, recipeItem, {
      lockBatches: true,
    });
    if (available + 0.0005 < required) {
      const err = new Error(
        `No hay suficiente ${recipeItem.supply_name} para vender ${payload.quantity} ${payload.productName || "producto"}. Disponible: ${roundSupplyQuantity(available)} ${recipeItem.consumption_unit}. Requerido: ${required} ${recipeItem.consumption_unit}.`
      );
      err.status = 409;
      err.code = "INSUFFICIENT_RECIPE_STOCK";
      err.supplyId = recipeItem.supply_id;
      throw err;
    }
  }
}

async function assertInventoryAvailableForOrderItem(client, payload) {
  if (payload.recipeId) {
    return assertRecipeInventoryAvailable(client, payload);
  }
  const product = await getInventoryProductForUpdate(client, payload.productId);
  const tracksInventory =
    product.track_inventory === true ||
    product.track_inventory === 1 ||
    product.track_inventory === "1";
  if (!tracksInventory) return;
  const tracksExpiration =
    product.track_expiration === true ||
    product.track_expiration === 1 ||
    product.track_expiration === "1";
  if (!tracksExpiration && product.current_stock < payload.quantity) {
    const err = new Error("Insufficient stock");
    err.status = 409;
    throw err;
  }
  if (tracksExpiration) {
    const sellableResult = await client.query(
      `
        SELECT COALESCE(SUM(current_quantity), 0)::INTEGER AS sellable_stock
        FROM inventory_batches
        WHERE product_id = $1
          AND current_quantity > 0
          AND status = 'ACTIVE'
          AND expiration_date >= CURRENT_DATE::TEXT;
      `,
      [payload.productId]
    );
    if (Number(sellableResult.rows[0]?.sellable_stock || 0) >= payload.quantity) {
      return;
    }
    const err = new Error("Insufficient stock");
    err.status = 409;
    throw err;
  }
}

async function createOrderInventoryMovement(client, payload) {
  if (payload.item.recipe_id) {
    return createRecipeInventoryMovement(client, payload);
  }
  return createDirectOrderInventoryMovement(client, {
    ...payload,
    type:
      payload.type === "REVERSAL" || payload.quantityDelta > 0
        ? "DIRECT_REVERSAL"
        : String(payload.item.type).toUpperCase() === "COURTESY"
          ? "DIRECT_COURTESY"
          : "DIRECT_SALE",
  });
}

async function createDirectOrderInventoryMovement(client, payload) {
  const product = await getInventoryProductForUpdate(
    client,
    payload.item.product_id
  );
  const tracksInventory =
    product.track_inventory === true ||
    product.track_inventory === 1 ||
    product.track_inventory === "1";
  if (!tracksInventory || payload.quantityDelta === 0) return null;
  const tracksExpiration =
    product.track_expiration === true ||
    product.track_expiration === 1 ||
    product.track_expiration === "1";
  if (tracksExpiration && payload.quantityDelta < 0) {
    return consumeInventoryBatchesFefo(client, payload);
  }
  if (tracksExpiration && payload.quantityDelta > 0) {
    return restoreInventoryBatchesForOrderItem(client, payload);
  }
  if (product.current_stock + payload.quantityDelta < 0) {
    const err = new Error("Insufficient stock");
    err.status = 409;
    throw err;
  }
  const result = await client.query(
    `
      INSERT INTO inventory_movements (
        product_id,
        type,
        quantity_delta,
        occurred_at,
        source_type,
        source_id,
        reason,
        created_by,
        created_at
      )
      VALUES ($1, $2, $3, $4, 'ORDER_ITEM', $5, $6, $7, $8)
      RETURNING *;
    `,
    [
      payload.item.product_id,
      payload.type,
      payload.quantityDelta,
      payload.createdAt,
      String(payload.item.id),
      payload.reason,
      payload.createdBy,
      payload.createdAt,
    ]
  );
  return result.rows[0] || null;
}

async function consumeInventoryBatchesFefo(client, payload) {
  let remaining = Math.abs(Number(payload.quantityDelta || 0));
  const batchesResult = await client.query(
    `
      SELECT *
      FROM inventory_batches
      WHERE product_id = $1
        AND current_quantity > 0
        AND status = 'ACTIVE'
        AND expiration_date >= CURRENT_DATE::TEXT
      ORDER BY expiration_date ASC, id ASC
      FOR UPDATE;
    `,
    [payload.item.product_id]
  );
  const movements = [];
  for (const batch of batchesResult.rows || []) {
    if (remaining <= 0) break;
    const quantity = Math.min(Number(batch.current_quantity || 0), remaining);
    if (quantity <= 0) continue;
    await client.query(
      "UPDATE inventory_batches SET current_quantity = current_quantity - $1 WHERE id = $2;",
      [quantity, batch.id]
    );
    const movement = await insertInventoryMovement(client, {
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
  return movements;
}

async function restoreInventoryBatchesForOrderItem(client, payload) {
  let remaining = Number(payload.quantityDelta || 0);
  const consumedResult = await client.query(
    `
      SELECT
        inventory_batch_id,
        SUM(quantity_delta)::INTEGER AS net_quantity
      FROM inventory_movements
      WHERE source_type = 'ORDER_ITEM'
        AND source_id = $1
        AND inventory_batch_id IS NOT NULL
      GROUP BY inventory_batch_id
      HAVING SUM(quantity_delta) < 0
      ORDER BY MIN(id) ASC;
    `,
    [String(payload.item.id)]
  );
  const movements = [];
  for (const row of consumedResult.rows || []) {
    if (remaining <= 0) break;
    const quantity = Math.min(Math.abs(Number(row.net_quantity || 0)), remaining);
    if (quantity <= 0) continue;
    await client.query(
      "UPDATE inventory_batches SET current_quantity = current_quantity + $1 WHERE id = $2;",
      [quantity, row.inventory_batch_id]
    );
    const movement = await insertInventoryMovement(client, {
      ...payload,
      inventoryBatchId: row.inventory_batch_id,
      quantityDelta: quantity,
    });
    movements.push(movement);
    remaining -= quantity;
  }
  return movements;
}

async function insertInventoryMovement(client, payload) {
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
      VALUES ($1, $2, $3, $4, $5, 'ORDER_ITEM', $6, $7, $8, $9)
      RETURNING *;
    `,
    [
      payload.item.product_id,
      payload.inventoryBatchId ?? null,
      payload.type,
      payload.quantityDelta,
      payload.createdAt,
      String(payload.item.id),
      payload.reason,
      payload.createdBy,
      payload.createdAt,
    ]
  );
  return result.rows[0] || null;
}

async function createRecipeInventoryMovement(client, payload) {
  const recipeItems = await getRecipeItemsForUpdate(
    client,
    payload.item.recipe_id
  );
  const productQuantity = Math.abs(Number(payload.quantityDelta || 0));
  const isReversal = payload.quantityDelta > 0 || payload.type === "REVERSAL";
  const movementType = isReversal
    ? "RECIPE_REVERSAL"
    : String(payload.item.type).toUpperCase() === "COURTESY"
      ? "RECIPE_COURTESY"
      : "RECIPE_SALE";
  const movements = [];

  for (const recipeItem of recipeItems) {
    const tracksInventory =
      recipeItem.track_inventory === true ||
      recipeItem.track_inventory === 1 ||
      recipeItem.track_inventory === "1";
    if (!tracksInventory) continue;
    const quantity = requiredSupplyQuantity(recipeItem, productQuantity);
    if (quantity <= 0) continue;
    if (isReversal) {
      movements.push(
        ...(await restoreSupplyForOrderItem(client, {
          ...payload,
          recipeItem,
          quantity,
          movementType,
        }))
      );
    } else {
      movements.push(
        ...(await consumeSupplyForOrderItem(client, {
          ...payload,
          recipeItem,
          quantity,
          movementType,
        }))
      );
    }
  }
  return movements;
}

async function consumeSupplyForOrderItem(client, payload) {
  const tracksExpiration =
    payload.recipeItem.track_expiration === true ||
    payload.recipeItem.track_expiration === 1 ||
    payload.recipeItem.track_expiration === "1";
  if (!tracksExpiration) {
    return [
      await insertSupplyInventoryMovement(client, {
        ...payload,
        supplyBatchId: null,
        quantityDelta: -payload.quantity,
      }),
    ];
  }

  let remaining = payload.quantity;
  const batches = await client.query(
    `
      SELECT *
      FROM supply_batches
      WHERE supply_id = $1
        AND current_quantity > 0
        AND status = 'ACTIVE'
        AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE::TEXT)
      ORDER BY expiration_date ASC NULLS LAST, id ASC
      FOR UPDATE;
    `,
    [payload.recipeItem.supply_id]
  );
  const movements = [];
  for (const batch of batches.rows || []) {
    if (remaining <= 0.0005) break;
    const quantity = roundSupplyQuantity(
      Math.min(Number(batch.current_quantity || 0), remaining)
    );
    if (quantity <= 0) continue;
    await client.query(
      "UPDATE supply_batches SET current_quantity = current_quantity - $1 WHERE id = $2;",
      [quantity, batch.id]
    );
    movements.push(
      await insertSupplyInventoryMovement(client, {
        ...payload,
        supplyBatchId: batch.id,
        quantityDelta: -quantity,
      })
    );
    remaining = roundSupplyQuantity(remaining - quantity);
  }
  if (remaining > 0.0005) {
    const err = new Error(`Insufficient stock for ${payload.recipeItem.supply_name}`);
    err.status = 409;
    throw err;
  }
  return movements;
}

async function restoreSupplyForOrderItem(client, payload) {
  const tracksExpiration =
    payload.recipeItem.track_expiration === true ||
    payload.recipeItem.track_expiration === 1 ||
    payload.recipeItem.track_expiration === "1";
  if (!tracksExpiration) {
    const netResult = await client.query(
      `
        SELECT COALESCE(SUM(quantity_delta), 0)::NUMERIC(14, 3) AS net_quantity
        FROM supply_inventory_movements
        WHERE supply_id = $1
          AND recipe_id = $2
          AND source_type = 'ORDER_ITEM'
          AND source_id = $3;
      `,
      [
        payload.recipeItem.supply_id,
        payload.item.recipe_id,
        String(payload.item.id),
      ]
    );
    const consumed = Math.abs(
      Math.min(Number(netResult.rows[0]?.net_quantity || 0), 0)
    );
    const quantity = roundSupplyQuantity(Math.min(consumed, payload.quantity));
    if (quantity + 0.0005 < payload.quantity) {
      const err = new Error("Recipe inventory reversal exceeds original consumption");
      err.status = 409;
      throw err;
    }
    return [
      await insertSupplyInventoryMovement(client, {
        ...payload,
        supplyBatchId: null,
        quantityDelta: quantity,
      }),
    ];
  }

  let remaining = payload.quantity;
  const consumed = await client.query(
    `
      SELECT
        supply_batch_id,
        SUM(quantity_delta)::NUMERIC(14, 3) AS net_quantity,
        MIN(id) AS first_movement_id
      FROM supply_inventory_movements
      WHERE supply_id = $1
        AND recipe_id = $2
        AND source_type = 'ORDER_ITEM'
        AND source_id = $3
        AND supply_batch_id IS NOT NULL
      GROUP BY supply_batch_id
      HAVING SUM(quantity_delta) < 0
      ORDER BY MIN(id) ASC;
    `,
    [
      payload.recipeItem.supply_id,
      payload.item.recipe_id,
      String(payload.item.id),
    ]
  );
  const movements = [];
  for (const row of consumed.rows || []) {
    if (remaining <= 0.0005) break;
    const quantity = roundSupplyQuantity(
      Math.min(Math.abs(Number(row.net_quantity || 0)), remaining)
    );
    if (quantity <= 0) continue;
    await client.query(
      "UPDATE supply_batches SET current_quantity = current_quantity + $1 WHERE id = $2;",
      [quantity, row.supply_batch_id]
    );
    movements.push(
      await insertSupplyInventoryMovement(client, {
        ...payload,
        supplyBatchId: row.supply_batch_id,
        quantityDelta: quantity,
      })
    );
    remaining = roundSupplyQuantity(remaining - quantity);
  }
  if (remaining > 0.0005) {
    const err = new Error("Recipe batch reversal exceeds original consumption");
    err.status = 409;
    throw err;
  }
  return movements;
}

async function insertSupplyInventoryMovement(client, payload) {
  const result = await client.query(
    `
      INSERT INTO supply_inventory_movements (
        supply_id, supply_batch_id, recipe_id, type, quantity_delta,
        occurred_at, source_type, source_id, reason, created_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'ORDER_ITEM', $7, $8, $9, $10)
      RETURNING *;
    `,
    [
      payload.recipeItem.supply_id,
      payload.supplyBatchId,
      payload.item.recipe_id,
      payload.movementType,
      payload.quantityDelta,
      payload.createdAt,
      String(payload.item.id),
      payload.reason,
      payload.createdBy,
      payload.createdAt,
    ]
  );
  return result.rows[0];
}

async function createAuditEventWithClient(client, payload) {
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
      VALUES ($1, $2, $3, $4, $5, $6);
    `,
    [
      payload.entityType,
      payload.entityId,
      payload.action,
      JSON.stringify(payload.metadata || {}),
      payload.createdBy,
      payload.createdAt,
    ]
  );
}

module.exports = async function initConsumer() {
  return {
    listVisitAccounts,
    getVisitAccountById,
    getReservationById,
    getActiveVisitByReservationId,
    createVisitAccount,
    updateVisitAccount,
    setVisitStatus,
    getProductById,
    getFinancialAccountForPayment,
    listPaymentFinancialAccounts,
    listOrderItems,
    getOrderItemById,
    createOrderItem,
    updateOrderItemQuantity,
    cancelOrderItem,
    listVisitPayments,
    getVisitPaymentById,
    createVisitPayment,
    voidVisitPayment,
  };
};
