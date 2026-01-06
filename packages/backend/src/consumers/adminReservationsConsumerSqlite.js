const db = require("../db/initDb");

function listReservations(filters) {
  return new Promise((resolve, reject) => {
    const where = [];
    const params = [];

    const date = String(filters?.date || "").trim();
    if (date) {
      where.push("date = ?");
      params.push(date);
    }

    const name = String(filters?.name || "").trim();
    if (name) {
      where.push(
        "(LOWER(first_name || ' ' || last_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(consult_code) LIKE ?)"
      );
      const q = `%${name.toLowerCase()}%`;
      params.push(q, q, q, q);
    }

    let sql = "SELECT * FROM reservations";
    if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
    sql += " ORDER BY date DESC, start_time DESC, id DESC;";

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
  return { listReservations, updateReservation, deleteReservation };
};

