function buildAdminHolidaysService(consumer) {
  function normalizeDate(value) {
    const raw = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const err = new Error("date must be YYYY-MM-DD");
      err.status = 400;
      throw err;
    }
    return raw;
  }

  async function listHolidays() {
    const rows = await consumer.listHolidays();
    return (rows || []).map((r) => ({ date: r.holiday_date, name: r.name ?? null }));
  }

  async function createHoliday(input) {
    const date = normalizeDate(input?.date ?? input?.holiday_date);
    const name = input?.name != null ? String(input.name) : null;
    await consumer.createHoliday({ date, name });
    return { ok: true };
  }

  async function deleteHoliday(date) {
    const normalized = normalizeDate(date);
    const res = await consumer.deleteHoliday(normalized);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { ok: true };
  }

  return { listHolidays, createHoliday, deleteHoliday };
}

module.exports = buildAdminHolidaysService;

