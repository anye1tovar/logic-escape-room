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
  marketingConsent,
  marketingConsentAt,
  tracking,
  reservationSource,
  outOfHours,
}) {
  const id = uuidv4();
  const createdAt = Date.now();
  const isFirstTimeBool = Boolean(isFirstTime);
  const finalName = name || `${firstName || ""} ${lastName || ""}`.trim();

  const result = await db.query(
    `INSERT INTO reservations
      (room_id, date, start_time, end_time, consult_code, first_name, last_name, phone, players, notes, total, status, is_first_time, marketing_consent, marketing_consent_at, tracking_fbp, tracking_fbc, tracking_source_url, tracking_user_agent, tracking_ip, tracking_lead_event_id, tracking_schedule_event_id, reservation_source, out_of_hours, reprogrammed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
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
      Boolean(marketingConsent),
      marketingConsentAt || null,
      tracking?.fbp || null,
      tracking?.fbc || null,
      tracking?.sourceUrl || null,
      tracking?.userAgent || null,
      tracking?.ip || null,
      tracking?.leadEventId || null,
      tracking?.scheduleEventId || null,
      reservationSource || "web",
      Boolean(outOfHours),
      false,
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
    marketingConsent: Boolean(marketingConsent),
    marketingConsentAt: marketingConsentAt || null,
    tracking: tracking || null,
    date,
    consultCode: consultCode || null,
    createdAt,
    reservationSource: reservationSource || "web",
    outOfHours: Boolean(outOfHours),
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
