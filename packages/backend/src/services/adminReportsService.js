function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

const EXPORT_TYPES = new Set([
  "financial_movements",
  "sales_orders",
  "inventory_movements",
  "daily_closes",
  "visits",
  "rooms_ranking",
  "products_ranking",
]);

function normalizeText(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeDate(value, fallback) {
  const text = normalizeText(value) || fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw badRequest("La fecha debe tener formato YYYY-MM-DD");
  }
  return text;
}

function todayInputValue() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function addDays(dateText, days) {
  const timestamp = Date.parse(`${dateText}T00:00:00-05:00`);
  const date = new Date(timestamp + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildRange(input = {}) {
  const today = todayInputValue();
  const dateFrom = normalizeDate(input.dateFrom ?? input.date_from, today);
  const dateTo = normalizeDate(input.dateTo ?? input.date_to, dateFrom);
  if (dateFrom > dateTo) throw badRequest("La fecha inicial no puede ser mayor.");
  const startMs = Date.parse(`${dateFrom}T00:00:00-05:00`);
  const endMs = Date.parse(`${dateTo}T23:59:59.999-05:00`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw badRequest("Rango de fechas invalido.");
  }
  return {
    dateFrom,
    dateTo,
    startMs,
    endMs,
    todayText: today,
    criticalDateText: addDays(today, 7),
    alertDateText: addDays(today, 30),
  };
}

function normalizePositiveInt(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

function normalizeOptionalInt(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function buildFilters(input = {}, maxLimit = 100) {
  const range = buildRange(input);
  const limit = normalizePositiveInt(input.limit, 50, maxLimit);
  const page = normalizePositiveInt(input.page, 1, 100000);
  return {
    ...range,
    limit,
    page,
    offset: (page - 1) * limit,
    financialAccountId: normalizeOptionalInt(
      input.financialAccountId ?? input.financial_account_id,
    ),
    type: normalizeText(input.type) || null,
    sourceType: normalizeText(input.sourceType ?? input.source_type) || null,
    expenseCategory:
      normalizeText(input.expenseCategory ?? input.expense_category).toUpperCase() ||
      null,
    costCenter:
      normalizeText(input.costCenter ?? input.cost_center).toUpperCase() || null,
    status: normalizeText(input.status) || "ACTIVE",
    sort: normalizeText(input.sort) === "least" ? "least" : "most",
  };
}

function buildCafeteriaProfitFilters(input = {}, maxLimit = 100) {
  const filters = buildFilters(input, maxLimit);
  const rawType = normalizeText(input.orderType ?? input.order_type).toUpperCase();
  if (rawType && !["SALE", "COURTESY"].includes(rawType)) {
    throw badRequest("Tipo de pedido no valido.");
  }
  return {
    ...filters,
    orderType: rawType || null,
    productId: normalizeOptionalInt(input.productId ?? input.product_id),
    categoryId: normalizeOptionalInt(input.categoryId ?? input.category_id),
  };
}

function formatDateTimeParts(value) {
  const date = new Date(Number(value || 0));
  if (!Number.isFinite(date.getTime())) return { date: "", time: "" };
  return {
    date: new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date),
    time: new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function csvCell(value) {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(headers, rows) {
  return [
    headers.map((header) => csvCell(header.label)).join(","),
    ...rows.map((row) =>
      headers.map((header) => csvCell(header.value(row))).join(","),
    ),
  ].join("\r\n");
}

function buildAdminReportsService(consumer) {
  async function dashboard(input = {}) {
    return consumer.getDashboard(buildRange(input));
  }

  async function listFinancialMovements(input = {}) {
    return consumer.listFinancialMovements(buildFilters(input));
  }

  async function listSalesReport(input = {}) {
    return consumer.listSalesReport(buildFilters(input));
  }

  async function listInventoryMovements(input = {}) {
    return consumer.listInventoryMovements(buildFilters(input));
  }

  async function listProductsRanking(input = {}) {
    return consumer.listProductsRanking(buildFilters(input, 50));
  }

  async function listRoomsRanking(input = {}) {
    return consumer.listRoomsRanking(buildFilters(input, 50));
  }

  async function listVisitReport(input = {}) {
    return consumer.listVisitReport(buildFilters(input));
  }

  async function cafeteriaProfit(input = {}) {
    return consumer.listCafeteriaProfitReport(
      buildCafeteriaProfitFilters(input, 100),
    );
  }

  async function exportCafeteriaProfitCsv(input = {}) {
    const filters = buildCafeteriaProfitFilters(
      { ...input, page: 1, limit: 10000 },
      10000,
    );
    const report = await consumer.listCafeteriaProfitReport(filters);
    const headers = [
      { label: "Fecha", value: (row) => formatDateTimeParts(row.created_at).date },
      { label: "Hora", value: (row) => formatDateTimeParts(row.created_at).time },
      { label: "Producto", value: (row) => row.product_name },
      { label: "Categoria", value: (row) => row.category_name },
      { label: "Tipo", value: (row) => row.type === "COURTESY" ? "Cortesia" : "Venta" },
      { label: "Cantidad", value: (row) => row.quantity },
      { label: "Valor comercial", value: (row) => row.commercial_value },
      { label: "Ventas cobradas", value: (row) => row.sales_revenue },
      { label: "Costo", value: (row) => row.total_cost },
      { label: "Ganancia bruta", value: (row) => row.gross_profit },
      { label: "Margen", value: (row) => row.gross_margin ?? "" },
      { label: "Metodo de costeo", value: (row) => row.costing_method || "" },
      { label: "Costo incompleto", value: (row) => row.cost_incomplete ? "Si" : "No" },
    ];
    return {
      filename: `logic-ganancia-cafeteria-${filters.dateFrom}-${filters.dateTo}.csv`,
      content: toCsv(headers, report.details),
    };
  }

  async function exportCsv(input = {}) {
    const exportType = normalizeText(input.exportType ?? input.type);
    if (!EXPORT_TYPES.has(exportType)) {
      throw badRequest("Tipo de exportacion no valido.");
    }
    const filters = buildFilters(
      {
        ...input,
        type: input.movementType ?? input.movement_type,
        expenseCategory: input.expenseCategory ?? input.expense_category,
        costCenter: input.costCenter ?? input.cost_center,
      },
      10000,
    );
    let headers = [];
    let rows = [];

    if (exportType === "financial_movements") {
      rows = await consumer.listFinancialMovements(filters);
      headers = [
        { label: "Fecha", value: (row) => formatDateTimeParts(row.occurred_at).date },
        { label: "Hora", value: (row) => formatDateTimeParts(row.occurred_at).time },
        { label: "Tipo", value: (row) => row.type },
        { label: "Categoria", value: (row) => row.source_type || "" },
        { label: "Categoria de egreso", value: (row) => row.expense_category || "" },
        { label: "Centro de costo", value: (row) => row.cost_center || "" },
        { label: "Descripcion", value: (row) => row.description || "" },
        { label: "Cuenta financiera", value: (row) => row.financial_account_name },
        { label: "Valor", value: (row) => row.amount },
        { label: "Origen", value: (row) => row.source_type || "" },
        { label: "Reserva/visita relacionada", value: (row) => row.source_id || "" },
        { label: "Usuario", value: (row) => row.created_by_name || row.created_by || "" },
      ];
    }

    if (exportType === "sales_orders") {
      rows = await consumer.listSalesReport(filters);
      headers = [
        { label: "Producto", value: (row) => row.product_name_snapshot },
        { label: "Categoria", value: (row) => row.category_name },
        { label: "Tipo", value: (row) => row.type },
        { label: "Motivo cortesia", value: (row) => row.courtesy_reason || "" },
        { label: "Cantidad", value: (row) => row.quantity },
        { label: "Valor cobrado", value: (row) => row.charged_total },
        { label: "Valor comercial", value: (row) => row.commercial_total },
      ];
    }

    if (exportType === "inventory_movements") {
      rows = await consumer.listInventoryMovements(filters);
      headers = [
        { label: "Fecha", value: (row) => formatDateTimeParts(row.occurred_at).date },
        { label: "Hora", value: (row) => formatDateTimeParts(row.occurred_at).time },
        { label: "Producto", value: (row) => row.product_name },
        { label: "Tipo", value: (row) => row.type },
        { label: "Cantidad", value: (row) => row.quantity_delta },
        { label: "Lote", value: (row) => row.lot_number || "" },
        { label: "Vencimiento", value: (row) => row.expiration_date || "" },
        { label: "Origen", value: (row) => row.source_type || "" },
        { label: "Referencia", value: (row) => row.source_id || "" },
        { label: "Motivo", value: (row) => row.reason || "" },
      ];
    }

    if (exportType === "products_ranking") {
      rows = await consumer.listProductsRanking(filters);
      headers = [
        { label: "Producto", value: (row) => row.product_name },
        { label: "Categoria", value: (row) => row.category_name },
        { label: "Cantidad vendida", value: (row) => row.quantity_sold },
        { label: "Valor cobrado", value: (row) => row.charged_total },
        { label: "Cortesias", value: (row) => row.courtesy_quantity },
        { label: "Valor comercial cortesias", value: (row) => row.courtesy_commercial_total },
      ];
    }

    if (exportType === "rooms_ranking") {
      rows = await consumer.listRoomsRanking(filters);
      headers = [
        { label: "Sala", value: (row) => row.room_name },
        { label: "Visitas", value: (row) => row.visits_count },
        { label: "Jugadores", value: (row) => row.players_total },
        { label: "Valor sala", value: (row) => row.room_total },
        { label: "Valor cobrado", value: (row) => row.collected_total },
        { label: "Pendiente", value: (row) => row.pending_total },
        { label: "Ticket promedio", value: (row) => row.average_ticket },
      ];
    }

    if (exportType === "daily_closes") {
      rows = await consumer.listDailyCloses(filters);
      headers = [
        { label: "Fecha", value: (row) => row.business_date },
        { label: "Cerrado en", value: (row) => formatDateTimeParts(row.closed_at).date },
        { label: "Ingresos operativos", value: (row) => row.operational_income },
        { label: "Egresos", value: (row) => row.expenses_total },
        { label: "Aportes propietarios", value: (row) => row.owner_contributions_total },
        { label: "Cortesias", value: (row) => row.courtesy_commercial_total },
        { label: "Visitas", value: (row) => row.visit_count },
        { label: "Pendiente", value: (row) => row.pending_amount },
        { label: "Estado", value: (row) => row.status },
        { label: "Notas", value: (row) => row.notes || "" },
      ];
    }

    if (exportType === "visits") {
      rows = await consumer.listVisitReport(filters);
      headers = [
        { label: "Fecha/hora", value: (row) => formatDateTimeParts(row.opened_at).date },
        { label: "Sala", value: (row) => row.room_name || row.location_label || "" },
        { label: "Reserva", value: (row) => row.reservation_id || "" },
        { label: "Valor sala", value: (row) => row.room_total || 0 },
        { label: "Cafeteria", value: (row) => row.cafeteria_total || 0 },
        { label: "Total pagado", value: (row) => row.total_paid || 0 },
        { label: "Pendiente", value: (row) => row.pending_amount || 0 },
        { label: "Personas", value: (row) => row.players || "" },
        { label: "Estado", value: (row) => row.status },
      ];
    }

    return {
      filename: `logic-${exportType}-${filters.dateFrom}-${filters.dateTo}.csv`,
      content: toCsv(headers, rows),
    };
  }

  return {
    dashboard,
    listFinancialMovements,
    listSalesReport,
    listInventoryMovements,
    listProductsRanking,
    listRoomsRanking,
    listVisitReport,
    cafeteriaProfit,
    exportCafeteriaProfitCsv,
    exportCsv,
  };
}

module.exports = buildAdminReportsService;
