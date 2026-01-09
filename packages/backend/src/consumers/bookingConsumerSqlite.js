const db = require("../db/initDb");
const { v4: uuidv4 } = require("uuid");

async function createBooking({
  firstName,
  lastName,
  name,
  whatsapp,
  roomId,
  time,
  endTime,
  attendees,
  notes,
  total,
  sendReceipt,
  date,
  consultCode,
  isFirstTime,
}) {
  const id = uuidv4();
  const createdAt = Date.now();
  const isFirstTimeBool = Boolean(isFirstTime);
  const finalName = name || `${firstName || ""} ${lastName || ""}`.trim();

  const result = await db.query(
    `INSERT INTO reservations
      (room_id, date, start_time, end_time, consult_code, first_name, last_name, phone, players, notes, total, status, is_first_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id;`,
    [
      roomId || null,
      date,
      time || null,
      endTime || time || null,
      consultCode || null,
      firstName ?? "",
      lastName ?? "",
      whatsapp || null,
      attendees || null,
      notes || null,
      Number.isFinite(Number(total)) ? Number(total) : null,
      "PENDING",
      isFirstTimeBool,
    ]
  );

  return {
    id: result.rows[0]?.id ?? null,
    firstName,
    lastName,
    name: finalName,
    whatsapp,
    roomId,
    time,
    endTime: endTime || time || null,
    attendees,
    notes: notes || null,
    total: Number.isFinite(Number(total)) ? Number(total) : null,
    sendReceipt: Boolean(sendReceipt),
    isFirstTime: isFirstTimeBool,
    date,
    consultCode: consultCode || null,
    createdAt,
  };
}

async function getBookingById(id) {
  const result = await db.query(
    "SELECT * FROM reservations WHERE id = $1;",
    [id]
  );
  return result.rows[0] || null;
}

async function getBookingByConsultCode(consultCode) {
  const raw = String(consultCode || "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  const compact = upper.replace(/[\s-]+/g, "");

  const result = await db.query(
    `SELECT * FROM reservations
     WHERE UPPER(consult_code) = $1
        OR REPLACE(REPLACE(UPPER(consult_code), '-', ''), ' ', '') = $2
     ORDER BY id DESC
     LIMIT 1;`,
    [upper, compact]
  );
  return result.rows[0] || null;
}

async function listBookings() {
  const result = await db.query(
    "SELECT * FROM reservations ORDER BY id DESC;"
  );
  return result.rows || [];
}

async function listBookingsByDate(date) {
  const result = await db.query(
    "SELECT * FROM reservations WHERE date = $1 ORDER BY id DESC;",
    [date]
  );
  return result.rows || [];
}

module.exports = async function initConsumer() {
  return {
    createBooking,
    getBookingById,
    getBookingByConsultCode,
    listBookings,
    listBookingsByDate,
  };
};
