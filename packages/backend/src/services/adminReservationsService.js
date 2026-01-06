function buildAdminReservationsService(consumer) {
  function normalizeInt(value) {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : null;
  }

  function normalizeText(value, { allowEmpty = true } = {}) {
    if (value == null) return allowEmpty ? "" : null;
    const text = String(value);
    if (!text.trim() && !allowEmpty) return null;
    return text;
  }

  function normalizeDate(value) {
    const raw = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const err = new Error("date must be YYYY-MM-DD");
      err.status = 400;
      throw err;
    }
    return raw;
  }

  function normalizeTime(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    if (!/^\d{2}:\d{2}/.test(raw) && !raw.includes("T")) {
      const err = new Error("time must be HH:MM or ISO");
      err.status = 400;
      throw err;
    }
    return raw;
  }

  function normalizeStatus(value) {
    const raw = String(value || "")
      .trim()
      .toUpperCase();
    const allowed = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
    if (!allowed.includes(raw)) {
      const err = new Error("status must be PENDING|CONFIRMED|COMPLETED|CANCELLED");
      err.status = 400;
      throw err;
    }
    return raw;
  }

  async function listReservations(filters) {
    const date = filters?.date ? normalizeDate(filters.date) : "";
    const name = String(filters?.name || "").trim();
    return consumer.listReservations({ date, name });
  }

  async function updateReservation(id, input) {
    const reservationId = normalizeInt(id);
    if (!reservationId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }

    const payload = {
      roomId: normalizeInt(input?.roomId ?? input?.room_id),
      date: normalizeDate(input?.date),
      startTime: normalizeTime(input?.startTime ?? input?.start_time),
      endTime: normalizeTime(input?.endTime ?? input?.end_time),
      consultCode: input?.consultCode != null ? String(input.consultCode) : null,
      firstName: normalizeText(input?.firstName ?? input?.first_name, { allowEmpty: true }),
      lastName: normalizeText(input?.lastName ?? input?.last_name, { allowEmpty: true }),
      phone: input?.phone != null ? String(input.phone) : null,
      email: input?.email != null ? String(input.email) : null,
      players: normalizeInt(input?.players),
      notes: input?.notes != null ? String(input.notes) : null,
      total: input?.total == null || input?.total === "" ? null : Number(input.total),
      status: normalizeStatus(input?.status),
      isFirstTime:
        input?.isFirstTime === 1 || input?.isFirstTime === true || input?.isFirstTime === "1"
          ? 1
          : 0,
    };

    if (!payload.roomId) {
      const err = new Error("roomId is required");
      err.status = 400;
      throw err;
    }
    if (!payload.startTime || !payload.endTime) {
      const err = new Error("startTime and endTime are required");
      err.status = 400;
      throw err;
    }
    if (!payload.players || payload.players <= 0) {
      const err = new Error("players must be a positive number");
      err.status = 400;
      throw err;
    }

    const res = await consumer.updateReservation(reservationId, payload);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }

    return { ok: true };
  }

  async function deleteReservation(id) {
    const reservationId = normalizeInt(id);
    if (!reservationId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }

    const res = await consumer.deleteReservation(reservationId);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { ok: true };
  }

  return { listReservations, updateReservation, deleteReservation };
}

module.exports = buildAdminReservationsService;

