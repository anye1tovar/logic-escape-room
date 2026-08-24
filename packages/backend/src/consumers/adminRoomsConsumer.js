const db = require("../db/initDb");

async function listRooms() {
  const result = await db.query("SELECT * FROM rooms ORDER BY id DESC;");
  return result.rows || [];
}

async function createRoom(payload) {
  const result = await db.query(
    `INSERT INTO rooms (name, description, theme, cover_image, video_url, min_players, max_players, min_age, duration_minutes, difficulty, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id;`,
    [
      payload.name,
      payload.description ?? null,
      payload.theme ?? null,
      payload.coverImage ?? null,
      payload.videoUrl ?? null,
      payload.minPlayers ?? null,
      payload.maxPlayers ?? null,
      payload.minAge ?? null,
      payload.durationMinutes ?? null,
      payload.difficulty ?? null,
      payload.active ?? true,
    ],
  );
  return { id: result.rows[0]?.id ?? null };
}

async function updateRoom(id, payload) {
  const result = await db.query(
    `UPDATE rooms
     SET name = $1, description = $2, theme = $3, cover_image = $4, video_url = $5, min_players = $6, max_players = $7, min_age = $8, duration_minutes = $9, difficulty = $10, active = $11
     WHERE id = $12;`,
    [
      payload.name,
      payload.description ?? null,
      payload.theme ?? null,
      payload.coverImage ?? null,
      payload.videoUrl ?? null,
      payload.minPlayers ?? null,
      payload.maxPlayers ?? null,
      payload.minAge ?? null,
      payload.durationMinutes ?? null,
      payload.difficulty ?? null,
      payload.active ?? true,
      id,
    ],
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
