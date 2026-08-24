const db = require("../db/initDb");

const ACTIVE_MOVEMENT_STATUS = "ACTIVE";

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

module.exports = async function initConsumer() {
  return {
    listAccounts,
    getAccountById,
    createAccount,
    updateAccount,
    listMovements,
  };
};
