const db = require("../db/initDb");

const ACTIVE_MOVEMENT_STATUS = "ACTIVE";

function expenseBusinessDate(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Number(timestamp)));
}

async function resolveExpenseAllocation(client, payload, existing = null) {
  if (payload.costCenter !== "MIXED") {
    return {
      ...payload,
      allocationMode: "DIRECT",
      allocationSource: "DIRECT",
      allocationPercentageRooms: null,
      allocationPercentageCafeteria: null,
      allocationPercentageAdmin: null,
      allocationRuleId: null,
      allocationRuleNameSnapshot: null,
    };
  }
  if (payload.allocationSource === "MANUAL") {
    return {
      ...payload,
      allocationMode: "PERCENTAGE",
      allocationRuleId: null,
      allocationRuleNameSnapshot: null,
    };
  }
  if (
    existing?.allocation_source === "RULE" &&
    existing.allocation_rule_id &&
    existing.category === payload.category &&
    Number(existing.occurred_at) === Number(payload.occurredAt)
  ) {
    return {
      ...payload,
      allocationMode: "PERCENTAGE",
      allocationSource: "RULE",
      allocationPercentageRooms: Number(existing.allocation_percentage_rooms),
      allocationPercentageCafeteria: Number(
        existing.allocation_percentage_cafeteria,
      ),
      allocationPercentageAdmin: Number(existing.allocation_percentage_admin),
      allocationRuleId: existing.allocation_rule_id,
      allocationRuleNameSnapshot: existing.allocation_rule_name_snapshot,
    };
  }
  const effectiveDate = expenseBusinessDate(payload.occurredAt);
  const ruleResult = await client.query(
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
    [payload.category, effectiveDate],
  );
  const rule = ruleResult.rows[0];
  if (!rule) {
    return {
      ...payload,
      allocationMode: "PENDING",
      allocationSource: "PENDING",
      allocationPercentageRooms: null,
      allocationPercentageCafeteria: null,
      allocationPercentageAdmin: null,
      allocationRuleId: null,
      allocationRuleNameSnapshot: null,
    };
  }
  return {
    ...payload,
    allocationMode: "PERCENTAGE",
    allocationSource: "RULE",
    allocationPercentageRooms: Number(rule.rooms_percent),
    allocationPercentageCafeteria: Number(rule.cafeteria_percent),
    allocationPercentageAdmin: Number(rule.admin_percent),
    allocationRuleId: rule.id,
    allocationRuleNameSnapshot: rule.name,
  };
}

function mapAccountRow(row) {
  return {
    ...row,
    balance: Number(row.balance || 0),
  };
}

async function listAccounts() {
  const result = await db.query(
    `
      SELECT
        account.*,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1 THEN movement.amount
            ELSE 0
          END
        ), 0) AS balance
      FROM financial_accounts account
      LEFT JOIN financial_movements movement
        ON movement.financial_account_id = account.id
      GROUP BY account.id
      ORDER BY account.active DESC, lower(account.name) ASC;
    `,
    [ACTIVE_MOVEMENT_STATUS]
  );
  return (result.rows || []).map(mapAccountRow);
}

async function getAccountById(id) {
  const result = await db.query(
    `
      SELECT
        account.*,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $2 THEN movement.amount
            ELSE 0
          END
        ), 0) AS balance
      FROM financial_accounts account
      LEFT JOIN financial_movements movement
        ON movement.financial_account_id = account.id
      WHERE account.id = $1
      GROUP BY account.id
      LIMIT 1;
    `,
    [id, ACTIVE_MOVEMENT_STATUS]
  );
  const row = result.rows[0] || null;
  return row ? mapAccountRow(row) : null;
}

async function createAccount(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const accountResult = await client.query(
      `
        INSERT INTO financial_accounts (
          name,
          type,
          active,
          available_for_customer_payments,
          reconciliation_enabled,
          created_at,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `,
      [
        payload.name,
        payload.type,
        payload.active,
        payload.availableForCustomerPayments,
        payload.reconciliationEnabled,
        payload.createdAt,
        payload.createdBy,
      ]
    );
    const account = accountResult.rows[0];

    await client.query(
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
        VALUES ($1, 'INITIAL_BALANCE', $2, $3, $4, 'FINANCIAL_ACCOUNT', $5, $6, $7, 'ACTIVE');
      `,
      [
        account.id,
        payload.initialBalance,
        payload.initialBalanceAt,
        payload.initialBalanceNotes,
        String(account.id),
        payload.createdBy,
        payload.createdAt,
      ]
    );

    await client.query("COMMIT");
    return { ...account, balance: payload.initialBalance };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateAccount(id, payload) {
  const result = await db.query(
    `
      UPDATE financial_accounts
      SET
        name = $1,
        type = $2,
        active = $3,
        available_for_customer_payments = $4,
        reconciliation_enabled = $5
      WHERE id = $6
      RETURNING *;
    `,
    [
      payload.name,
      payload.type,
      payload.active,
      payload.availableForCustomerPayments,
      payload.reconciliationEnabled,
      id,
    ]
  );
  return result.rows[0] || null;
}

async function listMovements(accountId, filters = {}) {
  const values = [accountId];
  const clauses = ["financial_account_id = $1"];

  if (filters.type) {
    values.push(filters.type);
    clauses.push(`type = $${values.length}`);
  }
  if (filters.dateFromMs != null) {
    values.push(filters.dateFromMs);
    clauses.push(`occurred_at >= $${values.length}`);
  }
  if (filters.dateToMs != null) {
    values.push(filters.dateToMs);
    clauses.push(`occurred_at <= $${values.length}`);
  }

  const result = await db.query(
    `
      SELECT *
      FROM financial_movements
      WHERE ${clauses.join(" AND ")}
      ORDER BY occurred_at DESC, id DESC;
    `,
    values
  );
  return result.rows || [];
}

async function createExpense(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    payload = await resolveExpenseAllocation(client, payload);
    const expenseResult = await client.query(
      `
        INSERT INTO expenses (
          category,
          cost_center,
          allocation_mode,
          allocation_percentage_rooms,
          allocation_percentage_cafeteria,
          allocation_percentage_admin,
          allocation_source,
          allocation_rule_id,
          allocation_rule_name_snapshot,
          description,
          total_amount,
          occurred_at,
          notes,
          created_by,
          created_at,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'ACTIVE')
        RETURNING *;
      `,
      [
        payload.category,
        payload.costCenter,
        payload.allocationMode,
        payload.allocationPercentageRooms,
        payload.allocationPercentageCafeteria,
        payload.allocationPercentageAdmin,
        payload.allocationSource,
        payload.allocationRuleId,
        payload.allocationRuleNameSnapshot,
        payload.description,
        payload.totalAmount,
        payload.occurredAt,
        payload.notes,
        payload.createdBy,
        payload.createdAt,
      ]
    );
    const expense = expenseResult.rows[0];

    for (const allocation of payload.allocations) {
      let movementId = null;
      if (allocation.sourceType === "FINANCIAL_ACCOUNT") {
        await assertAccountCanSpend(
          client,
          allocation.financialAccountId,
          allocation.amount
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
            payload.occurredAt,
            payload.description,
            String(expense.id),
            payload.createdBy,
            payload.createdAt,
          ]
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
        ]
      );
    }

    await createAuditEventWithClient(client, {
      entityType: "EXPENSE",
      entityId: String(expense.id),
      action: "CREATE",
      metadata: {
        category: payload.category,
        costCenter: payload.costCenter,
        allocationMode: payload.allocationMode,
        allocationPercentageRooms: payload.allocationPercentageRooms,
        allocationPercentageCafeteria: payload.allocationPercentageCafeteria,
        allocationPercentageAdmin: payload.allocationPercentageAdmin,
        allocationSource: payload.allocationSource,
        allocationRuleId: payload.allocationRuleId,
        totalAmount: payload.totalAmount,
        allocationCount: payload.allocations.length,
      },
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });

    await client.query("COMMIT");
    return expense;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateExpense(id, payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const existingResult = await client.query(
      "SELECT * FROM expenses WHERE id = $1 FOR UPDATE;",
      [id]
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      const err = new Error("Expense not found");
      err.status = 404;
      throw err;
    }
    if (existing.status !== "ACTIVE") {
      const err = new Error("Only active expenses can be edited");
      err.status = 409;
      throw err;
    }
    payload = await resolveExpenseAllocation(client, payload, existing);

    await client.query(
      `
        UPDATE financial_movements
        SET status = 'VOIDED'
        WHERE source_type = 'EXPENSE'
          AND source_id = $1
          AND status = 'ACTIVE';
      `,
      [String(id)]
    );
    await client.query(
      "DELETE FROM expense_funding_allocations WHERE expense_id = $1;",
      [id]
    );
    const expenseResult = await client.query(
      `
        UPDATE expenses
        SET category = $1, cost_center = $2, allocation_mode = $3,
            allocation_percentage_rooms = $4,
            allocation_percentage_cafeteria = $5,
            allocation_percentage_admin = $6,
            allocation_source = $7,
            allocation_rule_id = $8,
            allocation_rule_name_snapshot = $9,
            description = $10, total_amount = $11,
            occurred_at = $12, notes = $13
        WHERE id = $14
        RETURNING *;
      `,
      [
        payload.category,
        payload.costCenter,
        payload.allocationMode,
        payload.allocationPercentageRooms,
        payload.allocationPercentageCafeteria,
        payload.allocationPercentageAdmin,
        payload.allocationSource,
        payload.allocationRuleId,
        payload.allocationRuleNameSnapshot,
        payload.description,
        payload.totalAmount,
        payload.occurredAt,
        payload.notes,
        id,
      ]
    );
    const expense = expenseResult.rows[0];

    for (const allocation of payload.allocations) {
      let movementId = null;
      if (allocation.sourceType === "FINANCIAL_ACCOUNT") {
        await assertAccountCanSpend(
          client,
          allocation.financialAccountId,
          allocation.amount
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
            payload.occurredAt,
            payload.description,
            String(id),
            payload.createdBy,
            payload.createdAt,
          ]
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
          id,
          allocation.sourceType,
          allocation.financialAccountId,
          allocation.ownerName,
          allocation.contributionKind,
          allocation.amount,
          movementId,
        ]
      );
    }

    await createAuditEventWithClient(client, {
      entityType: "EXPENSE",
      entityId: String(id),
      action: "UPDATE",
      metadata: {
        category: payload.category,
        previousClassification: {
          category: existing.category,
          costCenter: existing.cost_center,
          allocationMode: existing.allocation_mode,
          allocationPercentageRooms: existing.allocation_percentage_rooms,
          allocationPercentageCafeteria: existing.allocation_percentage_cafeteria,
          allocationPercentageAdmin: existing.allocation_percentage_admin,
          allocationSource: existing.allocation_source,
          allocationRuleId: existing.allocation_rule_id,
        },
        classification: {
          category: payload.category,
          costCenter: payload.costCenter,
          allocationMode: payload.allocationMode,
          allocationPercentageRooms: payload.allocationPercentageRooms,
          allocationPercentageCafeteria: payload.allocationPercentageCafeteria,
          allocationPercentageAdmin: payload.allocationPercentageAdmin,
          allocationSource: payload.allocationSource,
          allocationRuleId: payload.allocationRuleId,
        },
        totalAmount: payload.totalAmount,
        allocationCount: payload.allocations.length,
      },
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });

    await client.query("COMMIT");
    return expense;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function voidExpense(id, payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "UPDATE expenses SET status = 'VOIDED' WHERE id = $1 AND status = 'ACTIVE' RETURNING *;",
      [id]
    );
    const expense = result.rows[0];
    if (!expense) {
      const err = new Error("Expense not found or already voided");
      err.status = 404;
      throw err;
    }
    await client.query(
      `
        UPDATE financial_movements
        SET status = 'VOIDED'
        WHERE source_type = 'EXPENSE'
          AND source_id = $1
          AND status = 'ACTIVE';
      `,
      [String(id)]
    );
    await createAuditEventWithClient(client, {
      entityType: "EXPENSE",
      entityId: String(id),
      action: "VOID",
      metadata: {},
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });
    await client.query("COMMIT");
    return expense;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listExpenses(filters = {}) {
  const values = [];
  const clauses = [];
  if (filters.category) {
    values.push(filters.category);
    clauses.push(`expense.category = $${values.length}`);
  }
  if (filters.costCenter) {
    values.push(filters.costCenter);
    clauses.push(`expense.cost_center = $${values.length}`);
  }
  const result = await db.query(
    `
      SELECT
        expense.*,
        COALESCE(JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', allocation.id,
            'sourceType', allocation.source_type,
            'financialAccountId', allocation.financial_account_id,
            'financialAccountName', account.name,
            'ownerName', allocation.owner_name,
            'contributionKind', allocation.contribution_kind,
            'amount', allocation.amount
          )
          ORDER BY allocation.id
        ) FILTER (WHERE allocation.id IS NOT NULL), '[]'::json) AS allocations
      FROM expenses expense
      LEFT JOIN expense_funding_allocations allocation
        ON allocation.expense_id = expense.id
      LEFT JOIN financial_accounts account
        ON account.id = allocation.financial_account_id
      ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
      GROUP BY expense.id
      ORDER BY expense.occurred_at DESC, expense.id DESC
      LIMIT 100;
    `,
    values
  );
  return result.rows || [];
}

async function createOwnerContribution(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await assertActiveAccount(client, payload.financialAccountId);
    const contributionResult = await client.query(
      `
        INSERT INTO owner_contributions (
          financial_account_id,
          owner_name,
          contribution_kind,
          amount,
          occurred_at,
          notes,
          created_by,
          created_at,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
        RETURNING *;
      `,
      [
        payload.financialAccountId,
        payload.ownerName,
        payload.contributionKind,
        payload.amount,
        payload.occurredAt,
        payload.notes,
        payload.createdBy,
        payload.createdAt,
      ]
    );
    const contribution = contributionResult.rows[0];
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
        VALUES ($1, 'OWNER_CONTRIBUTION', $2, $3, $4, 'OWNER_CONTRIBUTION', $5, $6, $7, 'ACTIVE')
        RETURNING id;
      `,
      [
        payload.financialAccountId,
        payload.amount,
        payload.occurredAt,
        payload.notes || "Aporte de propietario",
        String(contribution.id),
        payload.createdBy,
        payload.createdAt,
      ]
    );
    await client.query(
      "UPDATE owner_contributions SET financial_movement_id = $1 WHERE id = $2;",
      [movementResult.rows[0]?.id ?? null, contribution.id]
    );
    await createAuditEventWithClient(client, {
      entityType: "OWNER_CONTRIBUTION",
      entityId: String(contribution.id),
      action: "CREATE",
      metadata: {
        financialAccountId: payload.financialAccountId,
        amount: payload.amount,
        contributionKind: payload.contributionKind,
      },
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });
    await client.query("COMMIT");
    return contribution;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateOwnerContribution(id, payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const existingResult = await client.query(
      "SELECT * FROM owner_contributions WHERE id = $1 FOR UPDATE;",
      [id]
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      const err = new Error("Owner contribution not found");
      err.status = 404;
      throw err;
    }
    if (existing.status !== "ACTIVE") {
      const err = new Error("Only active owner contributions can be edited");
      err.status = 409;
      throw err;
    }
    await client.query(
      "UPDATE financial_movements SET status = 'VOIDED' WHERE id = $1 AND status = 'ACTIVE';",
      [existing.financial_movement_id]
    );
    await assertActiveAccount(client, payload.financialAccountId);
    const contributionResult = await client.query(
      `
        UPDATE owner_contributions
        SET financial_account_id = $1, owner_name = $2,
            contribution_kind = $3, amount = $4, occurred_at = $5, notes = $6
        WHERE id = $7
        RETURNING *;
      `,
      [
        payload.financialAccountId,
        payload.ownerName,
        payload.contributionKind,
        payload.amount,
        payload.occurredAt,
        payload.notes,
        id,
      ]
    );
    const contribution = contributionResult.rows[0];
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
        VALUES ($1, 'OWNER_CONTRIBUTION', $2, $3, $4, 'OWNER_CONTRIBUTION', $5, $6, $7, 'ACTIVE')
        RETURNING id;
      `,
      [
        payload.financialAccountId,
        payload.amount,
        payload.occurredAt,
        payload.notes || payload.description || "Aporte de propietario",
        String(id),
        payload.createdBy,
        payload.createdAt,
      ]
    );
    await client.query(
      "UPDATE owner_contributions SET financial_movement_id = $1 WHERE id = $2;",
      [movementResult.rows[0]?.id ?? null, id]
    );
    await createAuditEventWithClient(client, {
      entityType: "OWNER_CONTRIBUTION",
      entityId: String(id),
      action: "UPDATE",
      metadata: {
        financialAccountId: payload.financialAccountId,
        amount: payload.amount,
        contributionKind: payload.contributionKind,
      },
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });
    await client.query("COMMIT");
    return contribution;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function voidOwnerContribution(id, payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "UPDATE owner_contributions SET status = 'VOIDED' WHERE id = $1 AND status = 'ACTIVE' RETURNING *;",
      [id]
    );
    const contribution = result.rows[0];
    if (!contribution) {
      const err = new Error("Owner contribution not found or already voided");
      err.status = 404;
      throw err;
    }
    await client.query(
      "UPDATE financial_movements SET status = 'VOIDED' WHERE id = $1 AND status = 'ACTIVE';",
      [contribution.financial_movement_id]
    );
    await createAuditEventWithClient(client, {
      entityType: "OWNER_CONTRIBUTION",
      entityId: String(id),
      action: "VOID",
      metadata: {},
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });
    await client.query("COMMIT");
    return contribution;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function createTransfer(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await assertAccountCanSpend(
      client,
      payload.fromFinancialAccountId,
      payload.amount
    );
    await assertActiveAccount(client, payload.toFinancialAccountId);

    const transferResult = await client.query(
      `
        INSERT INTO financial_transfers (
          from_financial_account_id,
          to_financial_account_id,
          amount,
          occurred_at,
          notes,
          created_by,
          created_at,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
        RETURNING *;
      `,
      [
        payload.fromFinancialAccountId,
        payload.toFinancialAccountId,
        payload.amount,
        payload.occurredAt,
        payload.notes,
        payload.createdBy,
        payload.createdAt,
      ]
    );
    const transfer = transferResult.rows[0];

    const outMovement = await client.query(
      `
        INSERT INTO financial_movements (
          financial_account_id, type, amount, occurred_at, description,
          source_type, source_id, created_by, created_at, status
        )
        VALUES ($1, 'TRANSFER_OUT', $2, $3, $4, 'TRANSFER', $5, $6, $7, 'ACTIVE')
        RETURNING id;
      `,
      [
        payload.fromFinancialAccountId,
        -payload.amount,
        payload.occurredAt,
        payload.notes || `Transferencia #${transfer.id}`,
        String(transfer.id),
        payload.createdBy,
        payload.createdAt,
      ]
    );
    const inMovement = await client.query(
      `
        INSERT INTO financial_movements (
          financial_account_id, type, amount, occurred_at, description,
          source_type, source_id, created_by, created_at, status
        )
        VALUES ($1, 'TRANSFER_IN', $2, $3, $4, 'TRANSFER', $5, $6, $7, 'ACTIVE')
        RETURNING id;
      `,
      [
        payload.toFinancialAccountId,
        payload.amount,
        payload.occurredAt,
        payload.notes || `Transferencia #${transfer.id}`,
        String(transfer.id),
        payload.createdBy,
        payload.createdAt,
      ]
    );
    await client.query(
      `
        UPDATE financial_transfers
        SET out_movement_id = $1, in_movement_id = $2
        WHERE id = $3;
      `,
      [
        outMovement.rows[0]?.id ?? null,
        inMovement.rows[0]?.id ?? null,
        transfer.id,
      ]
    );
    await createAuditEventWithClient(client, {
      entityType: "TRANSFER",
      entityId: String(transfer.id),
      action: "CREATE",
      metadata: {
        fromFinancialAccountId: payload.fromFinancialAccountId,
        toFinancialAccountId: payload.toFinancialAccountId,
        amount: payload.amount,
      },
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });
    await client.query("COMMIT");
    return transfer;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateTransfer(id, payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const existingResult = await client.query(
      "SELECT * FROM financial_transfers WHERE id = $1 FOR UPDATE;",
      [id]
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      const err = new Error("Transfer not found");
      err.status = 404;
      throw err;
    }
    if (existing.status !== "ACTIVE") {
      const err = new Error("Only active transfers can be edited");
      err.status = 409;
      throw err;
    }
    await client.query(
      "UPDATE financial_movements SET status = 'VOIDED' WHERE id IN ($1, $2) AND status = 'ACTIVE';",
      [existing.out_movement_id, existing.in_movement_id]
    );
    await assertAccountCanSpend(
      client,
      payload.fromFinancialAccountId,
      payload.amount
    );
    await assertActiveAccount(client, payload.toFinancialAccountId);

    const transferResult = await client.query(
      `
        UPDATE financial_transfers
        SET from_financial_account_id = $1, to_financial_account_id = $2,
            amount = $3, occurred_at = $4, notes = $5
        WHERE id = $6
        RETURNING *;
      `,
      [
        payload.fromFinancialAccountId,
        payload.toFinancialAccountId,
        payload.amount,
        payload.occurredAt,
        payload.notes,
        id,
      ]
    );
    const transfer = transferResult.rows[0];
    const outMovement = await client.query(
      `
        INSERT INTO financial_movements (
          financial_account_id, type, amount, occurred_at, description,
          source_type, source_id, created_by, created_at, status
        )
        VALUES ($1, 'TRANSFER_OUT', $2, $3, $4, 'TRANSFER', $5, $6, $7, 'ACTIVE')
        RETURNING id;
      `,
      [
        payload.fromFinancialAccountId,
        -payload.amount,
        payload.occurredAt,
        payload.notes || `Transferencia #${id}`,
        String(id),
        payload.createdBy,
        payload.createdAt,
      ]
    );
    const inMovement = await client.query(
      `
        INSERT INTO financial_movements (
          financial_account_id, type, amount, occurred_at, description,
          source_type, source_id, created_by, created_at, status
        )
        VALUES ($1, 'TRANSFER_IN', $2, $3, $4, 'TRANSFER', $5, $6, $7, 'ACTIVE')
        RETURNING id;
      `,
      [
        payload.toFinancialAccountId,
        payload.amount,
        payload.occurredAt,
        payload.notes || `Transferencia #${id}`,
        String(id),
        payload.createdBy,
        payload.createdAt,
      ]
    );
    await client.query(
      `
        UPDATE financial_transfers
        SET out_movement_id = $1, in_movement_id = $2
        WHERE id = $3;
      `,
      [
        outMovement.rows[0]?.id ?? null,
        inMovement.rows[0]?.id ?? null,
        id,
      ]
    );
    await createAuditEventWithClient(client, {
      entityType: "TRANSFER",
      entityId: String(id),
      action: "UPDATE",
      metadata: {
        fromFinancialAccountId: payload.fromFinancialAccountId,
        toFinancialAccountId: payload.toFinancialAccountId,
        amount: payload.amount,
      },
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });
    await client.query("COMMIT");
    return transfer;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function voidTransfer(id, payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "UPDATE financial_transfers SET status = 'VOIDED' WHERE id = $1 AND status = 'ACTIVE' RETURNING *;",
      [id]
    );
    const transfer = result.rows[0];
    if (!transfer) {
      const err = new Error("Transfer not found or already voided");
      err.status = 404;
      throw err;
    }
    await client.query(
      "UPDATE financial_movements SET status = 'VOIDED' WHERE id IN ($1, $2) AND status = 'ACTIVE';",
      [transfer.out_movement_id, transfer.in_movement_id]
    );
    await createAuditEventWithClient(client, {
      entityType: "TRANSFER",
      entityId: String(id),
      action: "VOID",
      metadata: {},
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });
    await client.query("COMMIT");
    return transfer;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listOwnerContributions() {
  const result = await db.query(
    `
      SELECT contribution.*, account.name AS financial_account_name
      FROM owner_contributions contribution
      LEFT JOIN financial_accounts account ON account.id = contribution.financial_account_id
      ORDER BY contribution.occurred_at DESC, contribution.id DESC
      LIMIT 100;
    `
  );
  return result.rows || [];
}

async function listTransfers() {
  const result = await db.query(
    `
      SELECT
        transfer.*,
        source.name AS from_financial_account_name,
        target.name AS to_financial_account_name
      FROM financial_transfers transfer
      LEFT JOIN financial_accounts source ON source.id = transfer.from_financial_account_id
      LEFT JOIN financial_accounts target ON target.id = transfer.to_financial_account_id
      ORDER BY transfer.occurred_at DESC, transfer.id DESC
      LIMIT 100;
    `
  );
  return result.rows || [];
}

async function assertActiveAccount(client, accountId) {
  const result = await client.query(
    "SELECT id, active FROM financial_accounts WHERE id = $1 FOR UPDATE;",
    [accountId]
  );
  const account = result.rows[0];
  if (!account) {
    const err = new Error("Financial account not found");
    err.status = 404;
    throw err;
  }
  if (!(account.active === true || account.active === 1 || account.active === "1")) {
    const err = new Error("Financial account is inactive");
    err.status = 409;
    throw err;
  }
  return account;
}

async function assertAccountCanSpend(client, accountId, amount) {
  await assertActiveAccount(client, accountId);
  const result = await client.query(
    `
      SELECT COALESCE(SUM(amount), 0) AS balance
      FROM financial_movements
      WHERE financial_account_id = $1
        AND status = 'ACTIVE';
    `,
    [accountId]
  );
  const balance = Number(result.rows[0]?.balance || 0);
  if (balance < amount) {
    const err = new Error("Insufficient account balance");
    err.status = 409;
    throw err;
  }
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
    listAccounts,
    getAccountById,
    createAccount,
    updateAccount,
    listMovements,
    createExpense,
    updateExpense,
    voidExpense,
    listExpenses,
    createOwnerContribution,
    updateOwnerContribution,
    voidOwnerContribution,
    listOwnerContributions,
    createTransfer,
    updateTransfer,
    voidTransfer,
    listTransfers,
  };
};
