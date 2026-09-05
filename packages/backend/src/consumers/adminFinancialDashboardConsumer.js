const db = require("../db/initDb");

function number(value) {
  return Number(value || 0);
}

async function getDetails(filters) {
  const values = [filters.startMs, filters.endMs];
  const [products, rooms, quality] = await Promise.all([
    db.query(
      `
        WITH paid_items AS (
          SELECT
            item.id,
            item.product_id,
            item.product_name_snapshot,
            item.quantity,
            item.charged_subtotal,
            SUM(allocation.amount)::NUMERIC AS collected_revenue
          FROM payment_allocations allocation
          JOIN visit_payments payment ON payment.id = allocation.payment_id
          JOIN order_items item ON item.id = allocation.order_item_id
          WHERE payment.status = 'CONFIRMED'
            AND item.status = 'ACTIVE'
            AND item.type = 'SALE'
            AND payment.paid_at >= $1 AND payment.paid_at <= $2
          GROUP BY item.id
        )
        SELECT
          paid.product_id,
          paid.product_name_snapshot AS product_name,
          SUM(paid.collected_revenue)::INTEGER AS collected_revenue,
          ROUND(SUM(COALESCE(
            snapshot.total_cost * paid.collected_revenue
              / NULLIF(paid.charged_subtotal, 0),
            0
          )))::INTEGER AS recognized_cost,
          COUNT(*) FILTER (
            WHERE snapshot.id IS NULL OR snapshot.cost_incomplete = TRUE
          )::INTEGER AS incomplete_items
        FROM paid_items paid
        LEFT JOIN order_item_cost_snapshots snapshot
          ON snapshot.order_item_id = paid.id AND snapshot.status = 'ACTIVE'
        GROUP BY paid.product_id, paid.product_name_snapshot
        ORDER BY
          SUM(paid.collected_revenue - COALESCE(
            snapshot.total_cost * paid.collected_revenue
              / NULLIF(paid.charged_subtotal, 0),
            0
          )) DESC,
          lower(paid.product_name_snapshot) ASC
        LIMIT 10;
      `,
      values,
    ),
    db.query(
      `
        WITH room_collections AS (
          SELECT room.id AS room_id, room.name AS room_name, payment.amount
          FROM reservation_payments payment
          JOIN reservations reservation ON reservation.id = payment.reservation_id
          JOIN rooms room ON room.id = reservation.room_id
          WHERE payment.status = 'CONFIRMED'
            AND payment.paid_at >= $1 AND payment.paid_at <= $2
          UNION ALL
          SELECT room.id, room.name, allocation.amount
          FROM payment_allocations allocation
          JOIN visit_payments payment ON payment.id = allocation.payment_id
          JOIN visit_accounts visit ON visit.id = payment.visit_account_id
          JOIN reservations reservation ON reservation.id = visit.reservation_id
          JOIN rooms room ON room.id = reservation.room_id
          WHERE payment.status = 'CONFIRMED'
            AND allocation.component = 'VISIT_BALANCE'
            AND payment.paid_at >= $1 AND payment.paid_at <= $2
        )
        SELECT
          room_id,
          room_name,
          SUM(amount)::INTEGER AS collected_total,
          COUNT(*)::INTEGER AS collection_count
        FROM room_collections
        GROUP BY room_id, room_name
        ORDER BY collected_total DESC, lower(room_name) ASC
        LIMIT 10;
      `,
      values,
    ),
    db.query(
      `
        WITH paid_items AS (
          SELECT DISTINCT item.id, item.product_id
          FROM payment_allocations allocation
          JOIN visit_payments payment ON payment.id = allocation.payment_id
          JOIN order_items item ON item.id = allocation.order_item_id
          WHERE payment.status = 'CONFIRMED'
            AND item.status = 'ACTIVE'
            AND item.type = 'SALE'
            AND payment.paid_at >= $1 AND payment.paid_at <= $2
        ),
        active_days AS (
          SELECT TO_CHAR(TO_TIMESTAMP(paid_at / 1000.0) AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS business_date
          FROM reservation_payments
          WHERE status = 'CONFIRMED' AND paid_at >= $1 AND paid_at <= $2
          UNION
          SELECT TO_CHAR(TO_TIMESTAMP(paid_at / 1000.0) AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD')
          FROM visit_payments
          WHERE status = 'CONFIRMED' AND paid_at >= $1 AND paid_at <= $2
          UNION
          SELECT TO_CHAR(TO_TIMESTAMP(occurred_at / 1000.0) AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD')
          FROM expenses
          WHERE status = 'ACTIVE' AND occurred_at >= $1 AND occurred_at <= $2
        )
        SELECT
          (SELECT COUNT(DISTINCT paid.product_id) FROM paid_items paid
            LEFT JOIN order_item_cost_snapshots snapshot
              ON snapshot.order_item_id = paid.id AND snapshot.status = 'ACTIVE'
            WHERE snapshot.id IS NULL OR snapshot.cost_incomplete = TRUE
          )::INTEGER AS products_without_cost,
          (SELECT COUNT(*) FROM product_recipes recipe
            WHERE recipe.active = TRUE AND (
              NOT EXISTS (SELECT 1 FROM product_recipe_items item WHERE item.recipe_id = recipe.id)
              OR EXISTS (
                SELECT 1
                FROM product_recipe_items item
                WHERE item.recipe_id = recipe.id
                  AND NOT EXISTS (
                    SELECT 1
                    FROM supply_purchase_items purchase_item
                    JOIN supply_purchases purchase ON purchase.id = purchase_item.purchase_id
                    WHERE purchase_item.supply_id = item.supply_id
                      AND purchase.status = 'ACTIVE'
                      AND purchase_item.converted_quantity > 0
                      AND purchase_item.line_total > 0
                  )
              )
            )
          )::INTEGER AS incomplete_recipes,
          (SELECT COUNT(*) FROM expenses
            WHERE status = 'ACTIVE'
              AND occurred_at >= $1 AND occurred_at <= $2
              AND cost_center = 'UNASSIGNED'
          )::INTEGER AS expenses_without_cost_center,
          (SELECT COUNT(*) FROM expenses
            WHERE status = 'ACTIVE'
              AND occurred_at >= $1 AND occurred_at <= $2
              AND cost_center = 'MIXED'
              AND allocation_source <> 'RULE'
          )::INTEGER AS mixed_expenses_without_rule,
          (
            (SELECT COUNT(*) FROM inventory_purchase_items item
              JOIN inventory_purchases purchase ON purchase.id = item.purchase_id
              WHERE purchase.status = 'ACTIVE'
                AND purchase.received_at >= $1 AND purchase.received_at <= $2
                AND COALESCE(item.line_total, 0) <= 0)
            +
            (SELECT COUNT(*) FROM supply_purchase_items item
              JOIN supply_purchases purchase ON purchase.id = item.purchase_id
              WHERE purchase.status = 'ACTIVE'
                AND purchase.received_at >= $1 AND purchase.received_at <= $2
                AND COALESCE(item.line_total, 0) <= 0)
          )::INTEGER AS purchases_without_cost,
          (SELECT COUNT(*) FROM active_days day
            LEFT JOIN daily_closes close ON close.business_date = day.business_date
            WHERE close.id IS NULL
          )::INTEGER AS missing_daily_closes;
      `,
      values,
    ),
  ]);

  return {
    products: (products.rows || []).map((row) => {
      const revenue = number(row.collected_revenue);
      const cost = number(row.recognized_cost);
      return {
        productId: number(row.product_id),
        productName: row.product_name,
        collectedRevenue: revenue,
        recognizedCost: cost,
        grossProfit: revenue - cost,
        grossMargin:
          revenue > 0 ? Math.round(((revenue - cost) / revenue) * 10000) / 100 : null,
        incompleteItems: number(row.incomplete_items),
      };
    }),
    rooms: (rooms.rows || []).map((row) => ({
      roomId: number(row.room_id),
      roomName: row.room_name,
      collectedTotal: number(row.collected_total),
      collectionCount: number(row.collection_count),
    })),
    quality: {
      productsWithoutCost: number(quality.rows[0]?.products_without_cost),
      incompleteRecipes: number(quality.rows[0]?.incomplete_recipes),
      expensesWithoutCostCenter: number(
        quality.rows[0]?.expenses_without_cost_center,
      ),
      mixedExpensesWithoutRule: number(
        quality.rows[0]?.mixed_expenses_without_rule,
      ),
      purchasesWithoutCost: number(quality.rows[0]?.purchases_without_cost),
      missingDailyCloses: number(quality.rows[0]?.missing_daily_closes),
    },
  };
}

module.exports = async function initConsumer() {
  return { getDetails };
};
