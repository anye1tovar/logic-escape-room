import { useCallback, useEffect, useMemo, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";
import "./AdminCafeteriaProfit.scss";

type PeriodMode = "range" | "month" | "year";
type RankingSort = "most" | "least";

type ProfitSummary = {
  units_sold: number | string;
  courtesy_units: number | string;
  sales_revenue: number | string;
  commercial_value: number | string;
  courtesy_commercial_value: number | string;
  sales_cost: number | string;
  courtesy_cost: number | string;
  incomplete_items: number | string;
  incomplete_products: number | string;
  gross_profit: number | string;
  gross_margin: number | string | null;
  net_contribution: number | string;
};

type TrendRow = {
  business_date: string;
  sales_revenue: number | string;
  sales_cost: number | string;
  courtesy_cost: number | string;
};

type ProductRow = {
  product_id: number;
  product_name: string;
  category_name: string;
  units_sold: number | string;
  courtesy_units: number | string;
  sales_revenue: number | string;
  sales_cost: number | string;
  courtesy_cost: number | string;
  courtesy_commercial_value: number | string;
  incomplete_items: number | string;
  gross_profit: number | string;
  net_contribution: number | string;
};

type CategoryRow = {
  category_id: number;
  category_name: string;
  sales_revenue: number | string;
  sales_cost: number | string;
  courtesy_cost: number | string;
  gross_profit: number | string;
  net_contribution: number | string;
};

type DetailRow = {
  id: number;
  created_at: number | string;
  product_name: string;
  category_name: string;
  type: "SALE" | "COURTESY";
  quantity: number | string;
  commercial_value: number | string;
  sales_revenue: number | string;
  total_cost: number | string;
  gross_profit: number | string;
  gross_margin: number | string | null;
  cost_incomplete: boolean;
};

type Option = { id: number; name: string };

type ProfitReport = {
  summary: ProfitSummary;
  trend: TrendRow[];
  products: ProductRow[];
  categories: CategoryRow[];
  details: DetailRow[];
  total: number;
  page: number;
  limit: number;
  productOptions: Option[];
  categoryOptions: Option[];
};

function localDateParts() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const day = `${month}-${String(now.getDate()).padStart(2, "0")}`;
  return { year, month, day };
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    dateFrom: `${month}-01`,
    dateTo: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(
    Number(value || 0),
  );
}

function formatDateTime(value: number | string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(value)));
}

function StatCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "positive" | "negative" | "warning";
}) {
  return (
    <Paper className={`profit-stat${tone ? ` profit-stat--${tone}` : ""}`}>
      <Typography className="admin-crud__muted">{label}</Typography>
      <Typography component="div" className="profit-stat__value">
        {value}
      </Typography>
      {helper ? (
        <Typography className="admin-crud__muted">{helper}</Typography>
      ) : null}
    </Paper>
  );
}

const chartTooltipStyle = {
  background: "#101828",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 8,
  color: "#f7f3ff",
};

export default function AdminCafeteriaProfit() {
  const today = useMemo(localDateParts, []);
  const initialRange = useMemo(() => monthRange(today.month), [today.month]);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [month, setMonth] = useState(today.month);
  const [year, setYear] = useState(today.year);
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(today.day);
  const [productId, setProductId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [orderType, setOrderType] = useState("");
  const [rankingSort, setRankingSort] = useState<RankingSort>("most");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "idle" });

  const effectiveRange = useMemo(() => {
    if (periodMode === "month") return monthRange(month);
    if (periodMode === "year") {
      return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
    }
    return { dateFrom, dateTo };
  }, [dateFrom, dateTo, month, periodMode, year]);

  const buildQuery = useCallback(
    (requestedPage = page + 1, requestedLimit = rowsPerPage) => {
      const params = new URLSearchParams({
        ...effectiveRange,
        page: String(requestedPage),
        limit: String(requestedLimit),
        sort: rankingSort,
      });
      if (productId) params.set("productId", productId);
      if (categoryId) params.set("categoryId", categoryId);
      if (orderType) params.set("orderType", orderType);
      return params;
    },
    [categoryId, effectiveRange, orderType, page, productId, rankingSort, rowsPerPage],
  );

  const load = useCallback(async () => {
    if (effectiveRange.dateFrom > effectiveRange.dateTo) {
      setStatus({ type: "error", message: "La fecha inicial no puede ser mayor a la final." });
      return;
    }
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<ProfitReport>(
        `/api/admin/reports/cafeteria-profit?${buildQuery().toString()}`,
      );
      setReport(data);
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo cargar el reporte.",
      });
    }
  }, [buildQuery, effectiveRange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function downloadCsv() {
    setStatus({ type: "loading" });
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(
        `${base}/api/admin/reports/cafeteria-profit/export.csv?${buildQuery(1, 10000).toString()}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}` } },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "No se pudo exportar el archivo.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logic-estrategia-comercial-${effectiveRange.dateFrom}-${effectiveRange.dateTo}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", message: "Reporte CSV generado." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo exportar.",
      });
    }
  }

  const trendData = (report?.trend || []).map((row) => ({
    date: row.business_date.slice(5),
    ventas: Number(row.sales_revenue),
    costo: Number(row.sales_cost),
    cortesias: Number(row.courtesy_cost),
  }));
  const rankingData = (report?.products || []).slice(0, 10).map((row) => ({
    name: row.product_name.length > 18 ? `${row.product_name.slice(0, 17)}...` : row.product_name,
    fullName: row.product_name,
    ganancia: Number(row.gross_profit),
    impacto: Number(row.net_contribution),
  }));
  const categoryData = (report?.categories || []).map((row) => ({
    name: row.category_name,
    ventas: Number(row.sales_revenue),
    costo: Number(row.sales_cost),
    ganancia: Number(row.gross_profit),
  }));
  const summary = report?.summary;
  const isNegative = Number(summary?.gross_profit || 0) < 0;

  return (
    <div className="admin-crud cafeteria-profit">
      <div className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Estrategia comercial
          </Typography>
          <Typography className="admin-crud__subtitle">
            Rentabilidad de cafeteria y senales para decidir productos, precios y promociones.
          </Typography>
        </div>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => void load()}>
            Actualizar
          </Button>
          <Button startIcon={<DownloadIcon />} variant="contained" onClick={() => void downloadCsv()}>
            Exportar CSV
          </Button>
        </Stack>
      </div>

      {status.type === "error" ? <Alert severity="error">{status.message}</Alert> : null}
      {status.type === "success" ? <Alert severity="success">{status.message}</Alert> : null}

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner profit-filters">
          <FormControl size="small">
            <InputLabel shrink id="profit-period-label">Periodo</InputLabel>
            <Select
              labelId="profit-period-label"
              label="Periodo"
              value={periodMode}
              onChange={(event) => { setPeriodMode(event.target.value as PeriodMode); setPage(0); }}
            >
              <MenuItem value="range">Rango personalizado</MenuItem>
              <MenuItem value="month">Mes</MenuItem>
              <MenuItem value="year">Ano</MenuItem>
            </Select>
          </FormControl>
          {periodMode === "month" ? (
            <TextField label="Mes" type="month" size="small" value={month} onChange={(event) => { setMonth(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
          ) : null}
          {periodMode === "year" ? (
            <TextField label="Ano" type="number" size="small" value={year} onChange={(event) => { setYear(event.target.value); setPage(0); }} inputProps={{ min: 2000, max: 2100 }} InputLabelProps={{ shrink: true }} />
          ) : null}
          {periodMode === "range" ? (
            <>
              <TextField label="Desde" type="date" size="small" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
              <TextField label="Hasta" type="date" size="small" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
            </>
          ) : null}
          <FormControl size="small">
            <InputLabel shrink id="profit-product-label">Producto</InputLabel>
            <Select labelId="profit-product-label" label="Producto" value={productId} displayEmpty onChange={(event) => { setProductId(String(event.target.value)); setPage(0); }} renderValue={(value) => value ? report?.productOptions.find((option) => String(option.id) === value)?.name || "Producto" : "Todos los productos"}>
              <MenuItem value="">Todos los productos</MenuItem>
              {(report?.productOptions || []).map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel shrink id="profit-category-label">Categoria</InputLabel>
            <Select labelId="profit-category-label" label="Categoria" value={categoryId} displayEmpty onChange={(event) => { setCategoryId(String(event.target.value)); setPage(0); }} renderValue={(value) => value ? report?.categoryOptions.find((option) => String(option.id) === value)?.name || "Categoria" : "Todas las categorias"}>
              <MenuItem value="">Todas las categorias</MenuItem>
              {(report?.categoryOptions || []).map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel shrink id="profit-type-label">Tipo</InputLabel>
            <Select labelId="profit-type-label" label="Tipo" value={orderType} displayEmpty onChange={(event) => { setOrderType(String(event.target.value)); setPage(0); }} renderValue={(value) => value === "SALE" ? "Ventas" : value === "COURTESY" ? "Cortesias" : "Ventas y cortesias"}>
              <MenuItem value="">Ventas y cortesias</MenuItem>
              <MenuItem value="SALE">Ventas</MenuItem>
              <MenuItem value="COURTESY">Cortesias</MenuItem>
            </Select>
          </FormControl>
        </div>
      </Paper>

      {summary && Number(summary.incomplete_items) > 0 ? (
        <Alert severity="warning">
          Hay {formatNumber(summary.incomplete_items)} registros de {formatNumber(summary.incomplete_products)} productos con costo incompleto. Las ventas se muestran, pero la ganancia del periodo es parcial.
        </Alert>
      ) : null}

      {summary ? (
        <div className="profit-summary">
          <StatCard label="Ventas cafeteria" value={formatMoney(summary.sales_revenue)} helper={`${formatNumber(summary.units_sold)} unidades vendidas`} />
          <StatCard label="Costo de venta" value={formatMoney(summary.sales_cost)} />
          <StatCard label="Ganancia bruta" value={formatMoney(summary.gross_profit)} tone={isNegative ? "negative" : "positive"} />
          <StatCard label="Margen bruto" value={summary.gross_margin == null ? "Sin ventas" : `${formatNumber(summary.gross_margin)} %`} tone={isNegative ? "negative" : "positive"} />
          <StatCard label="Costo de cortesias" value={formatMoney(summary.courtesy_cost)} helper={`${formatNumber(summary.courtesy_units)} unidades`} tone="warning" />
          <StatCard label="Aporte neto" value={formatMoney(summary.net_contribution)} helper="Ganancia menos costo de cortesias" tone={Number(summary.net_contribution) < 0 ? "negative" : "positive"} />
        </div>
      ) : null}

      <div className="profit-charts">
        <Paper className="admin-crud__panel profit-chart-panel">
          <Typography component="h2" className="admin-crud__section-title">Ventas y costos por dia</Typography>
          <div className="profit-chart">
            {trendData.length ? (
              <ResponsiveContainer>
                <BarChart data={trendData} margin={{ top: 16, right: 12, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#f7f3ff" }} />
                  <YAxis tick={{ fill: "#f7f3ff" }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="ventas" name="Ventas" fill="#67c676" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costo" name="Costo de venta" fill="#efbb3d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cortesias" name="Costo cortesias" fill="#ef7b87" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Typography className="admin-crud__muted">No hay movimientos en el periodo.</Typography>}
          </div>
        </Paper>

        <Paper className="admin-crud__panel profit-chart-panel">
          <div className="admin-crud__section-header">
            <Typography component="h2" className="admin-crud__section-title">Ranking por aporte neto</Typography>
            <FormControl size="small" className="profit-ranking-select">
              <InputLabel shrink id="profit-ranking-label">Orden</InputLabel>
              <Select labelId="profit-ranking-label" label="Orden" value={rankingSort} onChange={(event) => setRankingSort(event.target.value as RankingSort)}>
                <MenuItem value="most">Mas rentables</MenuItem>
                <MenuItem value="least">Menos rentables</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="profit-chart">
            {rankingData.length ? (
              <ResponsiveContainer>
                <BarChart data={rankingData} layout="vertical" margin={{ top: 16, right: 16, bottom: 8, left: 20 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#f7f3ff" }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#f7f3ff" }} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.fullName || "")} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="impacto" name="Aporte neto" fill="#b78cff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Typography className="admin-crud__muted">No hay productos para ordenar.</Typography>}
          </div>
        </Paper>
      </div>

      <Paper className="admin-crud__panel profit-chart-panel">
        <Typography component="h2" className="admin-crud__section-title">Resultado por categoria</Typography>
        <div className="profit-chart profit-chart--category">
          {categoryData.length ? (
            <ResponsiveContainer>
              <BarChart data={categoryData} margin={{ top: 16, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#f7f3ff" }} />
                <YAxis tick={{ fill: "#f7f3ff" }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={chartTooltipStyle} />
                <Legend />
                <Bar dataKey="ventas" name="Ventas" fill="#67c676" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costo" name="Costo" fill="#efbb3d" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ganancia" name="Ganancia" fill="#b78cff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Typography className="admin-crud__muted">No hay categorias en el periodo.</Typography>}
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">Rentabilidad por producto</Typography>
            <Typography className="admin-crud__section-copy">La cortesia se descuenta del aporte neto, no de la ganancia bruta de ventas.</Typography>
          </div>
        </div>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead><TableRow><TableCell>Producto</TableCell><TableCell>Categoria</TableCell><TableCell align="right">Vendidas</TableCell><TableCell align="right">Ventas</TableCell><TableCell align="right">Costo venta</TableCell><TableCell align="right">Ganancia</TableCell><TableCell align="right">Costo cortesias</TableCell><TableCell align="right">Aporte neto</TableCell><TableCell>Estado costo</TableCell></TableRow></TableHead>
            <TableBody>
              {(report?.products || []).map((row) => (
                <TableRow key={row.product_id}>
                  <TableCell>{row.product_name}</TableCell><TableCell>{row.category_name}</TableCell><TableCell align="right">{formatNumber(row.units_sold)}</TableCell><TableCell align="right">{formatMoney(row.sales_revenue)}</TableCell><TableCell align="right">{formatMoney(row.sales_cost)}</TableCell><TableCell align="right">{formatMoney(row.gross_profit)}</TableCell><TableCell align="right">{formatMoney(row.courtesy_cost)}</TableCell><TableCell align="right">{formatMoney(row.net_contribution)}</TableCell><TableCell>{Number(row.incomplete_items) ? <Chip color="warning" size="small" label={`${row.incomplete_items} incompleto(s)`} /> : <Chip color="success" size="small" label="Completo" />}</TableCell>
                </TableRow>
              ))}
              {!report?.products.length ? <TableRow><TableCell colSpan={9} align="center">No hay resultados.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner">
          <Typography component="h2" className="admin-crud__section-title">Detalle historico</Typography>
        </div>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Producto</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Cantidad</TableCell><TableCell align="right">Valor comercial</TableCell><TableCell align="right">Cobrado</TableCell><TableCell align="right">Costo</TableCell><TableCell align="right">Resultado</TableCell><TableCell>Estado costo</TableCell></TableRow></TableHead>
            <TableBody>
              {(report?.details || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.created_at)}</TableCell><TableCell>{row.product_name}<Typography variant="caption" display="block" className="admin-crud__muted">{row.category_name}</Typography></TableCell><TableCell>{row.type === "COURTESY" ? "Cortesia" : "Venta"}</TableCell><TableCell align="right">{formatNumber(row.quantity)}</TableCell><TableCell align="right">{formatMoney(row.commercial_value)}</TableCell><TableCell align="right">{formatMoney(row.sales_revenue)}</TableCell><TableCell align="right">{formatMoney(row.total_cost)}</TableCell><TableCell align="right">{formatMoney(row.gross_profit)}</TableCell><TableCell>{row.cost_incomplete ? <Chip color="warning" size="small" label="Incompleto" /> : <Chip color="success" size="small" label="Completo" />}</TableCell>
                </TableRow>
              ))}
              {!report?.details.length ? <TableRow><TableCell colSpan={9} align="center">No hay movimientos en el periodo.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={report?.total || 0} page={page} onPageChange={(_, nextPage) => setPage(nextPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 20, 50, 100]} labelRowsPerPage="Filas por pagina" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />
      </Paper>
    </div>
  );
}
