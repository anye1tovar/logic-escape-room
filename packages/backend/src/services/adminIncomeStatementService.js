const AREAS = new Set(["GENERAL", "ROOMS", "CAFETERIA"]);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeDate(value, fallback, field) {
  const date = String(value || fallback).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest(`${field} debe tener formato YYYY-MM-DD.`);
  }
  const parsed = Date.parse(`${date}T12:00:00-05:00`);
  if (!Number.isFinite(parsed)) throw badRequest(`${field} no es valida.`);
  return date;
}

function normalizeFilters(input = {}) {
  const fallback = today();
  const dateFrom = normalizeDate(input.dateFrom, fallback, "Fecha inicial");
  const dateTo = normalizeDate(input.dateTo, dateFrom, "Fecha final");
  if (dateFrom > dateTo) throw badRequest("La fecha inicial no puede ser mayor.");
  const area = String(input.area || "GENERAL").trim().toUpperCase();
  if (!AREAS.has(area)) throw badRequest("Area no valida.");
  const startMs = Date.parse(`${dateFrom}T00:00:00-05:00`);
  const endMs = Date.parse(`${dateTo}T23:59:59.999-05:00`);
  const days = Math.max(1, Math.ceil((endMs - startMs) / 86400000));
  return {
    dateFrom,
    dateTo,
    area,
    startMs,
    endMs,
    dateFormat: days > 100 ? "YYYY-MM" : "YYYY-MM-DD",
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(report) {
  const rows = [
    ["Seccion", "Concepto", "Valor"],
    ["Resultado", "Ventas salas", report.summary.roomSales],
    ["Resultado", "Ventas cafeteria", report.summary.cafeteriaSales],
    ["Resultado", "Otros ingresos operativos", report.summary.otherIncome],
    ["Resultado", "Ingresos operativos", report.summary.operatingIncome],
    ["Resultado", "Costo de venta cafeteria", report.summary.cafeteriaCost],
    ["Resultado", "Ganancia bruta", report.summary.grossProfit],
    ["Resultado", "Egresos operativos", report.summary.operatingExpenses],
    ["Resultado", "Ajustes", report.summary.adjustments],
    ["Resultado", "Utilidad o perdida", report.summary.operatingResult],
    ["Resultado", "Margen porcentual", report.summary.margin ?? ""],
    ["Separado", "Aportes de propietarios", report.separated.ownerContributions],
    ["Separado", "Transferencias entrantes", report.separated.transferIn],
    ["Separado", "Transferencias salientes", report.separated.transferOut],
    [
      "Separado",
      "Gastos reembolsables a propietarios",
      report.separated.reimbursableOwnerExpenses,
    ],
    ["Separado", "Reembolsos pagados a propietarios", report.separated.ownerReimbursements],
    ["Separado", "Valor comercial cortesias", report.separated.courtesyCommercialValue],
    ["Separado", "Costo cortesias", report.separated.courtesyCost],
    ["Separado", "Saldos pendientes", report.separated.pendingBalance],
    ["Calidad", "Conceptos con costo incompleto", report.quality.incompleteCostItems],
    ["Calidad", "Egresos sin reparto", report.quality.unclassifiedExpenses],
    ["Calidad", "Monto sin reparto", report.quality.unclassifiedExpenseAmount],
    ...report.areas.flatMap((area) => [
      ["Area", `${area.area} - ingresos`, area.operatingIncome],
      ["Area", `${area.area} - costos y egresos`, area.cafeteriaCost + area.operatingExpenses],
      ["Area", `${area.area} - resultado`, area.operatingResult],
    ]),
    ...report.expenseCategories.flatMap((category) => [
      ["Categoria egreso", `${category.category} - salas`, category.rooms],
      ["Categoria egreso", `${category.category} - cafeteria`, category.cafeteria],
      ["Categoria egreso", `${category.category} - administracion`, category.admin],
      ["Categoria egreso", `${category.category} - pendiente`, category.pending],
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function buildAdminIncomeStatementService(consumer) {
  async function report(input = {}) {
    const filters = normalizeFilters(input);
    return {
      range: { dateFrom: filters.dateFrom, dateTo: filters.dateTo },
      ...(await consumer.getIncomeStatement(filters)),
    };
  }

  async function exportCsv(input = {}) {
    const data = await report(input);
    return {
      filename: `logic-estado-resultados-${data.area.toLowerCase()}-${data.range.dateFrom}-${data.range.dateTo}.csv`,
      content: toCsv(data),
    };
  }

  return { report, exportCsv };
}

module.exports = buildAdminIncomeStatementService;
