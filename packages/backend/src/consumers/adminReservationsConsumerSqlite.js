const db = require("../db/initDb");

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
    `SELECT id, room_id, date, start_time, end_time, actual_duration_ms, timer_start_ms, timer_end_ms, consult_code, first_name, last_name, phone, players, notes, total, status, is_first_time, reservation_source, out_of_hours, reprogrammed FROM reservations${whereSql}` +
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
  let sql =
    "SELECT id, room_id, date, start_time, end_time, actual_duration_ms, timer_start_ms, timer_end_ms, consult_code, first_name, last_name, phone, players, notes, total, status, is_first_time, reservation_source, out_of_hours, reprogrammed FROM reservations";
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
    "SELECT * FROM reservations WHERE id = $1;",
    [id]
  );
  return result.rows[0] || null;
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
    createReservationChange,
    setReservationTimerStart,
    setReservationTimerEnd,
  };
};
