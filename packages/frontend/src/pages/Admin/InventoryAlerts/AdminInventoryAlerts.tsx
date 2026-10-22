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
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import "../adminCrud.scss";
import "./AdminInventoryAlerts.scss";

type InventoryAlert = {
  id: number;
  source_type: "PRODUCT" | "SUPPLY";
  name: string;
  category: string;
  unit: string;
  minimum_stock: number | string;
  current_stock: number | string;
};

type ExpirationAlert = {
  id: number;
  source_type: "PRODUCT" | "SUPPLY";
  product_name: string;
  category: string;
  current_quantity: number | string;
  expiration_date: string;
  lot_number: string | null;
  unit: string;
  alert_level: "VENCIDO" | "PROXIMO";
};

type InventoryAlertReport = {
  inventoryAlerts: InventoryAlert[];
  expirationAlerts: ExpirationAlert[];
  today: string;
  expiresThrough: string;
};

function formatQuantity(value: number | string) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(value || 0));
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

function sourceLabel(source: string) {
  return source === "SUPPLY" ? "Insumo" : "Producto";
}

export default function AdminInventoryAlerts() {
  const [report, setReport] = useState<InventoryAlertReport | null>(null);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setReport(await adminRequest<InventoryAlertReport>("/api/admin/inventory-alerts"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const categories = useMemo(() => {
    const names = new Set([
      ...(report?.inventoryAlerts || []).map((row) => row.category),
      ...(report?.expirationAlerts || []).map((row) => row.category),
    ]);
    return [...names].sort((a, b) => a.localeCompare(b, "es-CO"));
  }, [report]);

  const lowStockRows = (report?.inventoryAlerts || []).filter((row) => category === "all" || row.category === category);
  const expirationRows = (report?.expirationAlerts || []).filter((row) => category === "all" || row.category === category);

  return (
    <div className="admin-crud">
      <div className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">Alertas de inventario</Typography>
          <Typography className="admin-crud__subtitle">
            Revisa qué reponer y qué vender pronto desde una sola vista.
          </Typography>
        </div>
        <Button startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading}>Actualizar</Button>
      </div>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {report ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <Chip color="warning" label={`${lowStockRows.length} con stock bajo`} />
          <Chip color="info" label={`${expirationRows.length} lotes por vencer o vencidos`} />
          <Typography variant="body2" sx={{ alignSelf: "center" }}>
            Próximos dos meses, hasta {formatDate(report.expiresThrough)} (incluye vencidos).
          </Typography>
        </Stack>
      ) : null}
      {expirationRows.some((row) => row.alert_level === "VENCIDO") ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Hay lotes vencidos. No ofrecerlos para la venta; verifica el proceso de baja correspondiente.
        </Alert>
      ) : null}

      <Paper className="admin-crud__panel inventory-alerts__filters" sx={{ mb: 2 }}>
        <div className="inventory-alerts__filters-layout">
          <div className="inventory-alerts__filters-copy">
            <Typography component="h2" className="admin-crud__section-title">Filtros</Typography>
            <Typography className="admin-crud__section-copy">Las listas se ordenan por menor stock y por vencimiento más próximo.</Typography>
          </div>
          <FormControl className="inventory-alerts__category" size="small">
            <InputLabel id="inventory-alert-category">Categoría</InputLabel>
            <Select labelId="inventory-alert-category" label="Categoría" value={category} onChange={(event) => setCategory(event.target.value)}>
              <MenuItem value="all">Todas las categorías</MenuItem>
              {categories.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
            </Select>
          </FormControl>
        </div>
      </Paper>

      <Paper className="admin-crud__panel" sx={{ mb: 2 }}>
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">Productos e insumos para reponer</Typography>
            <Typography className="admin-crud__section-copy">Stock actual igual o inferior al mínimo configurado.</Typography>
          </div>
        </div>
        <TableContainer>
          <Table className="admin-crud__table">
            <TableHead><TableRow>
              <TableCell>Producto / insumo</TableCell><TableCell>Tipo</TableCell><TableCell>Categoría</TableCell>
              <TableCell>Stock actual</TableCell><TableCell>Stock mínimo</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {lowStockRows.map((row) => <TableRow key={`${row.source_type}-${row.id}`} hover>
                <TableCell>{row.name}</TableCell><TableCell>{sourceLabel(row.source_type)}</TableCell><TableCell>{row.category}</TableCell>
                <TableCell><Chip size="small" color="warning" label={`${formatQuantity(row.current_stock)} ${row.unit}`} /></TableCell>
                <TableCell>{formatQuantity(row.minimum_stock)} {row.unit}</TableCell>
              </TableRow>)}
              {!loading && lowStockRows.length === 0 ? <TableRow><TableCell colSpan={5}>No hay productos con stock bajo para esta categoría.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">Lotes vencidos o próximos a vencer</Typography>
            <Typography className="admin-crud__section-copy">Ordenados desde la fecha más próxima. Revisa si conviene impulsar su venta.</Typography>
          </div>
        </div>
        <TableContainer>
          <Table className="admin-crud__table">
            <TableHead><TableRow>
              <TableCell>Producto / insumo</TableCell><TableCell>Tipo</TableCell><TableCell>Categoría</TableCell>
              <TableCell>Cantidad disponible</TableCell><TableCell>Vencimiento</TableCell><TableCell>Lote</TableCell><TableCell>Estado</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {expirationRows.map((row) => <TableRow key={`${row.source_type}-${row.id}`} hover>
                <TableCell>{row.product_name}</TableCell><TableCell>{sourceLabel(row.source_type)}</TableCell><TableCell>{row.category}</TableCell>
                <TableCell>{formatQuantity(row.current_quantity)} {row.unit}</TableCell><TableCell>{formatDate(row.expiration_date)}</TableCell>
                <TableCell>{row.lot_number || "—"}</TableCell>
                <TableCell><Chip size="small" color={row.alert_level === "VENCIDO" ? "error" : "info"} label={row.alert_level === "VENCIDO" ? "Vencido" : "Por vencer"} /></TableCell>
              </TableRow>)}
              {!loading && expirationRows.length === 0 ? <TableRow><TableCell colSpan={7}>No hay lotes por vencer para esta categoría.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}
