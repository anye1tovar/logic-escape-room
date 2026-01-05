const db = require("../db/initDb");

function listRooms() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM rooms ORDER BY id DESC;", (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function createRoom(payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO rooms (name, description, theme, min_players, max_players, min_age, duration_minutes, difficulty, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        payload.name,
        payload.description ?? null,
        payload.theme ?? null,
        payload.minPlayers ?? null,
        payload.maxPlayers ?? null,
        payload.minAge ?? null,
        payload.durationMinutes ?? null,
        payload.difficulty ?? null,
        payload.active ?? 1,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
}

function updateRoom(id, payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE rooms
       SET name = ?, description = ?, theme = ?, min_players = ?, max_players = ?, min_age = ?, duration_minutes = ?, difficulty = ?, active = ?
       WHERE id = ?;`,
      [
        payload.name,
        payload.description ?? null,
        payload.theme ?? null,
        payload.minPlayers ?? null,
        payload.maxPlayers ?? null,
        payload.minAge ?? null,
        payload.durationMinutes ?? null,
        payload.difficulty ?? null,
        payload.active ?? 1,
        id,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

function deleteRoom(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM rooms WHERE id = ?;", [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = async function initConsumer() {
  return { listRooms, createRoom, updateRoom, deleteRoom };
};

