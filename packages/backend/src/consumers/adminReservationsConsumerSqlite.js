const db = require("../db/initDb");

function buildWhere(filters) {
  const where = [];
  const params = [];

  const dateFrom = String(filters?.dateFrom || "").trim();
  const dateTo = String(filters?.dateTo || "").trim();
  const date = String(filters?.date || "").trim();
  if (dateFrom && dateTo) {
    where.push("date >= ? AND date <= ?");
    params.push(dateFrom, dateTo);
  } else if (dateFrom) {
    where.push("date = ?");
    params.push(dateFrom);
  } else if (dateTo) {
    where.push("date = ?");
    params.push(dateTo);
  } else if (date) {
    where.push("date = ?");
    params.push(date);
  }

  const search = String(filters?.search || "").trim();
  if (search) {
    where.push(
      "(LOWER(first_name || ' ' || last_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(consult_code) LIKE ?)"
    );
    const q = `%${search.toLowerCase()}%`;
    params.push(q, q, q, q);
  }

  return { where, params };
}

function listReservationsPage(input) {
  return new Promise((resolve, reject) => {
    const page = Number(input?.page || 1);
    const pageSize = Number(input?.pageSize || 10);
    const safePage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
    const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.trunc(pageSize) : 10;
    const offset = (safePage - 1) * safeSize;

    const { where, params } = buildWhere(input);
    const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";

    db.get(`SELECT COUNT(*) as total FROM reservations${whereSql};`, params, (err, row) => {
      if (err) return reject(err);
      const totalRecords = Number(row?.total || 0);

      const listSql =
        `SELECT * FROM reservations${whereSql}` +
        " ORDER BY date ASC, start_time ASC, id ASC" +
        " LIMIT ? OFFSET ?;";

      db.all(listSql, [...params, safeSize, offset], (err2, rows) => {
        if (err2) return reject(err2);
        resolve({ records: rows || [], totalRecords });
      });
    });
  });
}

function listReservations(filters) {
  return new Promise((resolve, reject) => {
    const { where, params } = buildWhere({
      ...filters,
      search: filters?.search ?? filters?.name,
      dateFrom: filters?.dateFrom ?? filters?.from ?? filters?.date,
      dateTo: filters?.dateTo ?? filters?.to ?? filters?.date,
    });
    let sql = "SELECT * FROM reservations";
    if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
    sql += " ORDER BY date ASC, start_time ASC, id ASC;";

    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function updateReservation(id, payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE reservations
       SET room_id = ?,
           date = ?,
           start_time = ?,
           end_time = ?,
           consult_code = ?,
           first_name = ?,
           last_name = ?,
           phone = ?,
           email = ?,
           players = ?,
           notes = ?,
           total = ?,
           status = ?,
           is_first_time = ?
       WHERE id = ?;`,
      [
        payload.roomId,
        payload.date,
        payload.startTime,
        payload.endTime,
        payload.consultCode,
        payload.firstName,
        payload.lastName,
        payload.phone,
        payload.email,
        payload.players,
        payload.notes,
        payload.total,
        payload.status,
        payload.isFirstTime,
        id,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

function deleteReservation(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM reservations WHERE id = ?;", [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = async function initConsumer() {
  return { listReservations, listReservationsPage, updateReservation, deleteReservation };
};
