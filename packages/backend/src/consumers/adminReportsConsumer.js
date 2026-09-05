const db = require("../db/initDb");

const ACTIVE_MOVEMENT_STATUS = "ACTIVE";
const CONFIRMED_PAYMENT_STATUS = "CONFIRMED";

function mapInt(value) {
  return Number(value || 0);
}

async function getDashboard(range) {
  const [
    accountBalances,
    movementSummary,
    roomPayments,
    cafeteriaPayments,
    courtesySummary,
    visitSummary,
    inventoryAlerts,
    expirationAlerts,
    dailyCloses,
  ] = await Promise.all([
    db.query(
      `
        SELECT
          account.id,
          account.name,
          account.type,
          account.active,
          COALESCE(SUM(
            CASE WHEN movement.status = $1 THEN movement.amount ELSE 0 END
          ), 0)::INTEGER AS balance
        FROM financial_accounts account
        LEFT JOIN financial_movements movement
          ON movement.financial_account_id = account.id
        WHERE account.active = TRUE
        GROUP BY account.id
        ORDER BY
          CASE account.type
            WHEN 'CASH' THEN 1
            WHEN 'DIGITAL_WALLET' THEN 2
            WHEN 'BANK' THEN 3
            ELSE 4
          END,
          lower(account.name) ASC;
      `,
      [ACTIVE_MOVEMENT_STATUS],
    ),
    db.query(
      `
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)::INTEGER AS operational_income,
          COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'EXPENSE'), 0)::INTEGER AS expenses_total,
          COALESCE(SUM(amount) FILTER (WHERE type = 'OWNER_CONTRIBUTION'), 0)::INTEGER AS owner_contributions_total,
          COALESCE(SUM(amount) FILTER (WHERE type = 'TRANSFER_IN'), 0)::INTEGER AS transfer_in_total,
          COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'TRANSFER_OUT'), 0)::INTEGER AS transfer_out_total,
          COALESCE(SUM(amount) FILTER (WHERE type = 'ADJUSTMENT'), 0)::INTEGER AS adjustment_total
        FROM financial_movements
        WHERE status = $1
          AND occurred_at >= $2
          AND occurred_at <= $3;
      `,
      [ACTIVE_MOVEMENT_STATUS, range.startMs, range.endMs],
    ),
    db.query(
      `
        SELECT
          COALESCE(SUM(total), 0)::INTEGER AS total,
          COALESCE(SUM(payments_count), 0)::INTEGER AS payments_count
        FROM (
          SELECT amount AS total, 1 AS payments_count
          FROM reservation_payments
          WHERE status = $1
            AND paid_at >= $2
            AND paid_at <= $3
          UNION ALL
          SELECT allocation.amount AS total, 1 AS payments_count
          FROM payment_allocations allocation
          JOIN visit_payments payment ON payment.id = allocation.payment_id
          WHERE payment.status = $1
            AND allocation.component = 'VISIT_BALANCE'
            AND payment.paid_at >= $2
            AND payment.paid_at <= $3
        ) room_payment_parts;
      `,
      [CONFIRMED_PAYMENT_STATUS, range.startMs, range.endMs],
    ),
    db.query(
      `
        SELECT
          COALESCE(SUM(allocation.amount), 0)::INTEGER AS total,
          COUNT(DISTINCT payment.id)::INTEGER AS payments_count
        FROM payment_allocations allocation
        JOIN visit_payments payment ON payment.id = allocation.payment_id
        JOIN order_items item ON item.id = allocation.order_item_id
        WHERE payment.status = $1
          AND item.type = 'SALE'
          AND payment.paid_at >= $2
          AND payment.paid_at <= $3;
      `,
      [CONFIRMED_PAYMENT_STATUS, range.startMs, range.endMs],
    ),
    db.query(
      `
        SELECT
          COALESCE(SUM(commercial_subtotal), 0)::INTEGER AS commercial_total,
          COALESCE(SUM(quantity), 0)::INTEGER AS quantity
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
        SELECT
          (
            SELECT COUNT(*)::INTEGER
            FROM visit_accounts ranged_visit
            WHERE ranged_visit.opened_at >= $1
              AND ranged_visit.opened_at <= $2
              AND ranged_visit.status <> 'CANCELLED'
          ) AS visits_count,
          COUNT(*) FILTER (WHERE status IN ('OPEN', 'PARTIALLY_PAID', 'PAID'))::INTEGER AS open_visits_count,
          COUNT(*) FILTER (WHERE pending_amount > 0)::INTEGER AS pending_visits_count,
          COALESCE(SUM(pending_amount), 0)::INTEGER AS pending_amount
        FROM (
          SELECT
            visit.id,
            visit.status,
            GREATEST(
              COALESCE(reservation.total, 0)
              + COALESCE((
                SELECT SUM(item.charged_subtotal)
                FROM order_items item
                WHERE item.visit_account_id = visit.id
                  AND item.status = 'ACTIVE'
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
          WHERE visit.status IN ('OPEN', 'PARTIALLY_PAID', 'PAID')
        ) visits;
      `,
      [range.startMs, range.endMs],
    ),
    db.query(
      `
        SELECT
          product.id,
          product.name,
          product.minimum_stock,
          product.unit,
          COALESCE((
            SELECT SUM(movement.quantity_delta)
            FROM inventory_movements movement
            WHERE movement.product_id = product.id
          ), 0)::INTEGER AS current_stock
        FROM cafeteria_products product
        WHERE product.track_inventory = TRUE
          AND product.minimum_stock IS NOT NULL
          AND COALESCE((
          SELECT SUM(movement.quantity_delta)
          FROM inventory_movements movement
          WHERE movement.product_id = product.id
        ), 0) <= product.minimum_stock
        ORDER BY current_stock ASC, lower(product.name) ASC
        LIMIT 20;
      `,
    ),
    db.query(
      `
        SELECT
          batch.id,
          product.name AS product_name,
          batch.current_quantity,
          batch.expiration_date,
          batch.lot_number,
          product.unit,
          CASE
            WHEN batch.expiration_date < $1 THEN 'VENCIDO'
            WHEN batch.expiration_date <= $2 THEN 'CRITICO'
            WHEN batch.expiration_date <= $3 THEN 'PROXIMO'
            ELSE 'OK'
          END AS alert_level
        FROM inventory_batches batch
        JOIN cafeteria_products product ON product.id = batch.product_id
        WHERE batch.status = 'ACTIVE'
          AND batch.current_quantity > 0
          AND product.track_expiration = TRUE
          AND batch.expiration_date <= $3
        ORDER BY batch.expiration_date ASC, lower(product.name) ASC
        LIMIT 30;
      `,
      [range.todayText, range.criticalDateText, range.alertDateText],
    ),
    db.query(
      `
        SELECT *
        FROM daily_closes
        ORDER BY business_date DESC, id DESC
        LIMIT 8;
      `,
    ),
  ]);

  const movementRow = movementSummary.rows[0] || {};
  const roomRow = roomPayments.rows[0] || {};
  const cafeteriaRow = cafeteriaPayments.rows[0] || {};
  const courtesyRow = courtesySummary.rows[0] || {};
  const visitRow = visitSummary.rows[0] || {};

  return {
    range: {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    },
    summary: {
      room_sales_collected: mapInt(roomRow.total),
      cafeteria_sales_collected: mapInt(cafeteriaRow.total),
      other_operational_income: Math.max(
        mapInt(movementRow.operational_income) -
          mapInt(roomRow.total) -
          mapInt(cafeteriaRow.total),
        0,
      ),
      expenses_total: mapInt(movementRow.expenses_total),
      owner_contributions_total: mapInt(
        movementRow.owner_contributions_total,
      ),
      transfer_in_total: mapInt(movementRow.transfer_in_total),
      transfer_out_total: mapInt(movementRow.transfer_out_total),
      adjustment_total: mapInt(movementRow.adjustment_total),
      courtesy_commercial_total: mapInt(courtesyRow.commercial_total),
      courtesy_quantity: mapInt(courtesyRow.quantity),
      visits_count: mapInt(visitRow.visits_count),
      open_visits_count: mapInt(visitRow.open_visits_count),
      pending_visits_count: mapInt(visitRow.pending_visits_count),
      pending_amount: mapInt(visitRow.pending_amount),
    },
    accountBalances: (accountBalances.rows || []).map((row) => ({
      ...row,
      balance: mapInt(row.balance),
    })),
    inventoryAlerts: (inventoryAlerts.rows || []).map((row) => ({
      ...row,
      current_stock: mapInt(row.current_stock),
    })),
    expirationAlerts: expirationAlerts.rows || [],
    dailyCloses: dailyCloses.rows || [],
  };
}

async function listFinancialMovements(filters) {
  const params = [filters.startMs, filters.endMs];
  const where = [
    "movement.occurred_at >= $1",
    "movement.occurred_at <= $2",
  ];

  if (filters.financialAccountId) {
    params.push(filters.financialAccountId);
    where.push(`movement.financial_account_id = $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    where.push(`movement.type = $${params.length}`);
  }
  if (filters.sourceType) {
    params.push(filters.sourceType);
    where.push(`movement.source_type = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`movement.status = $${params.length}`);
  }
  if (filters.expenseCategory) {
    params.push(filters.expenseCategory);
    where.push(`expense.category = $${params.length}`);
  }
  if (filters.costCenter) {
    params.push(filters.costCenter);
    where.push(`expense.cost_center = $${params.length}`);
  }

  params.push(filters.limit);
  const limitPosition = params.length;
  params.push(filters.offset);
  const offsetPosition = params.length;

  const result = await db.query(
    `
      SELECT
        movement.*,
        account.name AS financial_account_name,
        account.type AS financial_account_type,
        expense.category AS expense_category,
        expense.cost_center,
        creator.name AS created_by_name
      FROM financial_movements movement
      JOIN financial_accounts account ON account.id = movement.financial_account_id
      LEFT JOIN users creator ON creator.id = movement.created_by
      LEFT JOIN expenses expense
        ON movement.source_type = 'EXPENSE'
        AND expense.id::text = movement.source_id
      WHERE ${where.join(" AND ")}
      ORDER BY movement.occurred_at DESC, movement.id DESC
      LIMIT $${limitPosition}
      OFFSET $${offsetPosition};
    `,
    params,
  );
  return result.rows || [];
}

async function listSalesReport(filters) {
  const result = await db.query(
    `
      SELECT
        item.product_id,
        item.product_name_snapshot,
        COALESCE(category.name, product.category, 'Sin categoria') AS category_name,
        item.type,
        item.courtesy_reason,
        COALESCE(SUM(item.quantity), 0)::INTEGER AS quantity,
        COALESCE(SUM(item.charged_subtotal), 0)::INTEGER AS charged_total,
        COALESCE(SUM(item.commercial_subtotal), 0)::INTEGER AS commercial_total
      FROM order_items item
      LEFT JOIN cafeteria_products product ON product.id = item.product_id
      LEFT JOIN cafeteria_categories category ON category.id = product.category_id
      WHERE item.status = 'ACTIVE'
        AND item.created_at >= $1
        AND item.created_at <= $2
      GROUP BY
        item.product_id,
        item.product_name_snapshot,
        category.name,
        product.category,
        item.type,
        item.courtesy_reason
      ORDER BY lower(item.product_name_snapshot) ASC, item.type ASC;
    `,
    [filters.startMs, filters.endMs],
  );
  return result.rows || [];
}

async function listProductsRanking(filters) {
  const direction = filters.sort === "least" ? "ASC" : "DESC";
  const result = await db.query(
    `
      SELECT
        item.product_id,
        item.product_name_snapshot AS product_name,
        COALESCE(category.name, product.category, 'Sin categoria') AS category_name,
        COALESCE(SUM(item.quantity) FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS quantity_sold,
        COALESCE(SUM(item.charged_subtotal) FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS charged_total,
        COALESCE(SUM(item.quantity) FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_quantity,
        COALESCE(SUM(item.commercial_subtotal) FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_commercial_total
      FROM order_items item
      LEFT JOIN cafeteria_products product ON product.id = item.product_id
      LEFT JOIN cafeteria_categories category ON category.id = product.category_id
      WHERE item.status = 'ACTIVE'
        AND item.created_at >= $1
        AND item.created_at <= $2
      GROUP BY item.product_id, item.product_name_snapshot, category.name, product.category
      ORDER BY quantity_sold ${direction}, charged_total ${direction}, lower(item.product_name_snapshot) ASC
      LIMIT $3;
    `,
    [filters.startMs, filters.endMs, filters.limit],
  );
  return result.rows || [];
}

async function listRoomsRanking(filters) {
  const direction = filters.sort === "least" ? "ASC" : "DESC";
  const result = await db.query(
    `
      SELECT
        room.id AS room_id,
        room.name AS room_name,
        COUNT(DISTINCT visit.id)::INTEGER AS visits_count,
        COALESCE(SUM(reservation.players), 0)::INTEGER AS players_total,
        COALESCE(SUM(reservation.total), 0)::INTEGER AS room_total,
        COALESCE(SUM((
          SELECT SUM(payment.amount)
          FROM reservation_payments payment
          WHERE payment.reservation_id = reservation.id
            AND payment.status = 'CONFIRMED'
            AND payment.paid_at >= $1
            AND payment.paid_at <= $2
        )), 0)::INTEGER
        + COALESCE(SUM((
          SELECT SUM(allocation.amount)
          FROM payment_allocations allocation
          JOIN visit_payments payment ON payment.id = allocation.payment_id
          WHERE payment.visit_account_id = visit.id
            AND payment.status = 'CONFIRMED'
            AND allocation.component = 'VISIT_BALANCE'
            AND payment.paid_at >= $1
            AND payment.paid_at <= $2
        )), 0)::INTEGER AS collected_total
      FROM visit_accounts visit
      JOIN reservations reservation ON reservation.id = visit.reservation_id
      JOIN rooms room ON room.id = reservation.room_id
      WHERE visit.status <> 'CANCELLED'
        AND visit.opened_at >= $1
        AND visit.opened_at <= $2
      GROUP BY room.id, room.name
      ORDER BY visits_count ${direction}, collected_total ${direction}, lower(room.name) ASC
      LIMIT $3;
    `,
    [filters.startMs, filters.endMs, filters.limit],
  );
  return (result.rows || []).map((row) => ({
    ...row,
    pending_total: Math.max(mapInt(row.room_total) - mapInt(row.collected_total), 0),
    average_ticket:
      mapInt(row.visits_count) > 0
        ? Math.round(mapInt(row.collected_total) / mapInt(row.visits_count))
        : 0,
  }));
}

async function listInventoryMovements(filters) {
  const result = await db.query(
    `
      SELECT
        movement.*,
        product.name AS product_name,
        product.unit,
        batch.expiration_date,
        batch.lot_number
      FROM inventory_movements movement
      JOIN cafeteria_products product ON product.id = movement.product_id
      LEFT JOIN inventory_batches batch ON batch.id = movement.inventory_batch_id
      WHERE movement.occurred_at >= $1
        AND movement.occurred_at <= $2
      ORDER BY movement.occurred_at DESC, movement.id DESC
      LIMIT $3
      OFFSET $4;
    `,
    [filters.startMs, filters.endMs, filters.limit, filters.offset],
  );
  return result.rows || [];
}

async function listVisitReport(filters) {
  const result = await db.query(
    `
      SELECT
        visit.id AS visit_account_id,
        visit.display_name,
        visit.location_label,
        visit.status,
        visit.opened_at,
        visit.closed_at,
        reservation.id AS reservation_id,
        reservation.date AS reservation_date,
        reservation.start_time,
        reservation.end_time,
        reservation.players,
        reservation.total AS room_total,
        room.name AS room_name,
        COALESCE((
          SELECT SUM(item.charged_subtotal)
          FROM order_items item
          WHERE item.visit_account_id = visit.id
            AND item.status = 'ACTIVE'
        ), 0)::INTEGER AS cafeteria_total,
        COALESCE((
          SELECT SUM(payment.amount)
          FROM reservation_payments payment
          WHERE payment.reservation_id = visit.reservation_id
            AND payment.status = 'CONFIRMED'
        ), 0)::INTEGER AS reservation_paid,
        COALESCE((
          SELECT SUM(payment.amount)
          FROM visit_payments payment
          WHERE payment.visit_account_id = visit.id
            AND payment.status = 'CONFIRMED'
        ), 0)::INTEGER AS visit_paid
      FROM visit_accounts visit
      LEFT JOIN reservations reservation ON reservation.id = visit.reservation_id
      LEFT JOIN rooms room ON room.id = reservation.room_id
      WHERE visit.opened_at >= $1
        AND visit.opened_at <= $2
      ORDER BY visit.opened_at DESC, visit.id DESC
      LIMIT $3
      OFFSET $4;
    `,
    [filters.startMs, filters.endMs, filters.limit, filters.offset],
  );
  return (result.rows || []).map((row) => {
    const total = mapInt(row.room_total) + mapInt(row.cafeteria_total);
    const paid = mapInt(row.reservation_paid) + mapInt(row.visit_paid);
    return {
      ...row,
      total_paid: paid,
      pending_amount: Math.max(total - paid, 0),
    };
  });
}

async function listDailyCloses(filters) {
  const result = await db.query(
    `
      SELECT *
      FROM daily_closes
      WHERE business_date >= $1
        AND business_date <= $2
      ORDER BY business_date DESC, id DESC
      LIMIT $3
      OFFSET $4;
    `,
    [filters.dateFrom, filters.dateTo, filters.limit, filters.offset],
  );
  return result.rows || [];
}

function buildCafeteriaProfitQuery(filters) {
  const values = [filters.startMs, filters.endMs];
  const clauses = [
    "item.created_at >= $1",
    "item.created_at <= $2",
    "item.status = 'ACTIVE'",
  ];
  if (filters.orderType) {
    values.push(filters.orderType);
    clauses.push(`item.type = $${values.length}`);
  }
  if (filters.productId) {
    values.push(filters.productId);
    clauses.push(`item.product_id = $${values.length}`);
  }
  if (filters.categoryId) {
    values.push(filters.categoryId);
    clauses.push(`product.category_id = $${values.length}`);
  }
  return { values, where: clauses.join(" AND ") };
}

const CAFETERIA_PROFIT_FROM = `
  FROM order_items item
  JOIN cafeteria_products product ON product.id = item.product_id
  LEFT JOIN cafeteria_categories category ON category.id = product.category_id
  LEFT JOIN order_item_cost_snapshots snapshot
    ON snapshot.order_item_id = item.id
    AND snapshot.status = 'ACTIVE'
`;

async function listCafeteriaProfitReport(filters) {
  const base = buildCafeteriaProfitQuery(filters);
  const detailValues = [...base.values, filters.limit, filters.offset];
  const [summary, trend, products, categories, count, details, productOptions, categoryOptions] =
    await Promise.all([
      db.query(
        `
          SELECT
            COALESCE(SUM(item.quantity) FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS units_sold,
            COALESCE(SUM(item.quantity) FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_units,
            COALESCE(SUM(COALESCE(snapshot.total_revenue, item.charged_subtotal))
              FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS sales_revenue,
            COALESCE(SUM(item.commercial_subtotal), 0)::INTEGER AS commercial_value,
            COALESCE(SUM(item.commercial_subtotal)
              FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_commercial_value,
            COALESCE(SUM(COALESCE(snapshot.total_cost, 0))
              FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS sales_cost,
            COALESCE(SUM(COALESCE(snapshot.total_cost, 0))
              FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_cost,
            COUNT(*) FILTER (
              WHERE snapshot.id IS NULL OR snapshot.cost_incomplete = TRUE
            )::INTEGER AS incomplete_items,
            COUNT(DISTINCT item.product_id) FILTER (
              WHERE snapshot.id IS NULL OR snapshot.cost_incomplete = TRUE
            )::INTEGER AS incomplete_products
          ${CAFETERIA_PROFIT_FROM}
          WHERE ${base.where};
        `,
        base.values,
      ),
      db.query(
        `
          SELECT
            TO_CHAR(
              TO_TIMESTAMP(item.created_at / 1000.0) AT TIME ZONE 'America/Bogota',
              'YYYY-MM-DD'
            ) AS business_date,
            COALESCE(SUM(COALESCE(snapshot.total_revenue, item.charged_subtotal))
              FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS sales_revenue,
            COALESCE(SUM(COALESCE(snapshot.total_cost, 0))
              FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS sales_cost,
            COALESCE(SUM(COALESCE(snapshot.total_cost, 0))
              FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_cost
          ${CAFETERIA_PROFIT_FROM}
          WHERE ${base.where}
          GROUP BY business_date
          ORDER BY business_date ASC;
        `,
        base.values,
      ),
      db.query(
        `
          SELECT
            item.product_id,
            product.name AS product_name,
            COALESCE(category.name, product.category, 'Sin categoria') AS category_name,
            COALESCE(SUM(item.quantity) FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS units_sold,
            COALESCE(SUM(item.quantity) FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_units,
            COALESCE(SUM(COALESCE(snapshot.total_revenue, item.charged_subtotal))
              FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS sales_revenue,
            COALESCE(SUM(COALESCE(snapshot.total_cost, 0))
              FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS sales_cost,
            COALESCE(SUM(COALESCE(snapshot.total_cost, 0))
              FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_cost,
            COALESCE(SUM(item.commercial_subtotal)
              FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_commercial_value,
            COUNT(*) FILTER (
              WHERE snapshot.id IS NULL OR snapshot.cost_incomplete = TRUE
            )::INTEGER AS incomplete_items
          ${CAFETERIA_PROFIT_FROM}
          WHERE ${base.where}
          GROUP BY item.product_id, product.name,
            COALESCE(category.name, product.category, 'Sin categoria')
          ORDER BY (
            COALESCE(SUM(COALESCE(snapshot.total_revenue, item.charged_subtotal))
              FILTER (WHERE item.type = 'SALE'), 0)
            - COALESCE(SUM(COALESCE(snapshot.total_cost, 0)), 0)
          ) ${filters.sort === "least" ? "ASC" : "DESC"}, product.name ASC
          LIMIT 50;
        `,
        base.values,
      ),
      db.query(
        `
          SELECT
            COALESCE(category.id, 0) AS category_id,
            COALESCE(category.name, product.category, 'Sin categoria') AS category_name,
            COALESCE(SUM(COALESCE(snapshot.total_revenue, item.charged_subtotal))
              FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS sales_revenue,
            COALESCE(SUM(COALESCE(snapshot.total_cost, 0))
              FILTER (WHERE item.type = 'SALE'), 0)::INTEGER AS sales_cost,
            COALESCE(SUM(COALESCE(snapshot.total_cost, 0))
              FILTER (WHERE item.type = 'COURTESY'), 0)::INTEGER AS courtesy_cost
          ${CAFETERIA_PROFIT_FROM}
          WHERE ${base.where}
          GROUP BY COALESCE(category.id, 0),
            COALESCE(category.name, product.category, 'Sin categoria')
          ORDER BY sales_revenue DESC, category_name ASC;
        `,
        base.values,
      ),
      db.query(
        `SELECT COUNT(*)::INTEGER AS total ${CAFETERIA_PROFIT_FROM} WHERE ${base.where};`,
        base.values,
      ),
      db.query(
        `
          SELECT
            item.id,
            item.created_at,
            item.product_id,
            item.product_name_snapshot AS product_name,
            COALESCE(category.name, product.category, 'Sin categoria') AS category_name,
            item.type,
            item.quantity,
            item.commercial_subtotal AS commercial_value,
            COALESCE(snapshot.total_revenue, item.charged_subtotal)::INTEGER AS sales_revenue,
            COALESCE(snapshot.total_cost, 0)::INTEGER AS total_cost,
            CASE
              WHEN item.type = 'COURTESY' THEN -COALESCE(snapshot.total_cost, 0)
              ELSE COALESCE(snapshot.total_revenue, item.charged_subtotal)
                - COALESCE(snapshot.total_cost, 0)
            END::INTEGER AS gross_profit,
            snapshot.gross_margin,
            snapshot.costing_method,
            (snapshot.id IS NULL OR snapshot.cost_incomplete = TRUE) AS cost_incomplete,
            (snapshot.id IS NULL) AS missing_snapshot
          ${CAFETERIA_PROFIT_FROM}
          WHERE ${base.where}
          ORDER BY item.created_at DESC, item.id DESC
          LIMIT $${base.values.length + 1}
          OFFSET $${base.values.length + 2};
        `,
        detailValues,
      ),
      db.query(
        `SELECT id, name FROM cafeteria_products ORDER BY lower(name) ASC;`,
      ),
      db.query(
        `SELECT id, name FROM cafeteria_categories ORDER BY lower(name) ASC;`,
      ),
    ]);

  const rawSummary = summary.rows[0] || {};
  const salesRevenue = mapInt(rawSummary.sales_revenue);
  const salesCost = mapInt(rawSummary.sales_cost);
  const courtesyCost = mapInt(rawSummary.courtesy_cost);
  const grossProfit = salesRevenue - salesCost;
  return {
    summary: {
      ...rawSummary,
      gross_profit: grossProfit,
      gross_margin:
        salesRevenue > 0
          ? Math.round((grossProfit / salesRevenue) * 10000) / 100
          : null,
      net_contribution: grossProfit - courtesyCost,
    },
    trend: trend.rows || [],
    products: (products.rows || []).map((row) => ({
      ...row,
      gross_profit: mapInt(row.sales_revenue) - mapInt(row.sales_cost),
      net_contribution:
        mapInt(row.sales_revenue) - mapInt(row.sales_cost) - mapInt(row.courtesy_cost),
    })),
    categories: (categories.rows || []).map((row) => ({
      ...row,
      gross_profit: mapInt(row.sales_revenue) - mapInt(row.sales_cost),
      net_contribution:
        mapInt(row.sales_revenue) - mapInt(row.sales_cost) - mapInt(row.courtesy_cost),
    })),
    details: details.rows || [],
    total: mapInt(count.rows[0]?.total),
    page: filters.page,
    limit: filters.limit,
    productOptions: productOptions.rows || [],
    categoryOptions: categoryOptions.rows || [],
  };
}

module.exports = async function initConsumer() {
  return {
    getDashboard,
    listFinancialMovements,
    listSalesReport,
    listProductsRanking,
    listRoomsRanking,
    listInventoryMovements,
    listVisitReport,
    listDailyCloses,
    listCafeteriaProfitReport,
  };
};
