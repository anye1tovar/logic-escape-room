function buildAdminRoomsService(consumer) {
  function normalizeInt(value) {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : null;
  }

  function normalizeRoomInput(input) {
    const name = String(input?.name || "").trim();
    if (!name) {
      const err = new Error("name is required");
      err.status = 400;
      throw err;
    }

    return {
      name,
      description: input?.description ?? null,
      theme: input?.theme ?? null,
      minPlayers: normalizeInt(input?.minPlayers ?? input?.min_players),
      maxPlayers: normalizeInt(input?.maxPlayers ?? input?.max_players),
      minAge: normalizeInt(input?.minAge ?? input?.min_age),
      durationMinutes: normalizeInt(input?.durationMinutes ?? input?.duration_minutes),
      difficulty: normalizeInt(input?.difficulty),
      active:
        input?.active === 0 ||
        input?.active === false ||
        input?.active === "0"
          ? 0
          : 1,
    };
  }

  async function listRooms() {
    return consumer.listRooms();
  }

  async function createRoom(input) {
    const payload = normalizeRoomInput(input);
    const created = await consumer.createRoom(payload);
    return { id: created.id, ...payload };
  }

  async function updateRoom(id, input) {
    const roomId = normalizeInt(id);
    if (!roomId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const payload = normalizeRoomInput(input);
    const res = await consumer.updateRoom(roomId, payload);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { id: roomId, ...payload };
  }

  async function deleteRoom(id) {
    const roomId = normalizeInt(id);
    if (!roomId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const res = await consumer.deleteRoom(roomId);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { ok: true };
  }

  return { listRooms, createRoom, updateRoom, deleteRoom };
}

module.exports = buildAdminRoomsService;

