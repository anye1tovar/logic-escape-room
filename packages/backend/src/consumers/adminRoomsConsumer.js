const db = require("../db/initDb");

async function listRooms() {
  const result = await db.query("SELECT * FROM rooms ORDER BY id DESC;");
  return result.rows || [];
}

async function createRoom(payload) {
  const result = await db.query(
    `INSERT INTO rooms (name, description, theme, video_url, min_players, max_players, min_age, duration_minutes, difficulty, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id;`,
    [
      payload.name,
      payload.description ?? null,
      payload.theme ?? null,
      payload.videoUrl ?? null,
      payload.minPlayers ?? null,
      payload.maxPlayers ?? null,
      payload.minAge ?? null,
      payload.durationMinutes ?? null,
      payload.difficulty ?? null,
      payload.active ?? true,
    ]
  );
  return { id: result.rows[0]?.id ?? null };
}

async function updateRoom(id, payload) {
  const result = await db.query(
    `UPDATE rooms
     SET name = $1, description = $2, theme = $3, video_url = $4, min_players = $5, max_players = $6, min_age = $7, duration_minutes = $8, difficulty = $9, active = $10
     WHERE id = $11;`,
    [
      payload.name,
      payload.description ?? null,
      payload.theme ?? null,
      payload.videoUrl ?? null,
      payload.minPlayers ?? null,
      payload.maxPlayers ?? null,
      payload.minAge ?? null,
      payload.durationMinutes ?? null,
      payload.difficulty ?? null,
      payload.active ?? true,
      id,
    ]
  );
  return { changes: result.rowCount };
}

async function deleteRoom(id) {
  const result = await db.query("DELETE FROM rooms WHERE id = $1;", [id]);
  return { changes: result.rowCount };
}

module.exports = async function initConsumer() {
  return { listRooms, createRoom, updateRoom, deleteRoom };
};
