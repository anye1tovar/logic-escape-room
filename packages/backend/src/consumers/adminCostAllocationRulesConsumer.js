const db = require("../db/initDb");

async function createAudit(client, payload) {
  await client.query(
    `
      INSERT INTO audit_events (
        entity_type, entity_id, action, metadata, created_by, created_at
      )
      VALUES ('COST_ALLOCATION_RULE', $1, $2, $3, $4, $5);
    `,
    [
      String(payload.id),
      payload.action,
      JSON.stringify(payload.metadata || {}),
      payload.userId,
      payload.at,
    ],
  );
}

async function assertNoOverlap(client, payload, excludeId = null) {
  const result = await client.query(
    `
      SELECT id, name
      FROM cost_allocation_rules
      WHERE active = TRUE
        AND expense_category = $1
        AND ($2::INTEGER IS NULL OR id <> $2)
        AND effective_from <= COALESCE($4, '9999-12-31')
        AND COALESCE(effective_to, '9999-12-31') >= $3
      LIMIT 1;
    `,
    [payload.expenseCategory, excludeId, payload.effectiveFrom, payload.effectiveTo],
  );
  if (result.rows[0]) {
    const error = new Error(
      `La vigencia se solapa con la regla activa "${result.rows[0].name}".`,
    );
    error.status = 409;
    throw error;
  }
}

async function lockCategory(client, expenseCategory) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1));", [
    `cost-allocation-rule:${expenseCategory}`,
  ]);
}

async function listRules(filters = {}) {
  const values = [];
  const clauses = [];
  if (filters.expenseCategory) {
    values.push(filters.expenseCategory);
    clauses.push(`expense_category = $${values.length}`);
  }
  if (filters.active != null) {
    values.push(filters.active);
    clauses.push(`active = $${values.length}`);
  }
  const result = await db.query(
    `
      SELECT *
      FROM cost_allocation_rules
      ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY active DESC, effective_from DESC, lower(name) ASC;
    `,
    values,
  );
  return result.rows || [];
}

async function createRule(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    if (payload.active) {
      await lockCategory(client, payload.expenseCategory);
      await assertNoOverlap(client, payload);
    }
    const result = await client.query(
      `
        INSERT INTO cost_allocation_rules (
          name, expense_category, effective_from, effective_to,
          rooms_percent, cafeteria_percent, admin_percent,
          active, created_at, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `,
      [
        payload.name,
        payload.expenseCategory,
        payload.effectiveFrom,
        payload.effectiveTo,
        payload.roomsPercent,
        payload.cafeteriaPercent,
        payload.adminPercent,
        payload.active,
        payload.at,
        payload.userId,
      ],
    );
    const rule = result.rows[0];
    await createAudit(client, {
      id: rule.id,
      action: "CREATE",
      metadata: rule,
      userId: payload.userId,
      at: payload.at,
    });
    await client.query("COMMIT");
    return rule;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateRule(id, payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const existingResult = await client.query(
      "SELECT * FROM cost_allocation_rules WHERE id = $1 FOR UPDATE;",
      [id],
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      const error = new Error("Regla de reparto no encontrada.");
      error.status = 404;
      throw error;
    }
    if (payload.active) {
      await lockCategory(client, payload.expenseCategory);
      await assertNoOverlap(client, payload, id);
    }
    const result = await client.query(
      `
        UPDATE cost_allocation_rules
        SET name = $1,
            expense_category = $2,
            effective_from = $3,
            effective_to = $4,
            rooms_percent = $5,
            cafeteria_percent = $6,
            admin_percent = $7,
            active = $8,
            updated_at = $9,
            updated_by = $10
        WHERE id = $11
        RETURNING *;
      `,
      [
        payload.name,
        payload.expenseCategory,
        payload.effectiveFrom,
        payload.effectiveTo,
        payload.roomsPercent,
        payload.cafeteriaPercent,
        payload.adminPercent,
        payload.active,
        payload.at,
        payload.userId,
        id,
      ],
    );
    const rule = result.rows[0];
    await createAudit(client, {
      id,
      action: "UPDATE",
      metadata: { previous: existing, current: rule },
      userId: payload.userId,
      at: payload.at,
    });
    await client.query("COMMIT");
    return rule;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findEffectiveRule(expenseCategory, effectiveDate) {
  const result = await db.query(
    `
      SELECT *
      FROM cost_allocation_rules
      WHERE active = TRUE
        AND expense_category = $1
        AND effective_from <= $2
        AND (effective_to IS NULL OR effective_to >= $2)
      ORDER BY effective_from DESC, id DESC
      LIMIT 1;
    `,
    [expenseCategory, effectiveDate],
  );
  return result.rows[0] || null;
}

async function getAllocationSummary(filters) {
  const result = await db.query(
    `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN cost_center = 'ROOMS' THEN total_amount
            WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
              THEN total_amount * allocation_percentage_rooms / 100.0
            ELSE 0
          END
        ), 0) AS rooms_amount,
        COALESCE(SUM(
          CASE
            WHEN cost_center = 'CAFETERIA' THEN total_amount
            WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
              THEN total_amount * allocation_percentage_cafeteria / 100.0
            ELSE 0
          END
        ), 0) AS cafeteria_amount,
        COALESCE(SUM(
          CASE
            WHEN cost_center IN ('ADMINISTRATION', 'MARKETING') THEN total_amount
            WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
              THEN total_amount * allocation_percentage_admin / 100.0
            ELSE 0
          END
        ), 0) AS admin_amount,
        COALESCE(SUM(
          CASE
            WHEN cost_center = 'UNASSIGNED'
              OR (cost_center = 'MIXED' AND allocation_mode <> 'PERCENTAGE')
              THEN total_amount
            ELSE 0
          END
        ), 0) AS pending_amount,
        COUNT(*) FILTER (
          WHERE cost_center = 'UNASSIGNED'
            OR (cost_center = 'MIXED' AND allocation_mode <> 'PERCENTAGE')
        )::INTEGER AS pending_count,
        COALESCE(SUM(total_amount), 0)::INTEGER AS total_amount
      FROM expenses
      WHERE status = 'ACTIVE'
        AND category <> 'OWNER_REIMBURSEMENT'
        AND occurred_at >= $1
        AND occurred_at <= $2;
    `,
    [filters.startMs, filters.endMs],
  );
  const row = result.rows[0] || {};
  return {
    roomsAmount: Math.round(Number(row.rooms_amount || 0)),
    cafeteriaAmount: Math.round(Number(row.cafeteria_amount || 0)),
    adminAmount: Math.round(Number(row.admin_amount || 0)),
    pendingAmount: Math.round(Number(row.pending_amount || 0)),
    pendingCount: Number(row.pending_count || 0),
    totalAmount: Number(row.total_amount || 0),
  };
}

module.exports = async function initConsumer() {
  return {
    listRules,
    createRule,
    updateRule,
    findEffectiveRule,
    getAllocationSummary,
  };
};
