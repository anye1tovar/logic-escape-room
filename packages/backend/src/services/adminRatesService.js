function buildAdminRatesService(consumer) {
  function normalizeInt(value) {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : null;
  }

  function normalizeRateInput(input) {
    const dayType = String(input?.dayType ?? input?.day_type ?? "").trim();
    if (!["weekday", "weekend"].includes(dayType)) {
      const err = new Error("dayType must be weekday or weekend");
      err.status = 400;
      throw err;
    }

    const players = normalizeInt(input?.players);
    const pricePerPerson = normalizeInt(input?.pricePerPerson ?? input?.price_per_person);
    if (!players || players <= 0) {
      const err = new Error("players must be a positive number");
      err.status = 400;
      throw err;
    }
    if (!pricePerPerson || pricePerPerson <= 0) {
      const err = new Error("pricePerPerson must be a positive number");
      err.status = 400;
      throw err;
    }

    return {
      dayType,
      dayLabel: input?.dayLabel ?? input?.day_label ?? null,
      dayRange: input?.dayRange ?? input?.day_range ?? null,
      players,
      pricePerPerson,
      currency: String(input?.currency || "COP"),
    };
  }

  async function listRates() {
    return consumer.listRates();
  }

  async function createRate(input) {
    const payload = normalizeRateInput(input);
    const created = await consumer.createRate(payload);
    return { id: created.id, ...payload };
  }

  async function updateRate(id, input) {
    const rateId = normalizeInt(id);
    if (!rateId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }

    const payload = normalizeRateInput(input);
    const res = await consumer.updateRate(rateId, payload);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { id: rateId, ...payload };
  }

  async function deleteRate(id) {
    const rateId = normalizeInt(id);
    if (!rateId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const res = await consumer.deleteRate(rateId);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { ok: true };
  }

  return { listRates, createRate, updateRate, deleteRate };
}

module.exports = buildAdminRatesService;

