import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { adminRequest } from "../../../api/adminClient";
import { formatDecimal, normalizeDecimalInput, parseDecimal } from "../../../utils/numbers";
import { Link } from "react-router-dom";
import {
  Alert,
  Button,
  Chip,
  Drawer,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import "../adminCrud.scss";

type SupplyRow = {
  id: number;
  name: string;
  category: string | null;
  purchase_unit: string;
  consumption_unit: string;
  conversion_factor: number | string;
  track_inventory: boolean | number | string;
  track_expiration: boolean | number | string;
  minimum_stock: number | string | null;
  active: boolean | number | string;
  current_stock: number | string;
  has_movements: boolean | number | string;
  has_recipe_usage: boolean | number | string;
  has_purchase_history: boolean | number | string;
  has_cost_history: boolean | number | string;
};

type CategoryRow = { name: string };
type RecipeUsage = {
  recipe_id: number;
  product_id: number;
  product_name: string;
  version: number;
  status: string;
  active: boolean | number | string;
};
type SupplyUsageDetails = {
  recipes: RecipeUsage[];
  records: { purchase_lines: number | string; cost_records: number | string; movements: number | string; batches: number | string };
};

type SupplyFormState = {
  name: string;
  category: string;
  purchaseUnit: string;
  consumptionUnit: string;
  conversionFactor: string;
  trackInventory: "1" | "0";
  trackExpiration: "1" | "0";
  minimumStock: string;
  initialStock: string;
  active: "1" | "0";
};

type SupplyInventoryForm = {
  type: "WASTE" | "ADJUSTMENT_POSITIVE" | "ADJUSTMENT_NEGATIVE";
  quantity: string;
  realCount: string;
  reason: string;
  expirationDate: string;
  lotNumber: string;
};

type SupplyInventoryMovement = {
  id: number;
  type: string;
  quantity_delta: number | string;
  reason: string | null;
  occurred_at: number | string;
  expiration_date: string | null;
  lot_number: string | null;
};

const unitOptions = [
  "unidad",
  "g",
  "kg",
  "ml",
  "litro",
  "libra",
  "paquete",
  "caja",
  "porcion",
];

const emptyForm: SupplyFormState = {
  name: "",
  category: "",
  purchaseUnit: "unidad",
  consumptionUnit: "unidad",
  conversionFactor: "1",
  trackInventory: "1",
  trackExpiration: "0",
  minimumStock: "",
  initialStock: "0",
  active: "1",
};

const emptyInventoryForm: SupplyInventoryForm = {
  type: "ADJUSTMENT_POSITIVE",
  quantity: "",
  realCount: "",
  reason: "",
  expirationDate: "",
  lotNumber: "",
};

function normalizeBoolean(value: boolean | number | string) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function toForm(row: SupplyRow): SupplyFormState {
  return {
    name: row.name,
    category: row.category || "",
    purchaseUnit: row.purchase_unit || "unidad",
    consumptionUnit: row.consumption_unit || "unidad",
    conversionFactor: String(row.conversion_factor ?? "1"),
    trackInventory: normalizeBoolean(row.track_inventory) ? "1" : "0",
    trackExpiration: normalizeBoolean(row.track_expiration) ? "1" : "0",
    minimumStock: row.minimum_stock == null ? "" : String(row.minimum_stock),
    initialStock: "0",
    active: normalizeBoolean(row.active) ? "1" : "0",
  };
}

function toPayload(form: SupplyFormState) {
  return {
    name: form.name,
    category: form.category || null,
    purchaseUnit: form.purchaseUnit,
    consumptionUnit: form.consumptionUnit,
    conversionFactor: parseDecimal(form.conversionFactor || 1),
    trackInventory: form.trackInventory === "1",
    trackExpiration: form.trackExpiration === "1",
    minimumStock: form.minimumStock ? parseDecimal(form.minimumStock) : null,
    initialStock: parseDecimal(form.initialStock || 0),
    active: form.active === "1",
  };
}

function sameForm(a: SupplyFormState | null, b: SupplyFormState) {
  return a != null && JSON.stringify(a) === JSON.stringify(b);
}

function isLowStock(row: SupplyRow) {
  return (
    normalizeBoolean(row.track_inventory) &&
    row.minimum_stock != null &&
    Number(row.current_stock || 0) <= Number(row.minimum_stock)
  );
}

export default function AdminSupplies() {
  const [rows, setRows] = useState<SupplyRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [form, setForm] = useState<SupplyFormState>(emptyForm);
  const [editing, setEditing] = useState<SupplyRow | null>(null);
  const [inventorySupply, setInventorySupply] = useState<SupplyRow | null>(null);
  const [inventoryForm, setInventoryForm] = useState<SupplyInventoryForm>(emptyInventoryForm);
  const [inventoryMovements, setInventoryMovements] = useState<SupplyInventoryMovement[]>([]);
  const [recipeUsageSupply, setRecipeUsageSupply] = useState<SupplyRow | null>(null);
  const [recipeUsages, setRecipeUsages] = useState<RecipeUsage[]>([]);
  const [usageRecords, setUsageRecords] = useState<SupplyUsageDetails["records"]>({ purchase_lines: 0, cost_records: 0, movements: 0, batches: 0 });
  const [deleteWarningSupply, setDeleteWarningSupply] = useState<SupplyRow | null>(null);
  const [editForm, setEditForm] = useState<SupplyFormState>(emptyForm);
  const [savedEditForm, setSavedEditForm] = useState<SupplyFormState | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const categoryOptions = useMemo(() => {
    const fromRows = rows
      .map((row) => row.category || "")
      .filter(Boolean)
      .map((name) => ({ name }));
    const names = new Set(
      [...categories, ...fromRows].map((category) => category.name),
    );
    return [...names].sort((a, b) => a.localeCompare(b, "es-CO"));
  }, [categories, rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-CO");
    return rows.filter((row) => {
      if (categoryFilter !== "all" && row.category !== categoryFilter) {
        return false;
      }
      if (!term) return true;
      return row.name.toLocaleLowerCase("es-CO").includes(term);
    });
  }, [categoryFilter, rows, search]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const canCreate =
    form.name.trim().length > 0 &&
    form.purchaseUnit.trim().length > 0 &&
    form.consumptionUnit.trim().length > 0 &&
    parseDecimal(form.conversionFactor || 0) > 0 &&
    parseDecimal(form.initialStock || 0) >= 0 &&
    (!form.minimumStock || parseDecimal(form.minimumStock) >= 0);
  const hasEditChanges = !sameForm(savedEditForm, editForm);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const [data, categoryData] = await Promise.all([
        adminRequest<SupplyRow[]>("/api/admin/supplies"),
        adminRequest<CategoryRow[]>("/api/admin/supplies/categories"),
      ]);
      setRows(data || []);
      setCategories(categoryData || []);
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar los insumos.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [categoryFilter, rowsPerPage, search]);

  async function create() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/supplies", {
        method: "POST",
        body: toPayload(form),
      });
      setForm(emptyForm);
      setStatus({ type: "success", message: "Insumo creado." });
      await load();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo crear.",
      });
    }
  }

  async function save() {
    if (!editing) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/supplies/${editing.id}`, {
        method: "PUT",
        body: toPayload(editForm),
      });
      setEditing(null);
      setSavedEditForm(null);
      setStatus({ type: "success", message: "Insumo actualizado." });
      await load();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo actualizar.",
      });
    }
  }

  async function remove(row: SupplyRow) {
    setStatus({ type: "loading" });
    try {
      const usages = await adminRequest<RecipeUsage[]>(`/api/admin/supplies/${row.id}/recipes`);
      if (usages.length) {
        setRecipeUsages(usages);
        setRecipeUsageSupply(row);
        setStatus({ type: "idle" });
        return;
      }
      if (!normalizeBoolean(row.has_purchase_history) && !normalizeBoolean(row.has_cost_history)) {
        setDeleteWarningSupply(row);
        setStatus({ type: "idle" });
        return;
      }
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "No se pudieron consultar las recetas." });
      return;
    }
    await confirmRemove(row);
  }

  async function viewDetails(row: SupplyRow) {
    setStatus({ type: "loading" });
    try {
      const details = await adminRequest<SupplyUsageDetails>(`/api/admin/supplies/${row.id}/usage`);
      setRecipeUsages(details.recipes || []);
      setUsageRecords(details.records);
      setRecipeUsageSupply(row);
      setStatus({ type: "idle" });
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "No se pudieron cargar los detalles." });
    }
  }

  function hasUsageAssociations(row: SupplyRow) {
    return normalizeBoolean(row.has_recipe_usage) || normalizeBoolean(row.has_purchase_history) || normalizeBoolean(row.has_cost_history);
  }

  async function confirmRemove(row: SupplyRow, skipPrompt = false) {
    const verb = normalizeBoolean(row.has_movements) ? "desactivar" : "eliminar";
    if (!skipPrompt && !window.confirm(`Deseas ${verb} este insumo?`)) return;
    setStatus({ type: "loading" });
    try {
      const result = await adminRequest<{ deactivated: boolean }>(
        `/api/admin/supplies/${row.id}`,
        { method: "DELETE" },
      );
      setStatus({
        type: "success",
        message: result.deactivated
          ? "Insumo desactivado porque tiene registros asociados."
          : "Insumo eliminado.",
      });
      await load();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo cambiar.",
      });
    }
  }

  function openEditor(row: SupplyRow) {
    const nextForm = toForm(row);
    setEditing(row);
    setEditForm(nextForm);
    setSavedEditForm(nextForm);
  }

  async function openInventory(row: SupplyRow) {
    setInventorySupply(row);
    setInventoryForm(emptyInventoryForm);
    try {
      setInventoryMovements(
        await adminRequest<SupplyInventoryMovement[]>(
          `/api/admin/supplies/${row.id}/inventory-movements`,
        ),
      );
    } catch {
      setInventoryMovements([]);
    }
  }

  async function registerInventoryMovement() {
    if (!inventorySupply) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/supplies/${inventorySupply.id}/inventory-movements`, {
        method: "POST",
        body: {
          type: inventoryForm.type,
          quantity: parseDecimal(inventoryForm.quantity),
          reason: inventoryForm.reason,
          expirationDate: inventoryForm.expirationDate || null,
          lotNumber: inventoryForm.lotNumber || null,
        },
      });
      setInventorySupply(null);
      setStatus({ type: "success", message: "Movimiento de inventario registrado." });
      await load();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo registrar el movimiento.",
      });
    }
  }

  async function adjustToPhysicalCount() {
    if (!inventorySupply) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/supplies/${inventorySupply.id}/physical-count`, {
        method: "POST",
        body: { realCount: parseDecimal(inventoryForm.realCount), reason: inventoryForm.reason },
      });
      setInventorySupply(null);
      setStatus({ type: "success", message: "Inventario ajustado al conteo fisico." });
      await load();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo ajustar el inventario.",
      });
    }
  }

  return (
    <div className="admin-crud">
      <div className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Insumos
          </Typography>
          <Typography className="admin-crud__subtitle">
            Materias primas para recetas, costos y precios sugeridos.
          </Typography>
        </div>
        <Button variant="outlined" onClick={() => void load()}>
          Actualizar
        </Button>
      </div>

      {status.type === "error" ? (
        <Alert severity="error">{status.message}</Alert>
      ) : null}
      {status.type === "success" ? (
        <Alert severity="success">{status.message}</Alert>
      ) : null}

      <Paper className="admin-crud__panel admin-crud__panel--accent">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                Crear insumo
              </Typography>
              <Typography className="admin-crud__section-copy">
                Define unidad de compra, unidad de consumo y conversion.
              </Typography>
            </div>
          </div>
          <SupplyForm form={form} setForm={setForm} categories={categoryOptions} />
          <div className="admin-crud__actions">
            <Button
              variant="contained"
              disabled={!canCreate || status.type === "loading"}
              onClick={() => void create()}
            >
              Crear insumo
            </Button>
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__table-header admin-crud__table-header--controls">
          <TextField
            label="Buscar insumo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(String(e.target.value))}
            size="small"
            displayEmpty
          >
            <MenuItem value="all">Todas las categorias</MenuItem>
            {categoryOptions.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </div>
        <TableContainer>
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Compra</TableCell>
                <TableCell>Consumo</TableCell>
                <TableCell>Conversion</TableCell>
                <TableCell>Inventario</TableCell>
                <TableCell>Stock minimo</TableCell>
                <TableCell>Vencimiento</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography fontWeight={900}>{row.name}</Typography>
                    {isLowStock(row) ? (
                      <Chip label="Stock bajo" color="warning" size="small" />
                    ) : null}
                  </TableCell>
                  <TableCell>{row.category || "Sin categoria"}</TableCell>
                  <TableCell>{row.purchase_unit}</TableCell>
                  <TableCell>{row.consumption_unit}</TableCell>
                  <TableCell>
                    1 {row.purchase_unit} ={" "}
                    {formatDecimal(row.conversion_factor)}{" "}
                    {row.consumption_unit}
                  </TableCell>
                  <TableCell>
                    {normalizeBoolean(row.track_inventory)
                      ? `${formatDecimal(row.current_stock)} ${row.consumption_unit}`
                      : "Sin control"}
                  </TableCell>
                  <TableCell>
                    {row.minimum_stock == null
                      ? "-"
                      : `${formatDecimal(row.minimum_stock)} ${row.consumption_unit}`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        normalizeBoolean(row.track_expiration)
                          ? "Controla"
                          : "No controla"
                      }
                      color={
                        normalizeBoolean(row.track_expiration)
                          ? "warning"
                          : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={() => openEditor(row)}>
                        Editar
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => void openInventory(row)}
                        disabled={!normalizeBoolean(row.track_inventory)}
                      >
                        Inventario
                      </Button>
                      <Button color={hasUsageAssociations(row) ? "primary" : "error"} variant="outlined" onClick={() => void (hasUsageAssociations(row) ? viewDetails(row) : remove(row))}>
                        {hasUsageAssociations(row) ? "Ver detalles" : "Eliminar"}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>Sin insumos.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Paper>

      <Drawer
        anchor="right"
        open={editing != null}
        onClose={() => setEditing(null)}
        PaperProps={{ className: "admin-crud__drawer" }}
      >
        <div className="admin-crud__drawer-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Editar insumo
            </Typography>
            <Typography fontWeight={900}>{editing?.name}</Typography>
          </div>
          <Chip
            label={hasEditChanges ? "Cambios sin guardar" : "Sin cambios"}
            color={hasEditChanges ? "warning" : "default"}
            size="small"
          />
        </div>
        <div className="admin-crud__drawer-content">
          <SupplyForm
            form={editForm}
            setForm={setEditForm}
            categories={categoryOptions}
            editing
          />
        </div>
        <div className="admin-crud__drawer-actions">
          <Button onClick={() => setEditing(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={!hasEditChanges || status.type === "loading"}
          >
            Guardar
          </Button>
        </div>
      </Drawer>

      <Drawer
        anchor="right"
        open={inventorySupply != null}
        onClose={() => setInventorySupply(null)}
        PaperProps={{ className: "admin-crud__drawer" }}
      >
        <div className="admin-crud__drawer-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Inventario de insumo
            </Typography>
            <Typography fontWeight={900}>{inventorySupply?.name}</Typography>
          </div>
          <Chip
            label={`Actual: ${formatDecimal(inventorySupply?.current_stock)} ${inventorySupply?.consumption_unit || ""}`}
            color="primary"
            size="small"
          />
        </div>
        <div className="admin-crud__drawer-content">
          <Select
            value={inventoryForm.type}
            onChange={(e) => setInventoryForm((s) => ({
              ...s,
              type: e.target.value as SupplyInventoryForm["type"],
            }))}
            size="small"
            fullWidth
          >
            <MenuItem value="ADJUSTMENT_POSITIVE">Ajuste positivo</MenuItem>
            <MenuItem value="ADJUSTMENT_NEGATIVE">Ajuste negativo</MenuItem>
            <MenuItem value="WASTE">Merma / dano</MenuItem>
          </Select>
          <TextField
            label={`Cantidad (${inventorySupply?.consumption_unit || "unidad"})`}
            value={inventoryForm.quantity}
            onChange={(e) => setInventoryForm((s) => ({ ...s, quantity: normalizeDecimalInput(e.target.value) }))}
            inputProps={{ inputMode: "decimal", min: 0.001, step: "0.001" }}
            size="small"
            fullWidth
          />
          <TextField
            label="Motivo"
            value={inventoryForm.reason}
            onChange={(e) => setInventoryForm((s) => ({ ...s, reason: e.target.value }))}
            helperText="Ejemplo: inventario inicial, producto danado o conteo corregido."
            size="small"
            fullWidth
          />
          {inventorySupply && normalizeBoolean(inventorySupply.track_expiration) && inventoryForm.type === "ADJUSTMENT_POSITIVE" ? (
            <>
              <TextField
                label="Vencimiento del lote"
                type="date"
                value={inventoryForm.expirationDate}
                onChange={(e) => setInventoryForm((s) => ({ ...s, expirationDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
              />
              <TextField
                label="Numero de lote"
                value={inventoryForm.lotNumber}
                onChange={(e) => setInventoryForm((s) => ({ ...s, lotNumber: e.target.value }))}
                size="small"
                fullWidth
              />
            </>
          ) : null}
          {inventorySupply && !normalizeBoolean(inventorySupply.track_expiration) ? (
            <TextField
              label="Conteo fisico total"
              value={inventoryForm.realCount}
            onChange={(e) => setInventoryForm((s) => ({ ...s, realCount: normalizeDecimalInput(e.target.value) }))}
              inputProps={{ inputMode: "decimal", min: 0, step: "0.001" }}
              helperText="Opcional: deja el stock exactamente en esta cantidad."
              size="small"
              fullWidth
            />
          ) : null}
          <div>
            <Typography fontWeight={900} mb={1}>
              Historial reciente
            </Typography>
            <Stack spacing={0.75}>
              {inventoryMovements.slice(0, 8).map((movement) => (
                <Typography key={movement.id} variant="body2">
                  {new Date(Number(movement.occurred_at)).toLocaleDateString("es-CO")} · {movement.type} · {Number(movement.quantity_delta) > 0 ? "+" : ""}{formatDecimal(movement.quantity_delta)}
                  {movement.reason ? ` · ${movement.reason}` : ""}
                </Typography>
              ))}
              {inventoryMovements.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aun no hay movimientos.
                </Typography>
              ) : null}
            </Stack>
          </div>
        </div>
        <div className="admin-crud__drawer-actions">
          <Button onClick={() => setInventorySupply(null)}>Cancelar</Button>
          {inventorySupply && !normalizeBoolean(inventorySupply.track_expiration) && inventoryForm.realCount.trim() !== "" ? (
            <Button
              variant="outlined"
              onClick={() => void adjustToPhysicalCount()}
              disabled={status.type === "loading" || !inventoryForm.reason.trim()}
            >
              Ajustar a conteo
            </Button>
          ) : null}
          <Button
            variant="contained"
            onClick={() => void registerInventoryMovement()}
            disabled={
              status.type === "loading" ||
              parseDecimal(inventoryForm.quantity || 0) <= 0 ||
              !inventoryForm.reason.trim() ||
              (inventorySupply != null &&
                normalizeBoolean(inventorySupply.track_expiration) &&
                inventoryForm.type === "ADJUSTMENT_POSITIVE" &&
                !inventoryForm.expirationDate)
            }
          >
            Registrar movimiento
          </Button>
        </div>
      </Drawer>
      <Dialog open={recipeUsageSupply != null} onClose={() => setRecipeUsageSupply(null)} fullWidth maxWidth="sm">
        <DialogTitle>Uso de {recipeUsageSupply?.name}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Consulta dónde se utiliza este insumo y revisa sus movimientos registrados.
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
            <Typography>Stock actual: <strong>{formatDecimal(recipeUsageSupply?.current_stock)} {recipeUsageSupply?.consumption_unit}</strong></Typography>
            <Typography variant="body2" color="text.secondary">Compras: {usageRecords.purchase_lines} · Costos de ventas: {usageRecords.cost_records} · Movimientos: {usageRecords.movements} · Lotes: {usageRecords.batches}</Typography>
          </Paper>
          <Stack spacing={1.5}>
            {recipeUsages.map((usage) => (
              <Paper key={usage.recipe_id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <div>
                    <Typography fontWeight={800}>{usage.product_name} · v{usage.version}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {normalizeBoolean(usage.active) ? "Activa" : usage.status === "DRAFT" ? "Borrador" : "Histórica"}
                    </Typography>
                  </div>
                  <Button component={Link} to={`/admin/dashboard/cafeteria/recetas?productId=${usage.product_id}`} onClick={() => setRecipeUsageSupply(null)}>
                    Revisar receta
                  </Button>
                </Stack>
              </Paper>
            ))}
            {recipeUsages.length === 0 ? <Typography color="text.secondary">No está asociado a ninguna receta.</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecipeUsageSupply(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteWarningSupply != null} onClose={() => setDeleteWarningSupply(null)} fullWidth maxWidth="sm">
        <DialogTitle>Eliminar insumo y stock registrado</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteWarningSupply?.name}</strong> no aparece en recetas ni tiene compras o costos asociados.
          </Typography>
          <Typography color="warning.main" sx={{ mt: 2 }}>
            Si continúas, se eliminará el insumo junto con su stock actual ({formatDecimal(deleteWarningSupply?.current_stock)} {deleteWarningSupply?.consumption_unit}) y sus movimientos y lotes de inventario. Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteWarningSupply(null)}>Cancelar</Button>
          <Button color="error" variant="contained" disabled={status.type === "loading"} onClick={() => {
            if (!deleteWarningSupply) return;
            const target = deleteWarningSupply;
            setDeleteWarningSupply(null);
            void confirmRemove(target, true);
          }}>
            Eliminar insumo
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function SupplyForm({
  form,
  setForm,
  categories,
  editing = false,
}: {
  form: SupplyFormState;
  setForm: Dispatch<SetStateAction<SupplyFormState>>;
  categories: string[];
  editing?: boolean;
}) {
  return (
    <div className="admin-crud__grid">
      <div className="admin-crud__row">
        <TextField
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          size="small"
          fullWidth
        />
        <TextField
          label="Categoria"
          value={form.category}
          onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
          helperText={
            categories.length > 0
              ? `Existentes: ${categories.slice(0, 4).join(", ")}`
              : "Ejemplo: carnes, salsas, empaques"
          }
          size="small"
          fullWidth
        />
      </div>
      <div className="admin-crud__row">
        <TextField
          label="Unidad de compra"
          value={form.purchaseUnit}
          onChange={(e) =>
            setForm((s) => ({ ...s, purchaseUnit: e.target.value }))
          }
          select
          size="small"
          fullWidth
          helperText="Como lo compras al proveedor o como aparece en factura."
        >
          {unitOptions.map((unit) => (
            <MenuItem key={unit} value={unit}>
              {unit}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Unidad de consumo"
          value={form.consumptionUnit}
          onChange={(e) =>
            setForm((s) => ({ ...s, consumptionUnit: e.target.value }))
          }
          select
          size="small"
          fullWidth
          helperText="Como lo descuentan las recetas o el inventario interno."
        >
          {unitOptions.map((unit) => (
            <MenuItem key={unit} value={unit}>
              {unit}
            </MenuItem>
          ))}
        </TextField>
      </div>
      <div className="admin-crud__row">
        <TextField
          label="Conversion"
          value={form.conversionFactor}
          onChange={(e) =>
            setForm((s) => ({ ...s, conversionFactor: normalizeDecimalInput(e.target.value) }))
          }
          helperText={`1 ${form.purchaseUnit || "unidad"} equivale a cuanto en ${form.consumptionUnit || "consumo"}`}
          inputProps={{ inputMode: "decimal", min: 0, step: "0.001" }}
          size="small"
          fullWidth
        />
        <TextField
          label="Stock minimo"
          value={form.minimumStock}
          onChange={(e) =>
            setForm((s) => ({ ...s, minimumStock: normalizeDecimalInput(e.target.value) }))
          }
          inputProps={{ inputMode: "decimal", min: 0, step: "0.001" }}
          size="small"
          fullWidth
        />
      </div>
      <div className="admin-crud__row">
        <Select
          value={form.trackInventory}
          onChange={(e) =>
            setForm((s) => ({
              ...s,
              trackInventory: e.target.value as "1" | "0",
            }))
          }
          size="small"
          fullWidth
        >
          <MenuItem value="1">Controlar inventario</MenuItem>
          <MenuItem value="0">Sin control de inventario</MenuItem>
        </Select>
        <Select
          value={form.trackExpiration}
          onChange={(e) =>
            setForm((s) => ({
              ...s,
              trackExpiration: e.target.value as "1" | "0",
            }))
          }
          size="small"
          fullWidth
        >
          <MenuItem value="0">Sin vencimiento</MenuItem>
          <MenuItem value="1">Controlar vencimiento</MenuItem>
        </Select>
      </div>
      <div className="admin-crud__row">
        <TextField
          label="Stock inicial"
          value={form.initialStock}
          onChange={(e) =>
            setForm((s) => ({ ...s, initialStock: normalizeDecimalInput(e.target.value) }))
          }
          helperText="Se registra como movimiento inicial solo al crear."
          inputProps={{ inputMode: "decimal", min: 0, step: "0.001" }}
          size="small"
          fullWidth
          disabled={editing || form.trackInventory === "0"}
        />
        {editing ? (
          <Select
            value={form.active}
            onChange={(e) =>
              setForm((s) => ({ ...s, active: e.target.value as "1" | "0" }))
            }
            size="small"
            fullWidth
          >
            <MenuItem value="1">Activo</MenuItem>
            <MenuItem value="0">Inactivo</MenuItem>
          </Select>
        ) : null}
      </div>
    </div>
  );
}
