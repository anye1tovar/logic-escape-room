function buildAdminReservationsService(consumer, deps = {}) {
  const bookingService = deps.bookingService;

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

  function normalizeOptionalPositiveInt(value, { min = 0, max = 1_000 } = {}) {
    if (value == null || value === "") return null;
    const parsed = normalizeInt(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(Math.max(parsed, min), max);
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

  function normalizeBookingStartToIso(dateString, value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (raw.includes("T")) return raw;
    if (/^\d{2}:\d{2}$/.test(raw)) return `${dateString}T${raw}:00-05:00`;
    return null;
  }

  function isSameSlot(date, startTime, compareDate, compareTime) {
    const left = normalizeBookingStartToIso(date, startTime);
    const right = normalizeBookingStartToIso(compareDate, compareTime);
    if (!left || !right) return false;
    return left === right;
  }

  async function listReservationsPage(input) {
    const rawFilters = input?.filters && typeof input.filters === "object" ? input.filters : {};
    const rawDate = rawFilters?.date;
    const rawDateFrom = rawFilters?.dateFrom ?? rawFilters?.from;
    const rawDateTo = rawFilters?.dateTo ?? rawFilters?.to;
    const rawSearch = rawFilters?.search ?? rawFilters?.name;

    const fallbackDate = todayLocalDate();
    const singleDate =
      rawDate == null || String(rawDate).trim() === "" ? null : normalizeDate(rawDate);

    const dateFromRaw =
      rawDateFrom == null || String(rawDateFrom).trim() === ""
        ? null
        : normalizeDate(rawDateFrom);
    const dateToRaw =
      rawDateTo == null || String(rawDateTo).trim() === "" ? null : normalizeDate(rawDateTo);

    let dateFrom = dateFromRaw ?? singleDate ?? null;
    let dateTo = dateToRaw ?? singleDate ?? null;

    if (!dateFrom && !dateTo) {
      dateFrom = fallbackDate;
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      const err = new Error("dateFrom must be <= dateTo");
      err.status = 400;
      throw err;
    }

    const search = String(rawSearch || "").trim();
    const pageSize = normalizePositiveInt(input?.pageSize, { defaultValue: 10, min: 1, max: 200 });
    const page = normalizePositiveInt(input?.page, { defaultValue: 1, min: 1, max: 1_000_000 });

    const result = await consumer.listReservationsPage({
      dateFrom,
      dateTo,
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
        dateFrom,
        dateTo,
        search,
        page: safePage,
        pageSize,
      });
      const retryTotal = normalizeInt(retry?.totalRecords) ?? 0;
      return {
        filters: { dateFrom, dateTo, search },
        records: retry?.records || [],
        page: safePage,
        size: pageSize,
        totalRecords: retryTotal,
        totalPages: Math.max(1, Math.ceil(retryTotal / pageSize)),
      };
    }

    return {
      filters: { dateFrom, dateTo, search },
      records: result?.records || [],
      page: safePage,
      size: pageSize,
      totalRecords,
      totalPages,
    };
  }

  async function updateReservation(id, input, context = {}) {
    const reservationId = normalizeInt(id);
    if (!reservationId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }

    const existing = await consumer.getReservationById?.(reservationId);
    if (!existing) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }

    const payload = {
      roomId: normalizeInt(input?.roomId ?? input?.room_id),
      date: normalizeDate(input?.date),
      startTime: normalizeTime(input?.startTime ?? input?.start_time),
      endTime: normalizeTime(input?.endTime ?? input?.end_time),
      actualDurationMs: normalizeOptionalPositiveInt(
        input?.actualDurationMs ?? input?.actual_duration_ms,
        { min: 0, max: 86_400_000 }
      ),
      consultCode: input?.consultCode != null ? String(input.consultCode) : null,
      firstName: normalizeText(input?.firstName ?? input?.first_name, { allowEmpty: true }),
      lastName: normalizeText(input?.lastName ?? input?.last_name, { allowEmpty: true }),
      phone: input?.phone != null ? String(input.phone) : null,
      players: normalizeInt(input?.players),
      notes: input?.notes != null ? String(input.notes) : null,
      total: input?.total == null || input?.total === "" ? null : Number(input.total),
      status: normalizeStatus(input?.status),
      isFirstTime:
        input?.isFirstTime === 1 ||
        input?.isFirstTime === true ||
        input?.isFirstTime === "1",
      reservationSource:
        existing.reservation_source ?? existing.reservationSource ?? "web",
      reprogrammed: Boolean(
        existing.reprogrammed ?? existing.is_reprogrammed ?? false
      ),
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

    const hasReprogramChanges =
      Number(existing.room_id) !== Number(payload.roomId) ||
      String(existing.date) !== String(payload.date) ||
      !isSameSlot(existing.date, existing.start_time, payload.date, payload.startTime) ||
      !isSameSlot(existing.date, existing.end_time, payload.date, payload.endTime);

    if (hasReprogramChanges && bookingService?.getAvailabilityByDate) {
      const today = todayLocalDate();
      if (payload.date >= today) {
        const normalizedStart = normalizeBookingStartToIso(
          payload.date,
          payload.startTime
        );
        if (!normalizedStart) {
          const err = new Error("Invalid time format.");
          err.status = 400;
          throw err;
        }

        const availability = await bookingService.getAvailabilityByDate(
          payload.date,
          {
            allowPast: true,
            ignoreMinAdvance: true,
            ignoreReservationId: reservationId,
            useDbRoomId: true,
          }
        );

        const room = (availability?.rooms || []).find(
          (r) => String(r.roomId) === String(payload.roomId)
        );
        const slot =
          room?.slots?.find((s) => s.start === normalizedStart) || null;
        if (!room || !slot) {
          const err = new Error(
            "Este horario no existe para la fecha seleccionada."
          );
          err.status = 400;
          throw err;
        }
        if (!slot.available) {
          const err = new Error("Este horario ya no está disponible.");
          err.status = 409;
          throw err;
        }
      }
    }

    if (hasReprogramChanges) {
      payload.reprogrammed = true;
    }

    const res = await consumer.updateReservation(reservationId, payload);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }

    if (hasReprogramChanges && consumer.createReservationChange) {
      const user = context?.user ?? null;
      await consumer.createReservationChange({
        reservationId,
        beforeDate: existing.date ?? null,
        beforeStartTime: existing.start_time ?? null,
        beforeEndTime: existing.end_time ?? null,
        beforeRoomId: existing.room_id ?? null,
        afterDate: payload.date ?? null,
        afterStartTime: payload.startTime ?? null,
        afterEndTime: payload.endTime ?? null,
        afterRoomId: payload.roomId ?? null,
        changedBy: user?.id ?? null,
        changedByRole: user?.role ?? null,
        changeReason: input?.changeReason ?? input?.change_reason ?? null,
        createdAt: Date.now(),
      });
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
