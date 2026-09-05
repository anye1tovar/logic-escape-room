const EXPENSE_CATEGORIES = new Set([
  "RENT",
  "UTILITIES",
  "SUPPLIES",
  "MAINTENANCE",
  "PAYROLL",
  "MARKETING",
  "COMMISSIONS",
  "TAXES",
  "OTHER",
]);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("Id invalido.");
  return id;
}

function normalizeText(value, field) {
  const text = String(value || "").trim();
  if (!text) throw badRequest(`${field} es obligatorio.`);
  return text;
}

function normalizeCategory(value, optional = false) {
  const category = String(value || "").trim().toUpperCase();
  if (!category && optional) return null;
  if (!EXPENSE_CATEGORIES.has(category)) {
    throw badRequest("Categoria de egreso invalida.");
  }
  return category;
}

function normalizeDate(value, field, optional = false) {
  const date = String(value || "").trim();
  if (!date && optional) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest(`${field} debe tener formato YYYY-MM-DD.`);
  }
  return date;
}

function normalizeBoolean(value, fallback = true) {
  if (value == null) return fallback;
  return value === true || value === 1 || value === "1" || value === "true";
}

function normalizePercent(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    throw badRequest(`${field} debe estar entre 0 y 100.`);
  }
  return Math.round(number * 100) / 100;
}

function normalizeUserId(user) {
  const id = Number(user?.id ?? user?.sub);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeRule(input, context = {}) {
  const effectiveFrom = normalizeDate(input?.effectiveFrom, "Fecha inicial");
  const effectiveTo = normalizeDate(input?.effectiveTo, "Fecha final", true);
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw badRequest("La fecha final no puede ser anterior a la inicial.");
  }
  const roomsPercent = normalizePercent(input?.roomsPercent, "Porcentaje de salas");
  const cafeteriaPercent = normalizePercent(
    input?.cafeteriaPercent,
    "Porcentaje de cafeteria",
  );
  const adminPercent = normalizePercent(
    input?.adminPercent,
    "Porcentaje de administracion",
  );
  if (Math.abs(roomsPercent + cafeteriaPercent + adminPercent - 100) > 0.001) {
    throw badRequest("Los porcentajes de la regla deben sumar 100.");
  }
  return {
    name: normalizeText(input?.name, "Nombre"),
    expenseCategory: normalizeCategory(input?.expenseCategory),
    effectiveFrom,
    effectiveTo,
    roomsPercent,
    cafeteriaPercent,
    adminPercent,
    active: normalizeBoolean(input?.active, true),
    userId: normalizeUserId(context.user),
    at: Date.now(),
  };
}

function dateRange(input = {}) {
  const dateFrom = normalizeDate(input.dateFrom, "Fecha inicial");
  const dateTo = normalizeDate(input.dateTo, "Fecha final");
  if (dateTo < dateFrom) throw badRequest("Rango de fechas invalido.");
  return {
    startMs: Date.parse(`${dateFrom}T00:00:00-05:00`),
    endMs: Date.parse(`${dateTo}T23:59:59.999-05:00`),
  };
}

function buildAdminCostAllocationRulesService(consumer) {
  async function list(input = {}) {
    const activeRaw = String(input.active ?? "").trim();
    return consumer.listRules({
      expenseCategory: normalizeCategory(input.expenseCategory, true),
      active: activeRaw ? normalizeBoolean(activeRaw) : null,
    });
  }

  async function create(input, context = {}) {
    return consumer.createRule(normalizeRule(input, context));
  }

  async function update(id, input, context = {}) {
    return consumer.updateRule(normalizeId(id), normalizeRule(input, context));
  }

  async function simulate(input = {}) {
    const expenseCategory = normalizeCategory(input.expenseCategory);
    const effectiveDate = normalizeDate(input.effectiveDate, "Fecha de simulacion");
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw badRequest("El monto debe ser mayor que cero.");
    }
    const rule = await consumer.findEffectiveRule(expenseCategory, effectiveDate);
    if (!rule) {
      return { rule: null, pending: true, amount: Math.round(amount) };
    }
    return {
      rule,
      pending: false,
      amount: Math.round(amount),
      roomsAmount: Math.round((amount * Number(rule.rooms_percent)) / 100),
      cafeteriaAmount: Math.round(
        (amount * Number(rule.cafeteria_percent)) / 100,
      ),
      adminAmount: Math.round((amount * Number(rule.admin_percent)) / 100),
    };
  }

  async function summary(input = {}) {
    return consumer.getAllocationSummary(dateRange(input));
  }

  return { list, create, update, simulate, summary };
}

module.exports = buildAdminCostAllocationRulesService;
