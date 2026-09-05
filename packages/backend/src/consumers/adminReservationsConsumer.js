const db = require("../db/initDb");

const RESERVATION_FIELDS = `
  id,
  room_id,
  date,
  start_time,
  end_time,
  actual_duration_ms,
  timer_start_ms,
  timer_end_ms,
  consult_code,
  first_name,
  last_name,
  phone,
  players,
  notes,
  total,
  status,
  is_first_time,
  marketing_consent,
  marketing_consent_at,
  reservation_source,
  out_of_hours,
  reprogrammed,
  COALESCE((
    SELECT SUM(payment.amount)
    FROM reservation_payments payment
    WHERE payment.reservation_id = reservations.id
      AND payment.status = 'CONFIRMED'
  ), 0) AS total_paid,
  GREATEST(
    COALESCE(total, 0) - COALESCE((
      SELECT SUM(payment.amount)
      FROM reservation_payments payment
      WHERE payment.reservation_id = reservations.id
        AND payment.status = 'CONFIRMED'
    ), 0),
    0
  ) AS pending_amount,
  (
    SELECT visit.id
    FROM visit_accounts visit
    WHERE visit.reservation_id = reservations.id
      AND visit.status IN ('OPEN', 'PARTIALLY_PAID', 'PAID')
    ORDER BY visit.opened_at DESC
    LIMIT 1
  ) AS active_visit_account_id,
  (
    SELECT visit.status
    FROM visit_accounts visit
    WHERE visit.reservation_id = reservations.id
      AND visit.status IN ('OPEN', 'PARTIALLY_PAID', 'PAID')
    ORDER BY visit.opened_at DESC
    LIMIT 1
  ) AS active_visit_account_status
`;

function buildWhere(filters) {
  const where = [];
  const params = [];

  const dateFrom = String(filters?.dateFrom || "").trim();
  const dateTo = String(filters?.dateTo || "").trim();
  const date = String(filters?.date || "").trim();
  if (dateFrom && dateTo) {
    const fromIndex = params.length + 1;
    params.push(dateFrom);
    const toIndex = params.length + 1;
    params.push(dateTo);
    where.push(`date >= $${fromIndex} AND date <= $${toIndex}`);
  } else if (dateFrom) {
    params.push(dateFrom);
    where.push(`date >= $${params.length}`);
  } else if (dateTo) {
    params.push(dateTo);
    where.push(`date <= $${params.length}`);
  } else if (date) {
    params.push(date);
    where.push(`date = $${params.length}`);
  }

  const search = String(filters?.search || "").trim();
  if (search) {
    const q = `%${search.toLowerCase()}%`;
    const firstIndex = params.length + 1;
    params.push(q);
    const secondIndex = params.length + 1;
    params.push(q);
    const thirdIndex = params.length + 1;
    params.push(q);
    where.push(
      `(LOWER(first_name || ' ' || last_name) LIKE $${firstIndex} OR LOWER(phone) LIKE $${secondIndex} OR LOWER(consult_code) LIKE $${thirdIndex})`
    );
  }

  return { where, params };
}

async function listReservationsPage(input) {
  const page = Number(input?.page || 1);
  const pageSize = Number(input?.pageSize || 10);
  const safePage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
  const safeSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.trunc(pageSize) : 10;
  const offset = (safePage - 1) * safeSize;

  const { where, params } = buildWhere(input);
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM reservations${whereSql};`,
    params
  );
  const totalRecords = Number(countResult.rows[0]?.total || 0);

  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;
  const listSql =
    `SELECT ${RESERVATION_FIELDS} FROM reservations${whereSql}` +
    ` ORDER BY date ASC, start_time ASC, id ASC LIMIT $${limitIndex} OFFSET $${offsetIndex};`;

  const listResult = await db.query(listSql, [...params, safeSize, offset]);
  return { records: listResult.rows || [], totalRecords };
}

async function listReservations(filters) {
  const { where, params } = buildWhere({
    ...filters,
    search: filters?.search ?? filters?.name,
    dateFrom: filters?.dateFrom ?? filters?.from ?? filters?.date,
    dateTo: filters?.dateTo ?? filters?.to ?? filters?.date,
  });
  let sql = `SELECT ${RESERVATION_FIELDS} FROM reservations`;
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY date ASC, start_time ASC, id ASC;";

  const result = await db.query(sql, params);
  return result.rows || [];
}

async function updateReservation(id, payload) {
  const result = await db.query(
    `UPDATE reservations
     SET room_id = $1,
         date = $2,
         start_time = $3,
         end_time = $4,
         actual_duration_ms = $5,
         timer_start_ms = $6,
         timer_end_ms = $7,
         consult_code = $8,
         first_name = $9,
         last_name = $10,
         phone = $11,
         players = $12,
         notes = $13,
         total = $14,
         status = $15,
         is_first_time = $16,
         reservation_source = $17,
         reprogrammed = $18
     WHERE id = $19;`,
    [
      payload.roomId,
      payload.date,
      payload.startTime,
      payload.endTime,
      payload.actualDurationMs,
      payload.timerStartMs,
      payload.timerEndMs,
      payload.consultCode,
      payload.firstName,
      payload.lastName,
      payload.phone,
      payload.players,
      payload.notes,
      payload.total,
      payload.status,
      payload.isFirstTime,
      payload.reservationSource,
      payload.reprogrammed,
      id,
    ]
  );
  return { changes: result.rowCount };
}

async function getReservationById(id) {
  const result = await db.query(
    `SELECT ${RESERVATION_FIELDS} FROM reservations WHERE id = $1;`,
    [id]
  );
  return result.rows[0] || null;
}

async function getFinancialAccountForPayment(id) {
  const result = await db.query(
    `SELECT *
     FROM financial_accounts
     WHERE id = $1
     LIMIT 1;`,
    [id]
  );
  return result.rows[0] || null;
}

async function createReservationPayment(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const paymentResult = await client.query(
      `
        INSERT INTO reservation_payments (
          reservation_id,
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
        payload.reservationId,
        payload.amount,
        payload.financialAccountId,
        payload.paidAt,
        payload.notes,
        payload.createdBy,
        payload.createdAt,
      ]
    );
    const payment = paymentResult.rows[0];

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
        VALUES ($1, 'INCOME', $2, $3, $4, 'RESERVATION_PAYMENT', $5, $6, $7, 'ACTIVE')
        RETURNING id;
      `,
      [
        payload.financialAccountId,
        payload.amount,
        payload.paidAt,
        payload.notes || `Abono reserva #${payload.reservationId}`,
        String(payment.id),
        payload.createdBy,
        payload.createdAt,
      ]
    );
    const movementId = movementResult.rows[0]?.id ?? null;

    const updatedPaymentResult = await client.query(
      `
        UPDATE reservation_payments
        SET financial_movement_id = $1
        WHERE id = $2
        RETURNING *;
      `,
      [movementId, payment.id]
    );

    await client.query("COMMIT");
    return updatedPaymentResult.rows[0] || payment;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listReservationPayments(reservationId) {
  const result = await db.query(
    `
      SELECT
        payment.*,
        account.name AS financial_account_name,
        account.type AS financial_account_type,
        creator.name AS created_by_name,
        voider.name AS voided_by_name
      FROM reservation_payments payment
      LEFT JOIN financial_accounts account
        ON account.id = payment.financial_account_id
      LEFT JOIN users creator
        ON creator.id = payment.created_by
      LEFT JOIN users voider
        ON voider.id = payment.voided_by
      WHERE payment.reservation_id = $1
      ORDER BY payment.paid_at DESC, payment.id DESC;
    `,
    [reservationId]
  );
  return result.rows || [];
}

async function getReservationPaymentById(reservationId, paymentId) {
  const result = await db.query(
    `
      SELECT *
      FROM reservation_payments
      WHERE reservation_id = $1
        AND id = $2
      LIMIT 1;
    `,
    [reservationId, paymentId]
  );
  return result.rows[0] || null;
}

async function voidReservationPayment(payload) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const paymentResult = await client.query(
      `
        UPDATE reservation_payments
        SET
          status = 'VOIDED',
          voided_at = $1,
          voided_by = $2,
          void_reason = $3
        WHERE id = $4
          AND reservation_id = $5
          AND status = 'CONFIRMED'
        RETURNING *;
      `,
      [
        payload.voidedAt,
        payload.voidedBy,
        payload.reason,
        payload.paymentId,
        payload.reservationId,
      ]
    );
    const payment = paymentResult.rows[0] || null;
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

    await client.query("COMMIT");
    return payment;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function createReservationChange(payload) {
  const result = await db.query(
    `INSERT INTO reservation_changes
      (reservation_id, before_date, before_start_time, before_end_time, before_room_id, after_date, after_start_time, after_end_time, after_room_id, changed_by, changed_by_role, change_reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id;`,
    [
      payload.reservationId,
      payload.beforeDate,
      payload.beforeStartTime,
      payload.beforeEndTime,
      payload.beforeRoomId,
      payload.afterDate,
      payload.afterStartTime,
      payload.afterEndTime,
      payload.afterRoomId,
      payload.changedBy,
      payload.changedByRole,
      payload.changeReason,
      payload.createdAt,
    ]
  );
  return { id: result.rows[0]?.id ?? null };
}

async function deleteReservation(id) {
  const result = await db.query(
    "DELETE FROM reservations WHERE id = $1;",
    [id]
  );
  return { changes: result.rowCount };
}

async function setReservationTimerStart(id, startMs) {
  const result = await db.query(
    `UPDATE reservations
     SET timer_start_ms = $1,
         timer_end_ms = NULL,
         actual_duration_ms = NULL
     WHERE id = $2;`,
    [startMs, id]
  );
  return { changes: result.rowCount };
}

async function setReservationTimerEnd(id, endMs, durationMs) {
  const result = await db.query(
    `UPDATE reservations
     SET timer_end_ms = $1,
         actual_duration_ms = $2
     WHERE id = $3;`,
    [endMs, durationMs, id]
  );
  return { changes: result.rowCount };
}

module.exports = async function initConsumer() {
  return {
    listReservations,
    listReservationsPage,
    updateReservation,
    deleteReservation,
    getReservationById,
    getFinancialAccountForPayment,
    createReservationPayment,
    listReservationPayments,
    getReservationPaymentById,
    voidReservationPayment,
    createReservationChange,
    setReservationTimerStart,
    setReservationTimerEnd,
  };
};
