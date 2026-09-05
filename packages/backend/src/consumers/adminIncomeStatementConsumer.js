const db = require("../db/initDb");

function number(value) {
  return Number(value || 0);
}

function expenseAreaValues(row) {
  return {
    total: number(row.total_amount),
    rooms: Math.round(number(row.rooms_amount)),
    cafeteria: Math.round(number(row.cafeteria_amount)),
    admin: Math.round(number(row.admin_amount)),
    pending: Math.round(number(row.pending_amount)),
  };
}

async function getIncomeStatement(filters) {
  const values = [filters.startMs, filters.endMs];
  const [collections, financial, expenses, courtesy, pending, timeline, categories] =
    await Promise.all([
      db.query(
        `
          WITH room_parts AS (
            SELECT payment.amount
            FROM reservation_payments payment
            WHERE payment.status = 'CONFIRMED'
              AND payment.paid_at >= $1 AND payment.paid_at <= $2
            UNION ALL
            SELECT allocation.amount
            FROM payment_allocations allocation
            JOIN visit_payments payment ON payment.id = allocation.payment_id
            WHERE payment.status = 'CONFIRMED'
              AND allocation.component = 'VISIT_BALANCE'
              AND payment.paid_at >= $1 AND payment.paid_at <= $2
          ),
          cafeteria_parts AS (
            SELECT
              allocation.order_item_id,
              allocation.amount,
              CASE
                WHEN snapshot.id IS NULL OR snapshot.cost_incomplete = TRUE THEN TRUE
                ELSE FALSE
              END AS cost_incomplete,
              COALESCE(
                snapshot.total_cost * allocation.amount::NUMERIC
                  / NULLIF(item.charged_subtotal, 0),
                0
              ) AS recognized_cost
            FROM payment_allocations allocation
            JOIN visit_payments payment ON payment.id = allocation.payment_id
            JOIN order_items item ON item.id = allocation.order_item_id
            LEFT JOIN order_item_cost_snapshots snapshot
              ON snapshot.order_item_id = item.id AND snapshot.status = 'ACTIVE'
            WHERE payment.status = 'CONFIRMED'
              AND item.status = 'ACTIVE'
              AND item.type = 'SALE'
              AND payment.paid_at >= $1 AND payment.paid_at <= $2
          )
          SELECT
            COALESCE((SELECT SUM(amount) FROM room_parts), 0)::INTEGER AS room_sales,
            COALESCE((SELECT SUM(amount) FROM cafeteria_parts), 0)::INTEGER AS cafeteria_sales,
            COALESCE((SELECT SUM(recognized_cost) FROM cafeteria_parts), 0) AS cafeteria_cost,
            COALESCE((SELECT COUNT(DISTINCT order_item_id) FROM cafeteria_parts WHERE cost_incomplete), 0)::INTEGER AS incomplete_cost_items
        `,
        values,
      ),
      db.query(
        `
          SELECT
            COALESCE(SUM(amount) FILTER (
              WHERE type = 'INCOME'
                AND COALESCE(source_type, '') NOT IN ('RESERVATION_PAYMENT', 'VISIT_PAYMENT')
            ), 0)::INTEGER AS other_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'ADJUSTMENT'), 0)::INTEGER AS adjustments,
            COALESCE(SUM(amount) FILTER (WHERE type = 'OWNER_CONTRIBUTION'), 0)::INTEGER AS owner_contributions,
            COALESCE(SUM(amount) FILTER (WHERE type = 'TRANSFER_IN'), 0)::INTEGER AS transfer_in,
            COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'TRANSFER_OUT'), 0)::INTEGER AS transfer_out
          FROM financial_movements
          WHERE status = 'ACTIVE'
            AND occurred_at >= $1 AND occurred_at <= $2;
        `,
        values,
      ),
      db.query(
        `
          SELECT
            COALESCE(SUM(total_amount), 0)::INTEGER AS total_amount,
            COALESCE(SUM(CASE
              WHEN cost_center = 'ROOMS' THEN total_amount
              WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
                THEN total_amount * allocation_percentage_rooms / 100.0
              ELSE 0 END), 0) AS rooms_amount,
            COALESCE(SUM(CASE
              WHEN cost_center = 'CAFETERIA' THEN total_amount
              WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
                THEN total_amount * allocation_percentage_cafeteria / 100.0
              ELSE 0 END), 0) AS cafeteria_amount,
            COALESCE(SUM(CASE
              WHEN cost_center IN ('ADMINISTRATION', 'MARKETING') THEN total_amount
              WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
                THEN total_amount * allocation_percentage_admin / 100.0
              ELSE 0 END), 0) AS admin_amount,
            COALESCE(SUM(CASE
              WHEN cost_center = 'UNASSIGNED'
                OR (cost_center = 'MIXED' AND allocation_mode <> 'PERCENTAGE')
                THEN total_amount ELSE 0 END), 0) AS pending_amount,
            COUNT(*) FILTER (
              WHERE cost_center = 'UNASSIGNED'
                OR (cost_center = 'MIXED' AND allocation_mode <> 'PERCENTAGE')
            )::INTEGER AS pending_count,
            COALESCE((
              SELECT SUM(allocation.amount)
              FROM expense_funding_allocations allocation
              JOIN expenses funded_expense ON funded_expense.id = allocation.expense_id
              WHERE funded_expense.status = 'ACTIVE'
                AND funded_expense.occurred_at >= $1
                AND funded_expense.occurred_at <= $2
                AND allocation.source_type = 'OWNER_PERSONAL_FUNDS'
                AND allocation.contribution_kind = 'REIMBURSABLE'
            ), 0)::INTEGER AS reimbursable_owner_expenses,
            COALESCE((
              SELECT SUM(reimbursement.total_amount)
              FROM expenses reimbursement
              WHERE reimbursement.status = 'ACTIVE'
                AND reimbursement.category = 'OWNER_REIMBURSEMENT'
                AND reimbursement.occurred_at >= $1
                AND reimbursement.occurred_at <= $2
            ), 0)::INTEGER AS owner_reimbursements
          FROM expenses
          WHERE status = 'ACTIVE'
            AND category <> 'OWNER_REIMBURSEMENT'
            AND occurred_at >= $1 AND occurred_at <= $2;
        `,
        values,
      ),
      db.query(
        `
          SELECT
            COALESCE(SUM(item.commercial_subtotal), 0)::INTEGER AS commercial_value,
            COALESCE(SUM(COALESCE(snapshot.total_cost, 0)), 0)::INTEGER AS cost,
            COUNT(*) FILTER (
              WHERE snapshot.id IS NULL OR snapshot.cost_incomplete = TRUE
            )::INTEGER AS incomplete_items
          FROM order_items item
          LEFT JOIN order_item_cost_snapshots snapshot
            ON snapshot.order_item_id = item.id AND snapshot.status = 'ACTIVE'
          WHERE item.status = 'ACTIVE'
            AND item.type = 'COURTESY'
            AND item.created_at >= $1 AND item.created_at <= $2;
        `,
        values,
      ),
      db.query(
        `
          SELECT
            COUNT(*) FILTER (WHERE pending_amount > 0)::INTEGER AS visits_count,
            COALESCE(SUM(pending_amount) FILTER (WHERE pending_amount > 0), 0)::INTEGER AS amount
          FROM (
            SELECT
              GREATEST(
                COALESCE(reservation.total, 0)
                + COALESCE((
                  SELECT SUM(item.charged_subtotal)
                  FROM order_items item
                  WHERE item.visit_account_id = visit.id AND item.status = 'ACTIVE'
                ), 0)
                - COALESCE((
                  SELECT SUM(payment.amount)
                  FROM reservation_payments payment
                  WHERE payment.reservation_id = visit.reservation_id
                    AND payment.status = 'CONFIRMED'
                ), 0)
                - COALESCE((
                  SELECT SUM(payment.amount)
                  FROM visit_payments payment
                  WHERE payment.visit_account_id = visit.id
                    AND payment.status = 'CONFIRMED'
                ), 0),
                0
              ) AS pending_amount
            FROM visit_accounts visit
            LEFT JOIN reservations reservation ON reservation.id = visit.reservation_id
            WHERE visit.status <> 'CANCELLED'
              AND visit.opened_at >= $1 AND visit.opened_at <= $2
          ) pending_visits;
        `,
        values,
      ),
      db.query(
        `
          WITH events AS (
            SELECT paid_at AS occurred_at, amount AS room_sales,
              0 AS cafeteria_sales, 0 AS other_income, 0::NUMERIC AS cafeteria_cost,
              0::NUMERIC AS rooms_expense, 0::NUMERIC AS cafeteria_expense,
              0::NUMERIC AS admin_expense, 0 AS total_expense, 0 AS adjustments
            FROM reservation_payments
            WHERE status = 'CONFIRMED' AND paid_at >= $1 AND paid_at <= $2
            UNION ALL
            SELECT payment.paid_at, allocation.amount, 0, 0, 0, 0, 0, 0, 0, 0
            FROM payment_allocations allocation
            JOIN visit_payments payment ON payment.id = allocation.payment_id
            WHERE payment.status = 'CONFIRMED'
              AND allocation.component = 'VISIT_BALANCE'
              AND payment.paid_at >= $1 AND payment.paid_at <= $2
            UNION ALL
            SELECT payment.paid_at, 0, allocation.amount, 0,
              COALESCE(snapshot.total_cost * allocation.amount::NUMERIC
                / NULLIF(item.charged_subtotal, 0), 0),
              0, 0, 0, 0, 0
            FROM payment_allocations allocation
            JOIN visit_payments payment ON payment.id = allocation.payment_id
            JOIN order_items item ON item.id = allocation.order_item_id
            LEFT JOIN order_item_cost_snapshots snapshot
              ON snapshot.order_item_id = item.id AND snapshot.status = 'ACTIVE'
            WHERE payment.status = 'CONFIRMED'
              AND item.status = 'ACTIVE' AND item.type = 'SALE'
              AND payment.paid_at >= $1 AND payment.paid_at <= $2
            UNION ALL
            SELECT occurred_at, 0, 0,
              CASE WHEN type = 'INCOME'
                AND COALESCE(source_type, '') NOT IN ('RESERVATION_PAYMENT', 'VISIT_PAYMENT')
                THEN amount ELSE 0 END,
              0, 0, 0, 0, 0,
              CASE WHEN type = 'ADJUSTMENT' THEN amount ELSE 0 END
            FROM financial_movements
            WHERE status = 'ACTIVE'
              AND type IN ('INCOME', 'ADJUSTMENT')
              AND occurred_at >= $1 AND occurred_at <= $2
            UNION ALL
            SELECT occurred_at, 0, 0, 0, 0,
              CASE WHEN cost_center = 'ROOMS' THEN total_amount
                WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
                  THEN total_amount * allocation_percentage_rooms / 100.0 ELSE 0 END,
              CASE WHEN cost_center = 'CAFETERIA' THEN total_amount
                WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
                  THEN total_amount * allocation_percentage_cafeteria / 100.0 ELSE 0 END,
              CASE WHEN cost_center IN ('ADMINISTRATION', 'MARKETING') THEN total_amount
                WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
                  THEN total_amount * allocation_percentage_admin / 100.0 ELSE 0 END,
              total_amount, 0
            FROM expenses
            WHERE status = 'ACTIVE'
              AND category <> 'OWNER_REIMBURSEMENT'
              AND occurred_at >= $1 AND occurred_at <= $2
          )
          SELECT
            TO_CHAR(
              TO_TIMESTAMP(occurred_at / 1000.0) AT TIME ZONE 'America/Bogota',
              $3
            ) AS period,
            COALESCE(SUM(room_sales), 0) AS room_sales,
            COALESCE(SUM(cafeteria_sales), 0) AS cafeteria_sales,
            COALESCE(SUM(other_income), 0) AS other_income,
            COALESCE(SUM(cafeteria_cost), 0) AS cafeteria_cost,
            COALESCE(SUM(rooms_expense), 0) AS rooms_expense,
            COALESCE(SUM(cafeteria_expense), 0) AS cafeteria_expense,
            COALESCE(SUM(admin_expense), 0) AS admin_expense,
            COALESCE(SUM(total_expense), 0) AS total_expense,
            COALESCE(SUM(adjustments), 0) AS adjustments
          FROM events
          GROUP BY period
          ORDER BY period ASC;
        `,
        [filters.startMs, filters.endMs, filters.dateFormat],
      ),
      db.query(
        `
          SELECT
            category,
            COALESCE(SUM(total_amount), 0)::INTEGER AS total_amount,
            COALESCE(SUM(CASE
              WHEN cost_center = 'ROOMS' THEN total_amount
              WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
                THEN total_amount * allocation_percentage_rooms / 100.0
              ELSE 0 END), 0) AS rooms_amount,
            COALESCE(SUM(CASE
              WHEN cost_center = 'CAFETERIA' THEN total_amount
              WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
                THEN total_amount * allocation_percentage_cafeteria / 100.0
              ELSE 0 END), 0) AS cafeteria_amount,
            COALESCE(SUM(CASE
              WHEN cost_center IN ('ADMINISTRATION', 'MARKETING') THEN total_amount
              WHEN cost_center = 'MIXED' AND allocation_mode = 'PERCENTAGE'
                THEN total_amount * allocation_percentage_admin / 100.0
              ELSE 0 END), 0) AS admin_amount,
            COALESCE(SUM(CASE
              WHEN cost_center = 'UNASSIGNED'
                OR (cost_center = 'MIXED' AND allocation_mode <> 'PERCENTAGE')
                THEN total_amount ELSE 0 END), 0) AS pending_amount
          FROM expenses
          WHERE status = 'ACTIVE'
            AND category <> 'OWNER_REIMBURSEMENT'
            AND occurred_at >= $1 AND occurred_at <= $2
          GROUP BY category
          ORDER BY total_amount DESC, category ASC;
        `,
        values,
      ),
    ]);

  const collectionRow = collections.rows[0] || {};
  const financialRow = financial.rows[0] || {};
  const expenseRow = expenses.rows[0] || {};
  const courtesyRow = courtesy.rows[0] || {};
  const pendingRow = pending.rows[0] || {};
  const expenseAreas = expenseAreaValues(expenseRow);
  const raw = {
    roomSales: number(collectionRow.room_sales),
    cafeteriaSales: number(collectionRow.cafeteria_sales),
    otherIncome: number(financialRow.other_income),
    cafeteriaCost: Math.round(number(collectionRow.cafeteria_cost)),
    expenses: expenseAreas,
    adjustments: number(financialRow.adjustments),
  };

  function areaResult(area) {
    const roomSales = area === "GENERAL" || area === "ROOMS" ? raw.roomSales : 0;
    const cafeteriaSales =
      area === "GENERAL" || area === "CAFETERIA" ? raw.cafeteriaSales : 0;
    const otherIncome = area === "GENERAL" || area === "ADMIN" ? raw.otherIncome : 0;
    const cafeteriaCost =
      area === "GENERAL" || area === "CAFETERIA" ? raw.cafeteriaCost : 0;
    const operatingExpenses =
      area === "GENERAL"
        ? raw.expenses.total
        : area === "ROOMS"
          ? raw.expenses.rooms
          : area === "CAFETERIA"
            ? raw.expenses.cafeteria
            : raw.expenses.admin;
    const adjustments = area === "GENERAL" || area === "ADMIN" ? raw.adjustments : 0;
    const operatingIncome = roomSales + cafeteriaSales + otherIncome;
    const grossProfit = operatingIncome - cafeteriaCost;
    const operatingResult = grossProfit - operatingExpenses + adjustments;
    return {
      area,
      roomSales,
      cafeteriaSales,
      otherIncome,
      operatingIncome,
      cafeteriaCost,
      grossProfit,
      operatingExpenses,
      adjustments,
      operatingResult,
      margin:
        operatingIncome > 0
          ? Math.round((operatingResult / operatingIncome) * 10000) / 100
          : null,
    };
  }

  const selected = areaResult(filters.area);
  const timelineRows = (timeline.rows || []).map((row) => {
    const income =
      filters.area === "GENERAL"
        ? number(row.room_sales) + number(row.cafeteria_sales) + number(row.other_income)
        : filters.area === "ROOMS"
          ? number(row.room_sales)
          : number(row.cafeteria_sales);
    const cost =
      filters.area === "GENERAL" || filters.area === "CAFETERIA"
        ? number(row.cafeteria_cost)
        : 0;
    const expense =
      filters.area === "GENERAL"
        ? number(row.total_expense)
        : filters.area === "ROOMS"
          ? number(row.rooms_expense)
          : number(row.cafeteria_expense);
    const adjustment = filters.area === "GENERAL" ? number(row.adjustments) : 0;
    return {
      period: row.period,
      roomSales: Math.round(number(row.room_sales)),
      cafeteriaSales: Math.round(number(row.cafeteria_sales)),
      otherIncome: Math.round(number(row.other_income)),
      income: Math.round(income),
      cost: Math.round(cost),
      expenses: Math.round(expense),
      result: Math.round(income - cost - expense + adjustment),
    };
  });

  return {
    basis: "CASH",
    area: filters.area,
    summary: selected,
    areas: [areaResult("ROOMS"), areaResult("CAFETERIA"), areaResult("ADMIN")],
    timeline: timelineRows,
    expenseCategories: (categories.rows || []).map((row) => ({
      category: row.category,
      ...expenseAreaValues(row),
    })),
    separated: {
      ownerContributions: number(financialRow.owner_contributions),
      transferIn: number(financialRow.transfer_in),
      transferOut: number(financialRow.transfer_out),
      reimbursableOwnerExpenses: number(expenseRow.reimbursable_owner_expenses),
      ownerReimbursements: number(expenseRow.owner_reimbursements),
      courtesyCommercialValue: number(courtesyRow.commercial_value),
      courtesyCost: number(courtesyRow.cost),
      pendingBalance: number(pendingRow.amount),
      pendingVisits: number(pendingRow.visits_count),
    },
    quality: {
      incompleteCostItems:
        number(collectionRow.incomplete_cost_items) +
        number(courtesyRow.incomplete_items),
      unclassifiedExpenses: number(expenseRow.pending_count),
      unclassifiedExpenseAmount: expenseAreas.pending,
      pendingVisits: number(pendingRow.visits_count),
    },
  };
}

module.exports = async function initConsumer() {
  return { getIncomeStatement };
};
