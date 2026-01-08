function buildAdminReservationsService(consumer) {
  function normalizeInt(value) {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : null;
  }

  function normalizePositiveInt(value, { defaultValue, min = 1, max = 200 } = {}) {
    const parsed = normalizeInt(value);
    const base = parsed == null ? defaultValue : parsed;
    if (!Number.isFinite(base)) return defaultValue;
    return Math.min(Math.max(base, min), max);
  }

  function normalizeText(value, { allowEmpty = true } = {}) {
    if (value == null) return allowEmpty ? "" : null;
    const text = String(value);
    if (!text.trim() && !allowEmpty) return null;
    return text;
  }

  function todayLocalDate() {
    const now = new Date();
    const yyyy = String(now.getFullYear()).padStart(4, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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

  async function listReservationsPage(input) {
    const rawFilters = input?.filters && typeof input.filters === "object" ? input.filters : {};
    const rawDate = rawFilters?.date;
    const rawSearch = rawFilters?.search ?? rawFilters?.name;

    const date = rawDate == null || String(rawDate).trim() === "" ? todayLocalDate() : normalizeDate(rawDate);
    const search = String(rawSearch || "").trim();
    const pageSize = normalizePositiveInt(input?.pageSize, { defaultValue: 10, min: 1, max: 200 });
    const page = normalizePositiveInt(input?.page, { defaultValue: 1, min: 1, max: 1_000_000 });

    const result = await consumer.listReservationsPage({
      date,
      search,
      page,
      pageSize,
    });

    const totalRecords = normalizeInt(result?.totalRecords) ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safePage = Math.min(page, totalPages);

    // If the requested page is out of range, refetch once with a safe page.
    if (safePage !== page) {
      const retry = await consumer.listReservationsPage({
        date,
        search,
        page: safePage,
        pageSize,
      });
      const retryTotal = normalizeInt(retry?.totalRecords) ?? 0;
      return {
        filters: { date, search },
        records: retry?.records || [],
        page: safePage,
        size: pageSize,
        totalRecords: retryTotal,
        totalPages: Math.max(1, Math.ceil(retryTotal / pageSize)),
      };
    }

    return {
      filters: { date, search },
      records: result?.records || [],
      page: safePage,
      size: pageSize,
      totalRecords,
      totalPages,
    };
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

  return { listReservationsPage, updateReservation, deleteReservation };
}

module.exports = buildAdminReservationsService;
