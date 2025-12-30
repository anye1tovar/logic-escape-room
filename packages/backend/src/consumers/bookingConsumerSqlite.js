const db = require("../db/initDb");
const { v4: uuidv4 } = require("uuid");

function createBooking({
  firstName,
  lastName,
  name,
  email,
  whatsapp,
  roomId,
  time,
  endTime,
  attendees,
  sendReceipt,
  date,
  consultCode,
}) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const createdAt = Date.now();
    const sendReceiptInt = sendReceipt ? 1 : 0;
    const finalName = name || `${firstName || ""} ${lastName || ""}`.trim();
    db.run(
      `INSERT INTO reservations (room_id, date, start_time, end_time, consult_code, first_name, last_name, phone, email, players, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        roomId || null,
        date,
        time || null,
        endTime || time || null,
        consultCode || null,
        firstName ?? "",
        lastName ?? "",
        whatsapp || null,
        email || null,
        attendees || null,
        "PENDING",
      ],
      function (err) {
        if (err) return reject(err);
        // return created booking data
        resolve({
          id: this.lastID,
          firstName,
          lastName,
          name: finalName,
          email,
          whatsapp,
          roomId,
          time,
          endTime: endTime || time || null,
          attendees,
          sendReceipt: !!sendReceiptInt,
          date,
          consultCode: consultCode || null,
          createdAt,
        });
      }
    );
  });
}

function getBookingById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM reservations WHERE id = ?;", [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function listBookings() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM reservations ORDER BY id DESC;", (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function listBookingsByDate(date) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM reservations WHERE date = ? ORDER BY id DESC;",
      [date],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

module.exports = async function initConsumer() {
  return { createBooking, getBookingById, listBookings, listBookingsByDate };
};
