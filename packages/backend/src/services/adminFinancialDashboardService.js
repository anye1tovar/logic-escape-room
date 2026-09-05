const AREAS = new Set(["GENERAL", "ROOMS", "CAFETERIA"]);
const CACHE_TTL_MS = 30_000;

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

function parseDate(value, fallback, field) {
  const date = String(value || fallback).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest(`${field} debe tener formato YYYY-MM-DD.`);
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || dateText(parsed) !== date) {
    throw badRequest(`${field} no es valida.`);
  }
  return { date, parsed };
}

function dateText(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeFilters(input = {}) {
  const fallback = today();
  const from = parseDate(input.dateFrom, `${fallback.slice(0, 7)}-01`, "Fecha inicial");
  const to = parseDate(input.dateTo, fallback, "Fecha final");
  if (from.date > to.date) throw badRequest("La fecha inicial no puede ser mayor.");
  const area = String(input.area || "GENERAL").trim().toUpperCase();
  if (!AREAS.has(area)) throw badRequest("Area no valida.");
  const compare = !["false", "0", "no"].includes(
    String(input.compare ?? "true").toLowerCase(),
  );
  const days = Math.round((to.parsed - from.parsed) / 86400000) + 1;
  if (days > 3660) throw badRequest("El rango no puede superar diez anos.");
  const previousTo = new Date(from.parsed);
  previousTo.setUTCDate(previousTo.getUTCDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setUTCDate(previousFrom.getUTCDate() - days + 1);
  return {
    dateFrom: from.date,
    dateTo: to.date,
    area,
    compare,
    previousDateFrom: dateText(previousFrom),
    previousDateTo: dateText(previousTo),
  };
}

function incomeFilters(dateFrom, dateTo, area) {
  return {
    dateFrom,
    dateTo,
    area,
    startMs: Date.parse(`${dateFrom}T00:00:00-05:00`),
    endMs: Date.parse(`${dateTo}T23:59:59.999-05:00`),
    dateFormat: "YYYY-MM",
  };
}

function percent(value, base) {
  return base > 0 ? Math.round((value / base) * 10000) / 100 : null;
}

function comparison(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
}

function categoryValue(row, area) {
  if (area === "ROOMS") return row.rooms;
  if (area === "CAFETERIA") return row.cafeteria;
  return row.total;
}

function fillMonthlyTimeline(rows, dateFrom, dateTo) {
  const byPeriod = new Map(rows.map((row) => [row.period, row]));
  const cursor = new Date(`${dateFrom.slice(0, 7)}-01T00:00:00Z`);
  const end = dateTo.slice(0, 7);
  const result = [];
  while (dateText(cursor).slice(0, 7) <= end) {
    const period = dateText(cursor).slice(0, 7);
    result.push(
      byPeriod.get(period) || {
        period,
        roomSales: 0,
        cafeteriaSales: 0,
        otherIncome: 0,
        income: 0,
        cost: 0,
        expenses: 0,
        result: 0,
      },
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(report) {
  const rows = [
    ["Seccion", "Concepto", "Periodo actual", "Periodo anterior", "Variacion %"],
    ...Object.entries(report.kpis).map(([key, item]) => [
      "Indicador", key, item.current, item.previous ?? "", item.changePercent ?? "",
    ]),
    ...report.timeline.map((row) => [
      "Evolucion mensual", row.period, row.income, row.expenses + row.cost, row.result,
    ]),
    ...report.salesTrend.map((row) => [
      "Ventas por area", row.period, row.roomSales, row.cafeteriaSales, "",
    ]),
    ...report.expensesByCategory.map((row) => [
      "Egresos por categoria", row.category, row.amount, "", "",
    ]),
    ...report.products.map((row) => [
      "Productos", row.productName, row.collectedRevenue, row.recognizedCost, row.grossProfit,
    ]),
    ...report.rooms.map((row) => [
      "Salas", row.roomName, row.collectedTotal, row.collectionCount, "",
    ]),
    ...report.quality.alerts.map((row) => ["Calidad", row.label, row.count, "", ""]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function buildAdminFinancialDashboardService(incomeConsumer, dashboardConsumer) {
  const cache = new Map();

  async function calculate(filters) {
    const currentFilters = incomeFilters(filters.dateFrom, filters.dateTo, filters.area);
    const previousFilters = incomeFilters(
      filters.previousDateFrom,
      filters.previousDateTo,
      filters.area,
    );
    const [current, details, previous] = await Promise.all([
      incomeConsumer.getIncomeStatement(currentFilters),
      dashboardConsumer.getDetails(currentFilters),
      filters.compare
        ? incomeConsumer.getIncomeStatement(previousFilters)
        : Promise.resolve(null),
    ]);
    const currentSummary = current.summary;
    const previousSummary = previous?.summary;
    const values = {
      roomSales: currentSummary.roomSales,
      cafeteriaSales: currentSummary.cafeteriaSales,
      otherIncome: currentSummary.otherIncome,
      cafeteriaCost: currentSummary.cafeteriaCost,
      grossProfit: currentSummary.grossProfit,
      operatingExpenses: currentSummary.operatingExpenses,
      operatingResult: currentSummary.operatingResult,
      grossMargin: percent(currentSummary.grossProfit, currentSummary.operatingIncome),
      operatingMargin: currentSummary.margin,
      courtesies:
        filters.area === "ROOMS" ? 0 : current.separated.courtesyCommercialValue,
      pendingBalance: current.separated.pendingBalance,
    };
    const previousValues = previousSummary
      ? {
          roomSales: previousSummary.roomSales,
          cafeteriaSales: previousSummary.cafeteriaSales,
          otherIncome: previousSummary.otherIncome,
          cafeteriaCost: previousSummary.cafeteriaCost,
          grossProfit: previousSummary.grossProfit,
          operatingExpenses: previousSummary.operatingExpenses,
          operatingResult: previousSummary.operatingResult,
          grossMargin: percent(previousSummary.grossProfit, previousSummary.operatingIncome),
          operatingMargin: previousSummary.margin,
          courtesies:
            filters.area === "ROOMS" ? 0 : previous.separated.courtesyCommercialValue,
          pendingBalance: previous.separated.pendingBalance,
        }
      : null;
    const kpis = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        {
          current: value,
          previous: previousValues?.[key] ?? null,
          changePercent:
            previousValues && value != null && previousValues[key] != null
              ? comparison(value, previousValues[key])
              : null,
        },
      ]),
    );
    const alerts = [
      ["productsWithoutCost", "Productos cobrados sin costo", details.quality.productsWithoutCost, "warning"],
      ["incompleteRecipes", "Recetas incompletas", details.quality.incompleteRecipes, "warning"],
      ["expensesWithoutCostCenter", "Egresos sin centro de costo", details.quality.expensesWithoutCostCenter, "warning"],
      ["mixedExpensesWithoutRule", "Gastos mixtos sin regla", details.quality.mixedExpensesWithoutRule, "info"],
      ["purchasesWithoutCost", "Compras sin costo", details.quality.purchasesWithoutCost, "warning"],
      ["pendingVisits", "Visitas con saldo pendiente", current.quality.pendingVisits, "info"],
      ["missingDailyCloses", "Cierres diarios faltantes", details.quality.missingDailyCloses, "info"],
    ].map(([code, label, count, severity]) => ({ code, label, count, severity }));
    const expensesByCategory = current.expenseCategories
      .map((row) => ({ category: row.category, amount: categoryValue(row, filters.area) }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const costCenters = current.areas
      .filter((row) => row.area !== "ADMIN" || filters.area === "GENERAL")
      .filter((row) => filters.area === "GENERAL" || row.area === filters.area)
      .map((row) => ({ area: row.area, amount: row.operatingExpenses }));
    if (filters.area === "GENERAL" && current.quality.unclassifiedExpenseAmount > 0) {
      costCenters.push({ area: "PENDING", amount: current.quality.unclassifiedExpenseAmount });
    }
    const timeline = fillMonthlyTimeline(
      current.timeline,
      filters.dateFrom,
      filters.dateTo,
    );
    return {
      basis: "CASH",
      area: filters.area,
      range: { dateFrom: filters.dateFrom, dateTo: filters.dateTo },
      comparisonRange: filters.compare
        ? { dateFrom: filters.previousDateFrom, dateTo: filters.previousDateTo }
        : null,
      kpis,
      timeline,
      salesTrend: timeline.map((row) => ({
        period: row.period,
        roomSales: row.roomSales,
        cafeteriaSales: row.cafeteriaSales,
      })),
      expensesByCategory,
      costCenters,
      products: filters.area === "ROOMS" ? [] : details.products,
      rooms: filters.area === "CAFETERIA" ? [] : details.rooms,
      quality: {
        alerts,
        totalAlerts: alerts.reduce((sum, row) => sum + Number(row.count || 0), 0),
      },
      separated: current.separated,
    };
  }

  async function report(input = {}) {
    const filters = normalizeFilters(input);
    const key = JSON.stringify(filters);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.data;
    const data = await calculate(filters);
    cache.set(key, { createdAt: Date.now(), data });
    if (cache.size > 50) cache.clear();
    return data;
  }

  async function exportCsv(input = {}) {
    const data = await report(input);
    return {
      filename: `logic-dashboard-financiero-${data.area.toLowerCase()}-${data.range.dateFrom}-${data.range.dateTo}.csv`,
      content: toCsv(data),
    };
  }

  return { report, exportCsv };
}

module.exports = buildAdminFinancialDashboardService;
