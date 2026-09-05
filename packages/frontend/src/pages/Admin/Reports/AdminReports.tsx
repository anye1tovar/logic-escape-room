import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
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
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "../adminCrud.scss";

type DashboardSummary = {
  room_sales_collected: number | string;
  cafeteria_sales_collected: number | string;
  other_operational_income: number | string;
  expenses_total: number | string;
  owner_contributions_total: number | string;
  transfer_in_total: number | string;
  transfer_out_total: number | string;
  adjustment_total: number | string;
  courtesy_commercial_total: number | string;
  courtesy_quantity: number | string;
  visits_count: number | string;
  open_visits_count: number | string;
  pending_visits_count: number | string;
  pending_amount: number | string;
};

type AccountBalance = {
  id: number;
  name: string;
  type: string;
  balance: number | string;
};

type InventoryAlert = {
  id: number;
  name: string;
  minimum_stock: number | string;
  unit: string;
  current_stock: number | string;
};

type ExpirationAlert = {
  id: number;
  product_name: string;
  current_quantity: number | string;
  expiration_date: string;
  lot_number: string | null;
  unit: string;
  alert_level: string;
};

type CloseRow = {
  id: number;
  business_date: string;
  closed_at: number | string;
  operational_income: number | string;
  expenses_total: number | string;
  pending_amount: number | string;
  status: string;
};

type Dashboard = {
  summary: DashboardSummary;
  accountBalances: AccountBalance[];
  inventoryAlerts: InventoryAlert[];
  expirationAlerts: ExpirationAlert[];
  dailyCloses: CloseRow[];
};

type FinancialMovement = {
  id: number;
  occurred_at: number | string;
  type: string;
  amount: number | string;
  description: string | null;
  source_type: string | null;
  source_id: string | null;
  financial_account_name: string;
  created_by_name: string | null;
  expense_category?: string | null;
  cost_center?: string | null;
};

type SalesRow = {
  product_name_snapshot: string;
  category_name: string;
  type: string;
  courtesy_reason: string | null;
  quantity: number | string;
  charged_total: number | string;
  commercial_total: number | string;
};

type InventoryMovement = {
  id: number;
  occurred_at: number | string;
  product_name: string;
  type: string;
  quantity_delta: number | string;
  lot_number: string | null;
  expiration_date: string | null;
  reason: string | null;
};

type ReportTab = "financial" | "sales" | "inventory";
type RankingSort = "most" | "least";

type ProductRankingRow = {
  product_id: number;
  product_name: string;
  category_name: string;
  quantity_sold: number | string;
  charged_total: number | string;
  courtesy_quantity: number | string;
  courtesy_commercial_total: number | string;
};

type RoomRankingRow = {
  room_id: number | null;
  room_name: string;
  visits_count: number | string;
  players_total: number | string;
  room_total: number | string;
  collected_total: number | string;
  pending_total: number | string;
  average_ticket: number | string;
};

const accountTypeLabels: Record<string, string> = {
  CASH: "Efectivo",
  DIGITAL_WALLET: "Billetera digital",
  BANK: "Banco",
  OTHER: "Otra",
};

const movementTypeLabels: Record<string, string> = {
  INITIAL_BALANCE: "Saldo inicial",
  INCOME: "Ingreso",
  EXPENSE: "Egreso",
  TRANSFER_IN: "Entrada por transferencia",
  TRANSFER_OUT: "Salida por transferencia",
  OWNER_CONTRIBUTION: "Aporte de propietario",
  ADJUSTMENT: "Ajuste",
};

const orderTypeLabels: Record<string, string> = {
  SALE: "Venta",
  COURTESY: "Cortesia",
};

const inventoryTypeLabels: Record<string, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  COURTESY: "Cortesia",
  RETURN: "Devolucion",
  ADJUSTMENT: "Ajuste",
  VOID: "Anulacion",
};

const expenseCategoryLabels: Record<string, string> = {
  RENT: "Arriendo",
  UTILITIES: "Servicios publicos",
  SUPPLIES: "Insumos",
  MAINTENANCE: "Mantenimiento",
  PAYROLL: "Nomina",
  MARKETING: "Mercadeo",
  COMMISSIONS: "Comisiones",
  OWNER_REIMBURSEMENT: "Reembolso a propietario",
  TAXES: "Impuestos",
  OTHER: "Otros",
};

const costCenterLabels: Record<string, string> = {
  ROOMS: "Salas",
  CAFETERIA: "Cafeteria",
  ADMINISTRATION: "Administracion",
  MARKETING: "Mercadeo",
  MIXED: "Mixto",
  UNASSIGNED: "Sin clasificar",
};

const expirationLabels: Record<string, { label: string; color: "error" | "warning" | "info" }> = {
  VENCIDO: { label: "Vencido", color: "error" },
  CRITICO: { label: "Critico", color: "warning" },
  PROXIMO: { label: "Proximo", color: "info" },
};

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function firstDayOfMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value: number | string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(value)));
}

function getAdminToken() {
  return localStorage.getItem("adminToken") || "";
}

function shortLabel(value: string) {
  return value.length > 18 ? `${value.slice(0, 17)}...` : value;
}

type RankingChartRow = {
  name: string;
  fullName: string;
  cantidad: number;
  cobrado: number;
  pendiente: number;
  cortesias: number;
};

function RankingBarChart({
  data,
  unitLabel,
}: {
  data: RankingChartRow[];
  unitLabel: string;
}) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.12)" />
          <XAxis type="number" tick={{ fill: "#f7f3ff" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fill: "#f7f3ff" }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "cobrado" || name === "pendiente") {
                return [formatMoney(Number(value)), name];
              }
              return [value, name];
            }}
            labelFormatter={(_, payload) =>
              String(payload?.[0]?.payload?.fullName || "")
            }
            contentStyle={{
              background: "#101828",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 8,
              color: "#f7f3ff",
            }}
          />
          <Bar
            dataKey="cantidad"
            fill="#efbb3d"
            radius={[0, 6, 6, 0]}
            name={unitLabel}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <Paper className="admin-crud__panel">
      <div className="admin-crud__panel-inner">
        <Typography className="admin-crud__muted">{label}</Typography>
        <Typography variant="h6" component="div" fontWeight={900}>
          {value}
        </Typography>
        {helper ? (
          <Typography className="admin-crud__muted">{helper}</Typography>
        ) : null}
      </div>
    </Paper>
  );
}

export default function AdminReports() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(todayInputValue());
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [financialRows, setFinancialRows] = useState<FinancialMovement[]>([]);
  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [inventoryRows, setInventoryRows] = useState<InventoryMovement[]>([]);
  const [productRankingRows, setProductRankingRows] = useState<
    ProductRankingRow[]
  >([]);
  const [roomRankingRows, setRoomRankingRows] = useState<RoomRankingRow[]>([]);
  const [activeReport, setActiveReport] = useState<ReportTab>("financial");
  const [rankingSort, setRankingSort] = useState<RankingSort>("most");
  const [rankingLimit, setRankingLimit] = useState("10");
  const [movementType, setMovementType] = useState("");
  const [accountId, setAccountId] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "idle" });

  const query = useMemo(() => {
    const params = new URLSearchParams({ dateFrom, dateTo });
    if (activeReport === "financial" && movementType) {
      params.set("type", movementType);
    }
    if (activeReport === "financial" && accountId) {
      params.set("financialAccountId", accountId);
    }
    if (activeReport === "financial" && expenseCategory) {
      params.set("expenseCategory", expenseCategory);
    }
    if (activeReport === "financial" && costCenter) {
      params.set("costCenter", costCenter);
    }
    return params.toString();
  }, [
    accountId,
    activeReport,
    costCenter,
    dateFrom,
    dateTo,
    expenseCategory,
    movementType,
  ]);

  useEffect(() => {
    void load();
  }, [
    dateFrom,
    dateTo,
    movementType,
    accountId,
    expenseCategory,
    costCenter,
    activeReport,
    rankingSort,
    rankingLimit,
  ]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const dashboardData = await adminRequest<Dashboard>(
        `/api/admin/reports/dashboard?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      );
      setDashboard(dashboardData);
      if (activeReport === "financial") {
        const data = await adminRequest<FinancialMovement[]>(
          `/api/admin/reports/financial-movements?${query}`,
        );
        setFinancialRows(data || []);
      }
      if (activeReport === "sales") {
        const data = await adminRequest<SalesRow[]>(
          `/api/admin/reports/sales-orders?${query}`,
        );
        setSalesRows(data || []);
      }
      if (activeReport === "inventory") {
        const data = await adminRequest<InventoryMovement[]>(
          `/api/admin/reports/inventory-movements?${query}`,
        );
        setInventoryRows(data || []);
      }
      const rankingParams = new URLSearchParams({
        dateFrom,
        dateTo,
        sort: rankingSort,
        limit: rankingLimit,
      });
      const [roomsRanking, productsRanking] = await Promise.all([
        adminRequest<RoomRankingRow[]>(
          `/api/admin/reports/rooms-ranking?${rankingParams.toString()}`,
        ),
        adminRequest<ProductRankingRow[]>(
          `/api/admin/reports/products-ranking?${rankingParams.toString()}`,
        ),
      ]);
      setRoomRankingRows(roomsRanking || []);
      setProductRankingRows(productsRanking || []);
      setStatus({ type: "idle" });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "No se pudieron cargar reportes.",
      });
    }
  }

  async function downloadCsv(type: string) {
    setStatus({ type: "loading" });
    try {
      const params = new URLSearchParams({ dateFrom, dateTo, exportType: type });
      if (type === "financial_movements" && movementType) {
        params.set("movementType", movementType);
      }
      if (type === "financial_movements" && accountId) {
        params.set("financialAccountId", accountId);
      }
      if (type === "financial_movements" && expenseCategory) {
        params.set("expenseCategory", expenseCategory);
      }
      if (type === "financial_movements" && costCenter) {
        params.set("costCenter", costCenter);
      }
      if (type === "rooms_ranking" || type === "products_ranking") {
        params.set("sort", rankingSort);
        params.set("limit", rankingLimit);
      }
      const base = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(
        `${base}/api/admin/reports/export.csv?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${getAdminToken()}`,
          },
        },
      );
      if (!response.ok) throw new Error("No se pudo exportar el archivo.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logic-${type}-${dateFrom}-${dateTo}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", message: "Archivo CSV generado." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo exportar.",
      });
    }
  }

  return (
    <div className="admin-crud">
      <div className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Auditoria y exportaciones
          </Typography>
          <Typography className="admin-crud__subtitle">
            Consulta registros detallados y genera archivos CSV para revision.
          </Typography>
        </div>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField
            label="Desde"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="Hasta"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Button variant="contained" onClick={() => void load()}>
            Actualizar
          </Button>
        </Stack>
      </div>

      {status.type === "error" ? (
        <Alert severity="error">{status.message}</Alert>
      ) : null}
      {status.type === "success" ? (
        <Alert severity="success">{status.message}</Alert>
      ) : null}

      {dashboard ? (
        <div className="admin-crud__row admin-crud__row--four">
          <StatCard
            label="Salas / reservas cobradas"
            value={formatMoney(dashboard.summary.room_sales_collected)}
          />
          <StatCard
            label="Cafeteria cobrada"
            value={formatMoney(dashboard.summary.cafeteria_sales_collected)}
          />
          <StatCard
            label="Egresos"
            value={formatMoney(dashboard.summary.expenses_total)}
          />
          <StatCard
            label="Aportes propietarios"
            value={formatMoney(dashboard.summary.owner_contributions_total)}
            helper="Separados de ventas"
          />
          <StatCard
            label="Otros ingresos"
            value={formatMoney(dashboard.summary.other_operational_income)}
          />
          <StatCard
            label="Cortesias"
            value={formatMoney(dashboard.summary.courtesy_commercial_total)}
            helper={`${dashboard.summary.courtesy_quantity} unidades`}
          />
          <StatCard
            label="Visitas abiertas"
            value={dashboard.summary.open_visits_count}
            helper={`${formatMoney(dashboard.summary.pending_amount)} pendiente`}
          />
          <StatCard
            label="Transferencias"
            value={`+${formatMoney(
              dashboard.summary.transfer_in_total,
            )} / -${formatMoney(dashboard.summary.transfer_out_total)}`}
            helper="No cuentan como ventas"
          />
        </div>
      ) : null}

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                Rankings visuales
              </Typography>
              <Typography className="admin-crud__section-copy">
                Salas de escape y productos de cafeteria en el rango seleccionado.
              </Typography>
            </div>
          </div>
          <Stack
            direction={{ xs: "column", xl: "row" }}
            spacing={1}
            useFlexGap
            flexWrap="wrap"
          >
            <FormControl size="small" sx={{ minWidth: 190, flex: 1 }}>
              <InputLabel>Orden</InputLabel>
              <Select
                value={rankingSort}
                label="Orden"
                onChange={(e) => setRankingSort(e.target.value as RankingSort)}
              >
                <MenuItem value="most">Mas vendidos</MenuItem>
                <MenuItem value="least">Menos vendidos</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Top</InputLabel>
              <Select
                value={rankingLimit}
                label="Top"
                onChange={(e) => setRankingLimit(String(e.target.value))}
              >
                <MenuItem value="10">10</MenuItem>
                <MenuItem value="20">20</MenuItem>
                <MenuItem value="50">50</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </div>
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__subsection">
            <Typography component="h3" className="admin-crud__subsection-title">
              Salas de escape
            </Typography>
            <Typography className="admin-crud__muted">
              Ranking por visitas abiertas desde reservas asociadas a una sala.
            </Typography>
          </div>
          <RankingBarChart
            data={roomRankingRows.map((row) => ({
              name: shortLabel(row.room_name),
              fullName: row.room_name,
              cantidad: Number(row.visits_count || 0),
              cobrado: Number(row.collected_total || 0),
              pendiente: Number(row.pending_total || 0),
              cortesias: 0,
            }))}
            unitLabel="visitas"
          />
        </div>
        <TableContainer>
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Sala</TableCell>
                <TableCell>Visitas</TableCell>
                <TableCell>Jugadores</TableCell>
                <TableCell>Valor sala</TableCell>
                <TableCell>Cobrado</TableCell>
                <TableCell>Pendiente</TableCell>
                <TableCell>Ticket promedio</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roomRankingRows.map((row) => (
                <TableRow key={`${row.room_id}-${row.room_name}`} hover>
                  <TableCell>{row.room_name}</TableCell>
                  <TableCell>{row.visits_count}</TableCell>
                  <TableCell>{row.players_total}</TableCell>
                  <TableCell>{formatMoney(row.room_total)}</TableCell>
                  <TableCell>{formatMoney(row.collected_total)}</TableCell>
                  <TableCell>{formatMoney(row.pending_total)}</TableCell>
                  <TableCell>{formatMoney(row.average_ticket)}</TableCell>
                </TableRow>
              ))}
              {roomRankingRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>Sin datos de salas.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__subsection">
            <Typography component="h3" className="admin-crud__subsection-title">
              Cafeteria
            </Typography>
            <Typography className="admin-crud__muted">
              Ranking por productos vendidos, no por mesas ni cuentas.
            </Typography>
          </div>
          <RankingBarChart
            data={productRankingRows.map((row) => ({
              name: shortLabel(row.product_name),
              fullName: row.product_name,
              cantidad: Number(row.quantity_sold || 0),
              cobrado: Number(row.charged_total || 0),
              pendiente: 0,
              cortesias: Number(row.courtesy_quantity || 0),
            }))}
            unitLabel="unidades"
          />
        </div>
        <TableContainer>
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Vendidos</TableCell>
                <TableCell>Cobrado</TableCell>
                <TableCell>Cortesias</TableCell>
                <TableCell>Valor cortesias</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productRankingRows.map((row) => (
                <TableRow key={`${row.product_id}-${row.product_name}`} hover>
                  <TableCell>{row.product_name}</TableCell>
                  <TableCell>{row.category_name}</TableCell>
                  <TableCell>{row.quantity_sold}</TableCell>
                  <TableCell>{formatMoney(row.charged_total)}</TableCell>
                  <TableCell>{row.courtesy_quantity}</TableCell>
                  <TableCell>
                    {formatMoney(row.courtesy_commercial_total)}
                  </TableCell>
                </TableRow>
              ))}
              {productRankingRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>Sin datos de productos.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Saldos actuales
            </Typography>
            <Typography className="admin-crud__section-copy">
              Saldo esperado actual segun el ledger.
            </Typography>
          </div>
        </div>
        <TableContainer>
          <Table className="admin-crud__table">
            <TableHead>
              <TableRow>
                <TableCell>Cuenta</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Saldo esperado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(dashboard?.accountBalances || []).map((account) => (
                <TableRow key={account.id} hover>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>
                    {accountTypeLabels[account.type] || account.type}
                  </TableCell>
                  <TableCell>{formatMoney(account.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Alertas de inventario
            </Typography>
            <Typography className="admin-crud__section-copy">
              Stock bajo y lotes proximos a vencer.
            </Typography>
          </div>
        </div>
        <TableContainer>
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Stock actual</TableCell>
                <TableCell>Minimo</TableCell>
                <TableCell>Vencimiento</TableCell>
                <TableCell>Lote</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(dashboard?.inventoryAlerts || []).map((item) => (
                <TableRow key={`stock-${item.id}`} hover>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {item.current_stock} {item.unit}
                  </TableCell>
                  <TableCell>
                    {item.minimum_stock} {item.unit}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell>
                    <Chip label="Stock bajo" color="warning" size="small" />
                  </TableCell>
                </TableRow>
              ))}
              {(dashboard?.expirationAlerts || []).map((batch) => {
                const alert =
                  expirationLabels[batch.alert_level] ||
                  ({ label: batch.alert_level, color: "info" } as const);
                return (
                  <TableRow key={`expiration-${batch.id}`} hover>
                    <TableCell>{batch.product_name}</TableCell>
                    <TableCell>
                      {batch.current_quantity} {batch.unit}
                    </TableCell>
                    <TableCell />
                    <TableCell>{batch.expiration_date}</TableCell>
                    <TableCell>{batch.lot_number || ""}</TableCell>
                    <TableCell>
                      <Chip label={alert.label} color={alert.color} size="small" />
                    </TableCell>
                  </TableRow>
                );
              })}
              {dashboard &&
              dashboard.inventoryAlerts.length === 0 &&
              dashboard.expirationAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>Sin alertas de inventario.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel admin-crud__panel--accent">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                Exportaciones CSV
              </Typography>
              <Typography className="admin-crud__section-copy">
                Se generan bajo demanda desde la base de datos y no se guardan.
              </Typography>
            </div>
          </div>
          <div className="admin-crud__actions">
            <Button onClick={() => void downloadCsv("financial_movements")}>
              Movimientos financieros
            </Button>
            <Button onClick={() => void downloadCsv("sales_orders")}>
              Ventas / pedidos
            </Button>
            <Button onClick={() => void downloadCsv("inventory_movements")}>
              Inventario
            </Button>
            <Button onClick={() => void downloadCsv("daily_closes")}>
              Cierres diarios
            </Button>
            <Button onClick={() => void downloadCsv("visits")}>Visitas</Button>
            <Button onClick={() => void downloadCsv("rooms_ranking")}>
              Ranking salas
            </Button>
            <Button onClick={() => void downloadCsv("products_ranking")}>
              Ranking productos
            </Button>
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                Reportes
              </Typography>
              <Typography className="admin-crud__section-copy">
                Consulta rapida con filtros para revisar antes de exportar.
              </Typography>
            </div>
          </div>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <FormControl size="small" fullWidth>
              <InputLabel>Reporte</InputLabel>
              <Select
                value={activeReport}
                label="Reporte"
                onChange={(e) => setActiveReport(e.target.value as ReportTab)}
              >
                <MenuItem value="financial">Movimientos financieros</MenuItem>
                <MenuItem value="sales">Ventas / pedidos</MenuItem>
                <MenuItem value="inventory">Inventario / movimientos</MenuItem>
              </Select>
            </FormControl>
            {activeReport === "financial" ? (
              <>
                <FormControl size="small" sx={{ minWidth: 190, flex: 1 }}>
                  <InputLabel shrink>Tipo</InputLabel>
                  <Select
                    value={movementType}
                    label="Tipo"
                    onChange={(e) => setMovementType(String(e.target.value))}
                    displayEmpty
                    renderValue={(value) =>
                      value
                        ? movementTypeLabels[String(value)] || String(value)
                        : "Todos"
                    }
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {Object.entries(movementTypeLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 190, flex: 1 }}>
                  <InputLabel shrink>Categoria de egreso</InputLabel>
                  <Select
                    value={expenseCategory}
                    label="Categoria de egreso"
                    onChange={(e) => setExpenseCategory(String(e.target.value))}
                    displayEmpty
                    renderValue={(value) =>
                      value
                        ? expenseCategoryLabels[String(value)] || String(value)
                        : "Todas"
                    }
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {Object.entries(expenseCategoryLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 190, flex: 1 }}>
                  <InputLabel shrink>Centro de costo</InputLabel>
                  <Select
                    value={costCenter}
                    label="Centro de costo"
                    onChange={(e) => setCostCenter(String(e.target.value))}
                    displayEmpty
                    renderValue={(value) =>
                      value ? costCenterLabels[String(value)] || String(value) : "Todos"
                    }
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {Object.entries(costCenterLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 190, flex: 1 }}>
                  <InputLabel shrink>Cuenta</InputLabel>
                  <Select
                    value={accountId}
                    label="Cuenta"
                    onChange={(e) => setAccountId(String(e.target.value))}
                    displayEmpty
                    renderValue={(value) => {
                      if (!value) return "Todas";
                      return (
                        dashboard?.accountBalances.find(
                          (account) => String(account.id) === String(value),
                        )?.name || String(value)
                      );
                    }}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {(dashboard?.accountBalances || []).map((account) => (
                      <MenuItem key={account.id} value={String(account.id)}>
                        {account.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : null}
          </Stack>
        </div>
        {activeReport === "financial" ? (
          <TableContainer>
            <Table className="admin-crud__table admin-crud__table--comfortable">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Entrada / salida</TableCell>
                  <TableCell>Cuenta</TableCell>
                  <TableCell>Categoria de egreso</TableCell>
                  <TableCell>Centro de costo</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Descripcion</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {financialRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{formatDateTime(row.occurred_at)}</TableCell>
                    <TableCell>{movementTypeLabels[row.type] || row.type}</TableCell>
                    <TableCell>{formatMoney(row.amount)}</TableCell>
                    <TableCell>{row.financial_account_name}</TableCell>
                    <TableCell>
                      {row.expense_category
                        ? expenseCategoryLabels[row.expense_category] || row.expense_category
                        : ""}
                    </TableCell>
                    <TableCell>
                      {row.cost_center
                        ? costCenterLabels[row.cost_center] || row.cost_center
                        : ""}
                    </TableCell>
                    <TableCell>
                      {[row.source_type, row.source_id].filter(Boolean).join(" #")}
                    </TableCell>
                    <TableCell>{row.created_by_name || ""}</TableCell>
                    <TableCell>{row.description || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
        {activeReport === "sales" ? (
          <TableContainer>
            <Table className="admin-crud__table admin-crud__table--comfortable">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Valor cobrado</TableCell>
                  <TableCell>Valor comercial</TableCell>
                  <TableCell>Motivo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesRows.map((row) => (
                  <TableRow
                    key={`${row.product_name_snapshot}-${row.type}-${row.courtesy_reason}`}
                    hover
                  >
                    <TableCell>{row.product_name_snapshot}</TableCell>
                    <TableCell>{row.category_name}</TableCell>
                    <TableCell>{orderTypeLabels[row.type] || row.type}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{formatMoney(row.charged_total)}</TableCell>
                    <TableCell>{formatMoney(row.commercial_total)}</TableCell>
                    <TableCell>{row.courtesy_reason || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
        {activeReport === "inventory" ? (
          <TableContainer>
            <Table className="admin-crud__table admin-crud__table--comfortable">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell>Motivo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{formatDateTime(row.occurred_at)}</TableCell>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell>
                      {inventoryTypeLabels[row.type] || row.type}
                    </TableCell>
                    <TableCell>{row.quantity_delta}</TableCell>
                    <TableCell>{row.lot_number || ""}</TableCell>
                    <TableCell>{row.expiration_date || ""}</TableCell>
                    <TableCell>{row.reason || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Cierres recientes
            </Typography>
          </div>
        </div>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Cerrado</TableCell>
                <TableCell>Ingresos</TableCell>
                <TableCell>Egresos</TableCell>
                <TableCell>Pendiente</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(dashboard?.dailyCloses || []).map((close) => (
                <TableRow key={close.id} hover>
                  <TableCell>{close.business_date}</TableCell>
                  <TableCell>{formatDateTime(close.closed_at)}</TableCell>
                  <TableCell>{formatMoney(close.operational_income)}</TableCell>
                  <TableCell>{formatMoney(close.expenses_total)}</TableCell>
                  <TableCell>{formatMoney(close.pending_amount)}</TableCell>
                  <TableCell>{close.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}
