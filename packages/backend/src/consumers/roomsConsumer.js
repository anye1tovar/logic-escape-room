const db = require("../db/initDb");

async function listRooms() {
  const result = await db.query("SELECT * FROM rooms;");
  return result.rows || [];
}

async function getRoomById(id) {
  const result = await db.query("SELECT * FROM rooms WHERE id = $1;", [id]);
  return result.rows[0] || null;
}

module.exports = async function initRoomsConsumer() {
  // db is ready (initDb sets up schema on require)
  return { listRooms, getRoomById };
};
