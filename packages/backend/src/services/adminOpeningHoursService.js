function buildAdminOpeningHoursService(consumer) {
  function normalizeInt(value) {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : null;
  }

  function normalizeTime(value) {
    if (value == null || value === "") return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    if (!/^\d{2}:\d{2}$/.test(trimmed)) {
      const err = new Error("Time must be HH:MM");
      err.status = 400;
      throw err;
    }
    return trimmed;
  }

  async function listOpeningHours() {
    const rows = await consumer.listOpeningHours();
    const byDay = new Map((rows || []).map((r) => [Number(r.day_of_week), r]));
    const result = [];
    for (let day = 0; day <= 6; day++) {
      const row = byDay.get(day);
      result.push({
        dayOfWeek: day,
        openTime: row?.open_time ?? null,
        closeTime: row?.close_time ?? null,
        isOpen:
          row?.is_open === 1 || row?.is_open === true || row?.is_open === "1"
            ? 1
            : 0,
      });
    }
    return result;
  }

  async function upsertOpeningHour(input) {
    const dayOfWeek = normalizeInt(input?.dayOfWeek ?? input?.day_of_week);
    if (dayOfWeek == null || dayOfWeek < 0 || dayOfWeek > 6) {
      const err = new Error("dayOfWeek must be 0..6");
      err.status = 400;
      throw err;
    }

    const isOpen =
      input?.isOpen === 1 || input?.isOpen === true || input?.isOpen === "1";

    const openTime = normalizeTime(input?.openTime ?? input?.open_time);
    const closeTime = normalizeTime(input?.closeTime ?? input?.close_time);

    await consumer.upsertOpeningHour({
      dayOfWeek,
      openTime,
      closeTime,
      isOpen,
    });

    return { ok: true };
  }

  return { listOpeningHours, upsertOpeningHour };
}

module.exports = buildAdminOpeningHoursService;
