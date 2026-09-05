const db = require("../db/initDb");

const ACTIVE_STATUS = "ACTIVE";

function mapInt(value) {
  return Number(value || 0);
}

async function getExistingClose(businessDate) {
  const result = await db.query(
    "SELECT * FROM daily_closes WHERE business_date = $1 LIMIT 1;",
    [businessDate],
  );
  return result.rows[0] || null;
}

async function getDailySummary(range) {
  const [income, expenses, contributions, courtesies, visits, pending] =
    await Promise.all([
      db.query(
        `
          SELECT COALESCE(SUM(amount), 0)::INTEGER AS total
          FROM financial_movements
          WHERE status = $1
            AND type = 'INCOME'
            AND occurred_at >= $2
            AND occurred_at <= $3;
        `,
        [ACTIVE_STATUS, range.startMs, range.endMs],
      ),
      db.query(
        `
          SELECT COALESCE(SUM(ABS(amount)), 0)::INTEGER AS total
          FROM financial_movements
          WHERE status = $1
            AND type = 'EXPENSE'
            AND occurred_at >= $2
            AND occurred_at <= $3;
        `,
        [ACTIVE_STATUS, range.startMs, range.endMs],
      ),
      db.query(
        `
          SELECT COALESCE(SUM(amount), 0)::INTEGER AS total
          FROM financial_movements
          WHERE status = $1
            AND type = 'OWNER_CONTRIBUTION'
            AND occurred_at >= $2
            AND occurred_at <= $3;
        `,
        [ACTIVE_STATUS, range.startMs, range.endMs],
      ),
      db.query(
        `
          SELECT COALESCE(SUM(commercial_subtotal), 0)::INTEGER AS total
          FROM order_items
          WHERE status = 'ACTIVE'
            AND type = 'COURTESY'
            AND created_at >= $1
            AND created_at <= $2;
        `,
        [range.startMs, range.endMs],
      ),
      db.query(
        `
          SELECT COUNT(*)::INTEGER AS total
          FROM visit_accounts
          WHERE opened_at >= $1
            AND opened_at <= $2
            AND status <> 'CANCELLED';
        `,
        [range.startMs, range.endMs],
      ),
      db.query(
        `
          SELECT
            COUNT(*)::INTEGER AS open_visits_count,
            COUNT(*) FILTER (WHERE pending_amount > 0)::INTEGER AS pending_visits_count,
            COALESCE(SUM(pending_amount), 0)::INTEGER AS pending_amount
          FROM (
            SELECT
              visit.id,
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
            WHERE visit.status NOT IN ('CLOSED', 'CANCELLED')
          ) open_visits;
        `,
      ),
    ]);

  return {
    operational_income: mapInt(income.rows[0]?.total),
    expenses_total: mapInt(expenses.rows[0]?.total),
    owner_contributions_total: mapInt(contributions.rows[0]?.total),
    courtesy_commercial_total: mapInt(courtesies.rows[0]?.total),
    visit_count: mapInt(visits.rows[0]?.total),
    open_visits_count: mapInt(pending.rows[0]?.open_visits_count),
    pending_visits_count: mapInt(pending.rows[0]?.pending_visits_count),
    pending_amount: mapInt(pending.rows[0]?.pending_amount),
  };
}

async function getAccountReconciliationPreview(range) {
  const result = await db.query(
    `
      SELECT
        account.id AS financial_account_id,
        account.name AS account_name,
        account.type AS account_type,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at <= $3
            THEN movement.amount
            ELSE 0
          END
        ), 0)::INTEGER AS expected_balance,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at >= $2
              AND movement.occurred_at <= $3
              AND movement.amount > 0
            THEN movement.amount
            ELSE 0
          END
        ), 0)::INTEGER AS day_entries,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at >= $2
              AND movement.occurred_at <= $3
              AND movement.amount < 0
            THEN ABS(movement.amount)
            ELSE 0
          END
        ), 0)::INTEGER AS day_exits,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at >= $2
              AND movement.occurred_at <= $3
              AND movement.type = 'TRANSFER_IN'
            THEN movement.amount
            ELSE 0
          END
        ), 0)::INTEGER AS transfer_in_total,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at >= $2
              AND movement.occurred_at <= $3
              AND movement.type = 'TRANSFER_OUT'
            THEN ABS(movement.amount)
            ELSE 0
          END
        ), 0)::INTEGER AS transfer_out_total
      FROM financial_accounts account
      LEFT JOIN financial_movements movement
        ON movement.financial_account_id = account.id
      WHERE account.reconciliation_enabled = TRUE
        AND account.active = TRUE
      GROUP BY account.id
      ORDER BY lower(account.name) ASC;
    `,
    [ACTIVE_STATUS, range.startMs, range.endMs],
  );
  return (result.rows || []).map((row) => ({
    ...row,
    expected_balance: mapInt(row.expected_balance),
    day_entries: mapInt(row.day_entries),
    day_exits: mapInt(row.day_exits),
    transfer_in_total: mapInt(row.transfer_in_total),
    transfer_out_total: mapInt(row.transfer_out_total),
  }));
}

async function getMovedAccountsPreview(range) {
  const result = await db.query(
    `
      SELECT
        account.id AS financial_account_id,
        account.name AS account_name,
        account.type AS account_type,
        account.reconciliation_enabled,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at <= $3
            THEN movement.amount
            ELSE 0
          END
        ), 0)::INTEGER AS expected_balance,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at >= $2
              AND movement.occurred_at <= $3
              AND movement.amount > 0
            THEN movement.amount
            ELSE 0
          END
        ), 0)::INTEGER AS day_entries,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at >= $2
              AND movement.occurred_at <= $3
              AND movement.amount < 0
            THEN ABS(movement.amount)
            ELSE 0
          END
        ), 0)::INTEGER AS day_exits,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at >= $2
              AND movement.occurred_at <= $3
              AND movement.type = 'TRANSFER_IN'
            THEN movement.amount
            ELSE 0
          END
        ), 0)::INTEGER AS transfer_in_total,
        COALESCE(SUM(
          CASE
            WHEN movement.status = $1
              AND movement.occurred_at >= $2
              AND movement.occurred_at <= $3
              AND movement.type = 'TRANSFER_OUT'
            THEN ABS(movement.amount)
            ELSE 0
          END
        ), 0)::INTEGER AS transfer_out_total
      FROM financial_accounts account
      LEFT JOIN financial_movements movement
        ON movement.financial_account_id = account.id
      WHERE EXISTS (
        SELECT 1
        FROM financial_movements day_movement
        WHERE day_movement.financial_account_id = account.id
          AND day_movement.status = $1
          AND day_movement.occurred_at >= $2
          AND day_movement.occurred_at <= $3
      )
      GROUP BY account.id
      ORDER BY lower(account.name) ASC;
    `,
    [ACTIVE_STATUS, range.startMs, range.endMs],
  );
  return (result.rows || []).map((row) => ({
    ...row,
    expected_balance: mapInt(row.expected_balance),
    day_entries: mapInt(row.day_entries),
    day_exits: mapInt(row.day_exits),
    transfer_in_total: mapInt(row.transfer_in_total),
    transfer_out_total: mapInt(row.transfer_out_total),
  }));
}

async function listAccountMovements(accountId, range) {
  const result = await db.query(
    `
      SELECT *
      FROM financial_movements
      WHERE financial_account_id = $1
        AND status = $2
        AND occurred_at >= $3
        AND occurred_at <= $4
      ORDER BY occurred_at DESC, id DESC;
    `,
    [accountId, ACTIVE_STATUS, range.startMs, range.endMs],
  );
  return result.rows || [];
}

async function listDailyCloses() {
  const result = await db.query(
    `
      SELECT *
      FROM daily_closes
      ORDER BY business_date DESC, id DESC
      LIMIT 60;
    `,
  );
  return result.rows || [];
}

async function createDailyClose(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT * FROM daily_closes WHERE business_date = $1 FOR UPDATE;",
      [payload.businessDate],
    );
    if (existing.rows[0]) {
      const err = new Error("Daily close already exists for this date");
      err.status = 409;
      throw err;
    }

    const summary = await getDailySummary(payload.range);
    const previewAccounts = await getAccountReconciliationPreview(payload.range);
    const accountMap = new Map(
      previewAccounts.map((account) => [
        Number(account.financial_account_id),
        account,
      ]),
    );

    if (
      !payload.allowOpenBalances &&
      (summary.open_visits_count > 0 || summary.pending_amount > 0)
    ) {
      const err = new Error("There are open visits or pending balances");
      err.status = 409;
      throw err;
    }

    const hasDifference = payload.reconciliations.some((reconciliation) => {
      const account = accountMap.get(reconciliation.financialAccountId);
      if (!account) return false;
      return reconciliation.realBalance - account.expected_balance !== 0;
    });
    if (hasDifference && !payload.allowDifferences) {
      const err = new Error("There are reconciliation differences");
      err.status = 409;
      throw err;
    }

    const closeResult = await client.query(
      `
        INSERT INTO daily_closes (
          business_date,
          closed_at,
          closed_by,
          operational_income,
          expenses_total,
          owner_contributions_total,
          courtesy_commercial_total,
          visit_count,
          open_visits_count,
          pending_visits_count,
          pending_amount,
          status,
          notes,
          allow_open_balances,
          allow_differences
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'CLOSED', $12, $13, $14)
        RETURNING *;
      `,
      [
        payload.businessDate,
        payload.closedAt,
        payload.closedBy,
        summary.operational_income,
        summary.expenses_total,
        summary.owner_contributions_total,
        summary.courtesy_commercial_total,
        summary.visit_count,
        summary.open_visits_count,
        summary.pending_visits_count,
        summary.pending_amount,
        payload.notes,
        payload.allowOpenBalances,
        payload.allowDifferences,
      ],
    );
    const close = closeResult.rows[0];

    for (const reconciliation of payload.reconciliations) {
      const account = accountMap.get(reconciliation.financialAccountId);
      if (!account) continue;
      const difference = reconciliation.realBalance - account.expected_balance;
      let adjustmentMovementId = null;
      if (difference !== 0 && reconciliation.createAdjustment) {
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
            VALUES ($1, 'ADJUSTMENT', $2, $3, $4, 'DAILY_CLOSE', $5, $6, $7, 'ACTIVE')
            RETURNING id;
          `,
          [
            reconciliation.financialAccountId,
            difference,
            payload.closedAt,
            reconciliation.adjustmentReason,
            String(close.id),
            payload.closedBy,
            payload.closedAt,
          ],
        );
        adjustmentMovementId = movementResult.rows[0]?.id ?? null;
      }

      await client.query(
        `
          INSERT INTO account_reconciliations (
            daily_close_id,
            financial_account_id,
            account_name_snapshot,
            expected_balance,
            day_entries,
            day_exits,
            transfer_in_total,
            transfer_out_total,
            real_balance,
            difference,
            observation,
            adjustment_movement_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
        `,
        [
          close.id,
          reconciliation.financialAccountId,
          account.account_name,
          account.expected_balance,
          account.day_entries,
          account.day_exits,
          account.transfer_in_total,
          account.transfer_out_total,
          reconciliation.realBalance,
          difference,
          reconciliation.observation,
          adjustmentMovementId,
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
        VALUES ('DAILY_CLOSE', $1, 'CREATE', $2, $3, $4);
      `,
      [
        String(close.id),
        JSON.stringify({
          businessDate: payload.businessDate,
          reconciliationCount: payload.reconciliations.length,
        }),
        payload.closedBy,
        payload.closedAt,
      ],
    );

    await client.query("COMMIT");
    return close;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = async function initConsumer() {
  return {
    getExistingClose,
    getDailySummary,
    getAccountReconciliationPreview,
    getMovedAccountsPreview,
    listAccountMovements,
    listDailyCloses,
    createDailyClose,
  };
};
