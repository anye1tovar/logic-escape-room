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
  attendees,
  sendReceipt,
  date,
}) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const createdAt = Date.now();
    const sendReceiptInt = sendReceipt ? 1 : 0;
    const finalName = name || `${firstName || ""} ${lastName || ""}`.trim();
    db.run(
      `INSERT INTO reservations (room_id, date, start_time, end_time, first_name, last_name, phone, email, players, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        roomId || null,
        date,
        time || null,
        null,
        firstName || null,
        lastName || null,
        whatsapp || null,
        email || null,
        attendees || null,
        "CONFIRMED",
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
          attendees,
          sendReceipt: !!sendReceiptInt,
          date,
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

module.exports = async function initConsumer() {
  return { createBooking, getBookingById, listBookings };
};
