import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Button,
  Chip,
  Drawer,
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
};

type CategoryRow = { name: string };

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

function normalizeBoolean(value: boolean | number | string) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function formatQuantity(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return "0";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 3,
  }).format(parsed);
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
    conversionFactor: Number(form.conversionFactor || 1),
    trackInventory: form.trackInventory === "1",
    trackExpiration: form.trackExpiration === "1",
    minimumStock: form.minimumStock ? Number(form.minimumStock) : null,
    initialStock: Number(form.initialStock || 0),
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
  const [editForm, setEditForm] = useState<SupplyFormState>(emptyForm);
  const [savedEditForm, setSavedEditForm] = useState<SupplyFormState | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("active");
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
      if (activeFilter === "active" && !normalizeBoolean(row.active)) {
        return false;
      }
      if (activeFilter === "inactive" && normalizeBoolean(row.active)) {
        return false;
      }
      if (!term) return true;
      return row.name.toLocaleLowerCase("es-CO").includes(term);
    });
  }, [activeFilter, categoryFilter, rows, search]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const canCreate =
    form.name.trim().length > 0 &&
    form.purchaseUnit.trim().length > 0 &&
    form.consumptionUnit.trim().length > 0 &&
    Number(form.conversionFactor || 0) > 0 &&
    Number(form.initialStock || 0) >= 0 &&
    (!form.minimumStock || Number(form.minimumStock) >= 0);
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
  }, [activeFilter, categoryFilter, rowsPerPage, search]);

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
    const verb = normalizeBoolean(row.has_movements) ? "desactivar" : "eliminar";
    if (!window.confirm(`Deseas ${verb} este insumo?`)) return;
    setStatus({ type: "loading" });
    try {
      const result = await adminRequest<{ deactivated: boolean }>(
        `/api/admin/supplies/${row.id}`,
        { method: "DELETE" },
      );
      setStatus({
        type: "success",
        message: result.deactivated
          ? "Insumo desactivado porque ya tenia movimientos."
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
          <Select
            value={activeFilter}
            onChange={(e) => setActiveFilter(String(e.target.value))}
            size="small"
          >
            <MenuItem value="active">Activos</MenuItem>
            <MenuItem value="inactive">Inactivos</MenuItem>
            <MenuItem value="all">Todos</MenuItem>
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
                <TableCell>Estado</TableCell>
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
                    {formatQuantity(row.conversion_factor)}{" "}
                    {row.consumption_unit}
                  </TableCell>
                  <TableCell>
                    {normalizeBoolean(row.track_inventory)
                      ? `${formatQuantity(row.current_stock)} ${row.consumption_unit}`
                      : "Sin control"}
                  </TableCell>
                  <TableCell>
                    {row.minimum_stock == null
                      ? "-"
                      : `${formatQuantity(row.minimum_stock)} ${row.consumption_unit}`}
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
                  <TableCell>
                    <Chip
                      label={normalizeBoolean(row.active) ? "Activo" : "Inactivo"}
                      color={normalizeBoolean(row.active) ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={() => openEditor(row)}>
                        Editar
                      </Button>
                      <Button color="error" variant="outlined" onClick={() => void remove(row)}>
                        {normalizeBoolean(row.has_movements)
                          ? "Desactivar"
                          : "Eliminar"}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>Sin insumos.</TableCell>
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
            setForm((s) => ({ ...s, conversionFactor: e.target.value }))
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
            setForm((s) => ({ ...s, minimumStock: e.target.value }))
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
            setForm((s) => ({ ...s, initialStock: e.target.value }))
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
