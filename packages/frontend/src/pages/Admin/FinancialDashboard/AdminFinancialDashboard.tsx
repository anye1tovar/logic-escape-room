import { useEffect, useMemo, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Alert,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";
import "./AdminFinancialDashboard.scss";

type PeriodMode = "month" | "year" | "range";
type Area = "GENERAL" | "ROOMS" | "CAFETERIA";
type KpiValue = {
  current: number | null;
  previous: number | null;
  changePercent: number | null;
};

type Dashboard = {
  basis: "CASH";
  area: Area;
  range: { dateFrom: string; dateTo: string };
  comparisonRange: { dateFrom: string; dateTo: string } | null;
  kpis: Record<string, KpiValue>;
  timeline: Array<{
    period: string;
    income: number;
    cost: number;
    expenses: number;
    result: number;
  }>;
  salesTrend: Array<{
    period: string;
    roomSales: number;
    cafeteriaSales: number;
  }>;
  expensesByCategory: Array<{ category: string; amount: number }>;
  costCenters: Array<{ area: string; amount: number }>;
  products: Array<{
    productId: number;
    productName: string;
    collectedRevenue: number;
    recognizedCost: number;
    grossProfit: number;
    grossMargin: number | null;
    incompleteItems: number;
  }>;
  rooms: Array<{
    roomId: number;
    roomName: string;
    collectedTotal: number;
    collectionCount: number;
  }>;
  quality: {
    totalAlerts: number;
    alerts: Array<{
      code: string;
      label: string;
      count: number;
      severity: "warning" | "info";
    }>;
  };
};

const kpiDefinitions = [
  ["roomSales", "Ventas salas", "money"],
  ["cafeteriaSales", "Ventas cafeteria", "money"],
  ["otherIncome", "Otros ingresos", "money"],
  ["cafeteriaCost", "Costo venta cafeteria", "money"],
  ["grossProfit", "Ganancia bruta", "money"],
  ["operatingExpenses", "Egresos operativos", "money"],
  ["operatingResult", "Utilidad / perdida", "money"],
  ["grossMargin", "Margen bruto", "percent"],
  ["operatingMargin", "Margen operativo", "percent"],
  ["courtesies", "Cortesias", "money"],
  ["pendingBalance", "Saldos pendientes", "money"],
] as const;

const categoryLabels: Record<string, string> = {
  RENT: "Arriendo",
  UTILITIES: "Servicios publicos",
  SUPPLIES: "Insumos",
  MAINTENANCE: "Mantenimiento",
  PAYROLL: "Nomina",
  MARKETING: "Mercadeo",
  COMMISSIONS: "Comisiones",
  TAXES: "Impuestos",
  OTHER: "Otros",
};

const areaLabels: Record<string, string> = {
  GENERAL: "General",
  ROOMS: "Salas",
  CAFETERIA: "Cafeteria",
  ADMIN: "Administracion",
  PENDING: "Sin asignar",
};

const tooltipStyle = {
  background: "#101828",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 8,
  color: "#f7f3ff",
};

function currentDateParts() {
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

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatPercent(value: number | null | undefined) {
  return value == null ? "No calculable" : `${value.toLocaleString("es-CO")} %`;
}

function KpiCard({
  label,
  metric,
  format,
  compare,
  negativeIsGood = false,
}: {
  label: string;
  metric?: KpiValue;
  format: "money" | "percent";
  compare: boolean;
  negativeIsGood?: boolean;
}) {
  const value = metric?.current ?? null;
  const change = metric?.changePercent ?? null;
  const positiveChange = change != null && (negativeIsGood ? change < 0 : change > 0);
  const negativeChange = change != null && (negativeIsGood ? change > 0 : change < 0);
  return (
    <Paper className="financial-dashboard__metric">
      <Typography className="admin-crud__muted">{label}</Typography>
      <Typography className="financial-dashboard__metric-value">
        {format === "money" ? formatMoney(value) : formatPercent(value)}
      </Typography>
      {compare ? (
        <div
          className={`financial-dashboard__change${
            positiveChange ? " financial-dashboard__change--positive" : ""
          }${negativeChange ? " financial-dashboard__change--negative" : ""}`}
        >
          {change == null ? null : change >= 0 ? (
            <TrendingUpIcon fontSize="small" />
          ) : (
            <TrendingDownIcon fontSize="small" />
          )}
          {change == null ? "Sin base comparable" : `${Math.abs(change)} % vs. anterior`}
        </div>
      ) : null}
    </Paper>
  );
}

function ChartEmpty() {
  return <Typography className="admin-crud__muted">No hay datos en el periodo.</Typography>;
}

export default function AdminFinancialDashboard() {
  const current = useMemo(() => currentDateParts(), []);
  const initialMonth = useMemo(() => monthRange(current.month), [current.month]);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [dateFrom, setDateFrom] = useState(initialMonth.dateFrom);
  const [dateTo, setDateTo] = useState(current.day);
  const [area, setArea] = useState<Area>("GENERAL");
  const [compare, setCompare] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState<
    | { type: "idle" | "loading" }
    | { type: "error" | "success"; message: string }
  >({ type: "loading" });

  const range = useMemo(() => {
    if (periodMode === "month") return monthRange(month);
    if (periodMode === "year") {
      return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
    }
    return { dateFrom, dateTo };
  }, [dateFrom, dateTo, month, periodMode, year]);
  const query = useMemo(
    () =>
      new URLSearchParams({
        ...range,
        area,
        compare: String(compare),
      }).toString(),
    [area, compare, range],
  );

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setStatus({ type: "loading" });
      adminRequest<Dashboard>(`/api/admin/financial-dashboard?${query}`)
        .then((data) => {
          if (cancelled) return;
          setDashboard(data);
          setStatus({ type: "idle" });
        })
        .catch((error) => {
          if (cancelled) return;
          setStatus({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo cargar el dashboard financiero.",
          });
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, refreshKey]);

  async function downloadCsv() {
    setStatus({ type: "loading" });
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(
        `${base}/api/admin/financial-dashboard/export.csv?${query}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`,
          },
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "No se pudo exportar el dashboard.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logic-dashboard-financiero-${area.toLowerCase()}-${range.dateFrom}-${range.dateTo}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", message: "Dashboard exportado." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo exportar.",
      });
    }
  }

  const activeAlerts = dashboard?.quality.alerts.filter((alert) => alert.count > 0) || [];
  const expenseChart = dashboard?.expensesByCategory.map((row) => ({
    ...row,
    label: categoryLabels[row.category] || row.category,
  })) || [];
  const costCenterChart = dashboard?.costCenters.map((row) => ({
    ...row,
    label: areaLabels[row.area] || row.area,
  })) || [];

  return (
    <div className="admin-crud financial-dashboard">
      <div className="admin-crud__header">
        <div>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography component="h1" className="admin-crud__title">
              Salud del negocio
            </Typography>
            <Chip label="Base caja" color="info" size="small" />
          </Stack>
          <Typography className="admin-crud__subtitle">
            Resumen simple de ventas, egresos, utilidad estimada y alertas del negocio.
          </Typography>
        </div>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
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
        <div className="admin-crud__panel-inner financial-dashboard__filters">
          <FormControl size="small">
            <InputLabel shrink>Periodo</InputLabel>
            <Select
              label="Periodo"
              value={periodMode}
              onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}
            >
              <MenuItem value="month">Mensual</MenuItem>
              <MenuItem value="year">Anual</MenuItem>
              <MenuItem value="range">Personalizado</MenuItem>
            </Select>
          </FormControl>
          {periodMode === "month" ? (
            <TextField label="Mes" type="month" size="small" value={month} onChange={(event) => setMonth(event.target.value)} InputLabelProps={{ shrink: true }} />
          ) : null}
          {periodMode === "year" ? (
            <TextField label="Ano" type="number" size="small" value={year} onChange={(event) => setYear(event.target.value)} inputProps={{ min: 2000, max: 2100 }} InputLabelProps={{ shrink: true }} />
          ) : null}
          {periodMode === "range" ? (
            <>
              <TextField label="Desde" type="date" size="small" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Hasta" type="date" size="small" value={dateTo} onChange={(event) => setDateTo(event.target.value)} InputLabelProps={{ shrink: true }} />
            </>
          ) : null}
          <ToggleButtonGroup
            exclusive
            size="small"
            value={area}
            onChange={(_, value: Area | null) => value && setArea(value)}
            aria-label="Area del dashboard"
            className="financial-dashboard__area-toggle"
          >
            <ToggleButton value="GENERAL">General</ToggleButton>
            <ToggleButton value="ROOMS">Salas</ToggleButton>
            <ToggleButton value="CAFETERIA">Cafeteria</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel
            className="financial-dashboard__compare-toggle"
            control={<Switch checked={compare} onChange={(event) => setCompare(event.target.checked)} />}
            label="Comparar con periodo anterior"
          />
        </div>
      </Paper>

      {dashboard ? (
        <div className="financial-dashboard__metrics">
          {kpiDefinitions.map(([key, label, format]) => (
            <KpiCard
              key={key}
              label={label}
              metric={dashboard.kpis[key]}
              format={format}
              compare={compare}
              negativeIsGood={key === "cafeteriaCost" || key === "operatingExpenses" || key === "pendingBalance"}
            />
          ))}
        </div>
      ) : null}

      {dashboard ? (
        <Paper className="admin-crud__panel">
          <div className="admin-crud__panel-inner">
            <div className="admin-crud__section-header">
              <div>
                <Typography component="h2" className="admin-crud__section-title">
                  Calidad de datos
                </Typography>
                <Typography className="admin-crud__section-copy">
                  {activeAlerts.length ? `${dashboard.quality.totalAlerts} registros requieren revision.` : "No se detectaron alertas."}
                </Typography>
              </div>
              <div className="financial-dashboard__alert-list">
                {activeAlerts.map((alert) => (
                  <Chip
                    key={alert.code}
                    label={`${alert.label}: ${alert.count}`}
                    color={alert.severity}
                    variant="outlined"
                  />
                ))}
                {!activeAlerts.length ? <Chip label="Datos completos" color="success" /> : null}
              </div>
            </div>
          </div>
        </Paper>
      ) : null}

      {dashboard ? (
        <div className="financial-dashboard__chart-grid">
          <Paper className="admin-crud__panel financial-dashboard__chart-panel">
            <Typography component="h2" className="admin-crud__section-title">Utilidad / perdida mensual</Typography>
            <div className="financial-dashboard__chart">
              {dashboard.timeline.length ? (
                <ResponsiveContainer>
                  <LineChart data={dashboard.timeline} margin={{ top: 18, right: 18, bottom: 8, left: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="period" tick={{ fill: "#f7f3ff" }} />
                    <YAxis tick={{ fill: "#f7f3ff" }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="result" name="Utilidad / perdida" stroke="#b78cff" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <ChartEmpty />}
            </div>
          </Paper>

          <Paper className="admin-crud__panel financial-dashboard__chart-panel">
            <Typography component="h2" className="admin-crud__section-title">Ventas cobradas por area</Typography>
            <div className="financial-dashboard__chart">
              {dashboard.salesTrend.length ? (
                <ResponsiveContainer>
                  <BarChart data={dashboard.salesTrend} margin={{ top: 18, right: 18, bottom: 8, left: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="period" tick={{ fill: "#f7f3ff" }} />
                    <YAxis tick={{ fill: "#f7f3ff" }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={tooltipStyle} />
                    <Legend />
                    {area !== "CAFETERIA" ? <Bar dataKey="roomSales" name="Salas" fill="#67c676" radius={[4, 4, 0, 0]} /> : null}
                    {area !== "ROOMS" ? <Bar dataKey="cafeteriaSales" name="Cafeteria" fill="#efbb3d" radius={[4, 4, 0, 0]} /> : null}
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartEmpty />}
            </div>
          </Paper>

          <Paper className="admin-crud__panel financial-dashboard__chart-panel">
            <Typography component="h2" className="admin-crud__section-title">Egresos por categoria</Typography>
            <div className="financial-dashboard__chart">
              {expenseChart.length ? (
                <ResponsiveContainer>
                  <BarChart data={expenseChart} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 32 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#f7f3ff" }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                    <YAxis type="category" dataKey="label" width={110} tick={{ fill: "#f7f3ff" }} />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={tooltipStyle} />
                    <Bar dataKey="amount" name="Egresos" fill="#ef7b87" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartEmpty />}
            </div>
          </Paper>

          <Paper className="admin-crud__panel financial-dashboard__chart-panel">
            <Typography component="h2" className="admin-crud__section-title">Egresos por centro de costo</Typography>
            <div className="financial-dashboard__chart">
              {costCenterChart.length ? (
                <ResponsiveContainer>
                  <BarChart data={costCenterChart} margin={{ top: 18, right: 18, bottom: 8, left: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#f7f3ff" }} />
                    <YAxis tick={{ fill: "#f7f3ff" }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={tooltipStyle} />
                    <Bar dataKey="amount" name="Egresos" fill="#63b3d1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartEmpty />}
            </div>
          </Paper>
        </div>
      ) : null}

      {dashboard ? (
        <div className="financial-dashboard__ranking-grid">
          {area !== "ROOMS" ? (
            <Paper className="admin-crud__panel">
              <div className="admin-crud__panel-inner">
                <Typography component="h2" className="admin-crud__section-title">Productos por ganancia bruta cobrada</Typography>
                <div className="financial-dashboard__ranking-chart">
                  {dashboard.products.length ? (
                    <ResponsiveContainer>
                      <BarChart data={dashboard.products.slice(0, 7)} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 28 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#f7f3ff" }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                        <YAxis type="category" dataKey="productName" width={115} tick={{ fill: "#f7f3ff" }} />
                        <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={tooltipStyle} />
                        <Bar dataKey="grossProfit" name="Ganancia bruta" fill="#67c676" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <ChartEmpty />}
                </div>
              </div>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 620 }}>
                  <TableHead><TableRow><TableCell>Producto</TableCell><TableCell align="right">Cobrado</TableCell><TableCell align="right">Costo</TableCell><TableCell align="right">Ganancia</TableCell><TableCell align="right">Margen</TableCell></TableRow></TableHead>
                  <TableBody>
                    {dashboard.products.map((row) => <TableRow key={row.productId}><TableCell>{row.productName}{row.incompleteItems ? <Chip className="financial-dashboard__inline-chip" label="Costo incompleto" size="small" color="warning" /> : null}</TableCell><TableCell align="right">{formatMoney(row.collectedRevenue)}</TableCell><TableCell align="right">{formatMoney(row.recognizedCost)}</TableCell><TableCell align="right">{formatMoney(row.grossProfit)}</TableCell><TableCell align="right">{formatPercent(row.grossMargin)}</TableCell></TableRow>)}
                    {!dashboard.products.length ? <TableRow><TableCell colSpan={5}>No hay productos cobrados.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : null}

          {area !== "CAFETERIA" ? (
            <Paper className="admin-crud__panel">
              <div className="admin-crud__panel-inner">
                <Typography component="h2" className="admin-crud__section-title">Salas por ventas cobradas</Typography>
                <div className="financial-dashboard__ranking-chart">
                  {dashboard.rooms.length ? (
                    <ResponsiveContainer>
                      <BarChart data={dashboard.rooms.slice(0, 7)} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 28 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#f7f3ff" }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                        <YAxis type="category" dataKey="roomName" width={115} tick={{ fill: "#f7f3ff" }} />
                        <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={tooltipStyle} />
                        <Bar dataKey="collectedTotal" name="Ventas cobradas" fill="#b78cff" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <ChartEmpty />}
                </div>
              </div>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 440 }}>
                  <TableHead><TableRow><TableCell>Sala</TableCell><TableCell align="right">Cobrado</TableCell><TableCell align="right">Abonos / cobros</TableCell></TableRow></TableHead>
                  <TableBody>
                    {dashboard.rooms.map((row) => <TableRow key={row.roomId}><TableCell>{row.roomName}</TableCell><TableCell align="right">{formatMoney(row.collectedTotal)}</TableCell><TableCell align="right">{row.collectionCount}</TableCell></TableRow>)}
                    {!dashboard.rooms.length ? <TableRow><TableCell colSpan={3}>No hay cobros de salas.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : null}
        </div>
      ) : null}

      {dashboard ? (
        <div className="financial-dashboard__detail-grid">
          <Paper className="admin-crud__panel">
            <div className="admin-crud__panel-inner">
              <Typography component="h2" className="admin-crud__section-title">Detalle mensual</Typography>
            </div>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead><TableRow><TableCell>Mes</TableCell><TableCell align="right">Salas</TableCell><TableCell align="right">Cafeteria</TableCell><TableCell align="right">Ingresos</TableCell><TableCell align="right">Costo</TableCell><TableCell align="right">Egresos</TableCell><TableCell align="right">Resultado</TableCell></TableRow></TableHead>
                <TableBody>{dashboard.timeline.map((row) => <TableRow key={row.period}><TableCell>{row.period}</TableCell><TableCell align="right">{formatMoney(dashboard.salesTrend.find((sale) => sale.period === row.period)?.roomSales)}</TableCell><TableCell align="right">{formatMoney(dashboard.salesTrend.find((sale) => sale.period === row.period)?.cafeteriaSales)}</TableCell><TableCell align="right">{formatMoney(row.income)}</TableCell><TableCell align="right">{formatMoney(row.cost)}</TableCell><TableCell align="right">{formatMoney(row.expenses)}</TableCell><TableCell align="right">{formatMoney(row.result)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </TableContainer>
          </Paper>
          <Paper className="admin-crud__panel">
            <div className="admin-crud__panel-inner">
              <Typography component="h2" className="admin-crud__section-title">Detalle de egresos</Typography>
            </div>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Categoria</TableCell><TableCell align="right">Valor asignado</TableCell></TableRow></TableHead>
                <TableBody>
                  {expenseChart.map((row) => <TableRow key={row.category}><TableCell>{row.label}</TableCell><TableCell align="right">{formatMoney(row.amount)}</TableCell></TableRow>)}
                  {!expenseChart.length ? <TableRow><TableCell colSpan={2}>No hay egresos en el periodo.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </div>
      ) : null}
    </div>
  );
}
