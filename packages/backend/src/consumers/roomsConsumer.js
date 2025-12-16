const db = require("../db/initDb");

function listRooms() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM rooms;", (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function getRoomById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM rooms WHERE id = ?;", [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

module.exports = async function initRoomsConsumer() {
  // db is ready (initDb sets up schema on require)
  return { listRooms, getRoomById };
};
