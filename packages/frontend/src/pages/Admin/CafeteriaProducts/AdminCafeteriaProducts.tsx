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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import "../adminCrud.scss";

type ProductRow = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  available: number;
  category_id: number | null;
  category: string | null;
  image: string | null;
  track_inventory: boolean | number | string;
  minimum_stock: number | null;
  unit: string | null;
  current_stock: number | string;
  physical_stock?: number | string;
  sellable_stock?: number | string;
  nearest_expiration_date?: string | null;
  track_expiration: boolean | number | string;
  expiration_alert_days: number | string;
  critical_expiration_alert_days: number | string;
};

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  sort_order: number;
  active: number | boolean;
};

type ProductFormState = {
  name: string;
  price: string;
  description: string;
  available: "1" | "0";
  categoryId: string;
  image: string;
  trackInventory: "1" | "0";
  minimumStock: string;
  unit: string;
  initialStock: string;
  trackExpiration: "1" | "0";
  expirationAlertDays: string;
  criticalExpirationAlertDays: string;
  expirationDate: string;
  lotNumber: string;
};

type InventoryMovementRow = {
  id: number;
  product_id: number;
  type: string;
  quantity_delta: number | string;
  occurred_at: number | string;
  source_type: string | null;
  source_id: string | null;
  reason: string | null;
  created_by_name: string | null;
  expiration_date?: string | null;
  lot_number?: string | null;
};

type InventoryBatchRow = {
  id: number;
  product_id: number;
  received_quantity: number | string;
  current_quantity: number | string;
  expiration_date: string;
  lot_number: string | null;
  status: string;
};

type InventoryMovementResponse = {
  rows: InventoryMovementRow[];
  total: number;
};

type InventoryFormState = {
  type: "PURCHASE" | "WASTE" | "ADJUSTMENT_POSITIVE" | "ADJUSTMENT_NEGATIVE";
  quantity: string;
  reason: string;
  realCount: string;
  expirationDate: string;
  lotNumber: string;
};

type InventoryFilters = {
  type: string;
  dateFrom: string;
  dateTo: string;
};

type CategoryFormState = {
  name: string;
  slug: string;
  image: string;
  sortOrder: string;
  active: "1" | "0";
};

const emptyProductForm: ProductFormState = {
  name: "",
  price: "",
  description: "",
  available: "1",
  categoryId: "",
  image: "",
  trackInventory: "0",
  minimumStock: "",
  unit: "unidad",
  initialStock: "0",
  trackExpiration: "0",
  expirationAlertDays: "30",
  criticalExpirationAlertDays: "7",
  expirationDate: "",
  lotNumber: "",
};

const inventoryTypeLabels: Record<string, string> = {
  INITIAL_STOCK: "Stock inicial",
  PURCHASE: "Compra",
  SALE: "Venta",
  COURTESY: "Cortesia",
  WASTE: "Merma",
  ADJUSTMENT_POSITIVE: "Ajuste positivo",
  ADJUSTMENT_NEGATIVE: "Ajuste negativo",
  REVERSAL: "Reversion",
  WASTE_EXPIRED: "Baja por vencimiento",
};

const emptyInventoryForm: InventoryFormState = {
  type: "PURCHASE",
  quantity: "",
  reason: "",
  realCount: "",
  expirationDate: "",
  lotNumber: "",
};

const emptyCategoryForm: CategoryFormState = {
  name: "",
  slug: "",
  image: "",
  sortOrder: "0",
  active: "1",
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  currency: "COP",
  maximumFractionDigits: 0,
  style: "currency",
});

function toProductForm(row: ProductRow): ProductFormState {
  return {
    name: row.name,
    price: String(row.price),
    description: row.description ?? "",
    available: String(row.available ?? 1) === "0" ? "0" : "1",
    categoryId: row.category_id == null ? "" : String(row.category_id),
    image: fileNameOnly(row.image),
    trackInventory:
      row.track_inventory === true ||
      row.track_inventory === 1 ||
      row.track_inventory === "1"
        ? "1"
        : "0",
    minimumStock:
      row.minimum_stock == null ? "" : String(row.minimum_stock),
    unit: row.unit || "unidad",
    initialStock: "0",
    trackExpiration:
      row.track_expiration === true ||
      row.track_expiration === 1 ||
      row.track_expiration === "1"
        ? "1"
        : "0",
    expirationAlertDays: String(row.expiration_alert_days ?? 30),
    criticalExpirationAlertDays: String(row.critical_expiration_alert_days ?? 7),
    expirationDate: "",
    lotNumber: "",
  };
}

function toCategoryForm(row: CategoryRow): CategoryFormState {
  return {
    name: row.name,
    slug: row.slug,
    image: fileNameOnly(row.image),
    sortOrder: String(row.sort_order ?? 0),
    active:
      row.active === true || Number(row.active) === 1 ? "1" : "0",
  };
}

function productPayload(form: ProductFormState) {
  return {
    name: form.name,
    price: Number(form.price),
    description: form.description || null,
    available: form.available === "1" ? 1 : 0,
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    image: fileNameOnly(form.image) || null,
    trackInventory: form.trackInventory === "1",
    minimumStock: form.minimumStock ? Number(form.minimumStock) : null,
    unit: form.unit || "unidad",
    initialStock: Number(form.initialStock || 0),
    trackExpiration: form.trackExpiration === "1",
    expirationAlertDays: Number(form.expirationAlertDays || 30),
    criticalExpirationAlertDays: Number(form.criticalExpirationAlertDays || 7),
    expirationDate: form.expirationDate || null,
    lotNumber: form.lotNumber || null,
  };
}

function categoryPayload(form: CategoryFormState) {
  return {
    name: form.name,
    slug: form.slug || undefined,
    image: fileNameOnly(form.image) || null,
    sortOrder: Number(form.sortOrder || 0),
    active: form.active === "1" ? 1 : 0,
  };
}

function sameForm<T>(a: T | null, b: T) {
  return a != null && JSON.stringify(a) === JSON.stringify(b);
}

function fileNameOnly(value: string | null | undefined) {
  const normalized = value?.trim().replace(/[?#].*$/, "").replace(/\\/g, "/");
  return normalized?.split("/").filter(Boolean).pop() ?? "";
}

function buildPublicImagePath(
  image: string | null | undefined,
  basePath: string,
) {
  const fileName = fileNameOnly(image);
  if (!fileName) return null;
  const publicBase = import.meta.env.BASE_URL || "/";
  const normalizedBase = publicBase.endsWith("/")
    ? publicBase
    : `${publicBase}/`;
  const normalizedPath = basePath.replace(/^\/+|\/+$/g, "");
  return `${normalizedBase}${normalizedPath}/${encodeURIComponent(fileName)}`;
}

function formatDateTime(value: number | string) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return "";
  return new Date(timestamp).toLocaleString("es-CO");
}

function isTrackingInventory(product: ProductRow) {
  return (
    product.track_inventory === true ||
    product.track_inventory === 1 ||
    product.track_inventory === "1"
  );
}

function currentStock(product: ProductRow) {
  return Number(product.current_stock || 0);
}

function sellableStock(product: ProductRow) {
  if (!isTrackingExpiration(product)) {
    return currentStock(product);
  }
  return Number(product.sellable_stock ?? 0);
}

function isTrackingExpiration(product: ProductRow) {
  return (
    product.track_expiration === true ||
    product.track_expiration === 1 ||
    product.track_expiration === "1"
  );
}

function expirationStatus(product: ProductRow) {
  if (!isTrackingExpiration(product) || !product.nearest_expiration_date) {
    return null;
  }
  const today = new Date();
  const expires = new Date(`${product.nearest_expiration_date}T00:00:00-05:00`);
  const days = Math.ceil(
    (expires.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days < 0) return { label: "Vencido", color: "error" as const };
  if (days <= Number(product.critical_expiration_alert_days || 7)) {
    return { label: "Vence critico", color: "error" as const };
  }
  if (days <= Number(product.expiration_alert_days || 30)) {
    return { label: "Proximo a vencer", color: "warning" as const };
  }
  return { label: "Vigente", color: "success" as const };
}

export default function AdminCafeteriaProducts() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [activeTab, setActiveTab] = useState<"categories" | "products">(
    "categories",
  );
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editingCategory, setEditingCategory] =
    useState<CategoryRow | null>(null);
  const [editProductForm, setEditProductForm] =
    useState<ProductFormState>(emptyProductForm);
  const [savedProductForm, setSavedProductForm] =
    useState<ProductFormState | null>(null);
  const [editCategoryForm, setEditCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [savedCategoryForm, setSavedCategoryForm] =
    useState<CategoryFormState | null>(null);
  const [confirmDeleteProductId, setConfirmDeleteProductId] =
    useState<number | null>(null);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] =
    useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [inventoryProduct, setInventoryProduct] = useState<ProductRow | null>(
    null,
  );
  const [inventoryMovements, setInventoryMovements] = useState<
    InventoryMovementRow[]
  >([]);
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatchRow[]>(
    [],
  );
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventoryRowsPerPage, setInventoryRowsPerPage] = useState(20);
  const [inventoryFilters, setInventoryFilters] = useState<InventoryFilters>({
    type: "",
    dateFrom: "",
    dateTo: "",
  });
  const [inventoryForm, setInventoryForm] =
    useState<InventoryFormState>(emptyInventoryForm);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const categoryA = categories.find(
        (category) => category.id === a.category_id,
      );
      const categoryB = categories.find(
        (category) => category.id === b.category_id,
      );
      const orderA = categoryA?.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = categoryB?.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      const catA = (categoryA?.name || a.category || "").toLowerCase();
      const catB = (categoryB?.name || b.category || "").toLowerCase();
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });
  }, [categories, rows]);

  const categoryOptions = useMemo(() => {
    return categories
      .filter(
        (category) => category.active === true || Number(category.active) === 1,
      )
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name);
      })
      .map((category) => ({
        value: String(category.id),
        label: category.name,
      }));
  }, [categories]);

  const filtered = useMemo(() => {
    const search = productSearch.trim().toLocaleLowerCase("es-CO");
    const byCategory =
      categoryFilter === "all"
        ? sorted
        : categoryFilter === "__none__"
          ? sorted.filter((row) => !row.category_id)
          : sorted.filter(
              (row) => String(row.category_id || "") === categoryFilter,
            );

    if (!search) return byCategory;

    return byCategory.filter((row) =>
      row.name.toLocaleLowerCase("es-CO").includes(search),
    );
  }, [categoryFilter, productSearch, sorted]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const productCountsByCategory = useMemo(() => {
    const counts = new Map<number, number>();
    for (const row of rows) {
      if (!row.category_id) continue;
      counts.set(row.category_id, (counts.get(row.category_id) || 0) + 1);
    }
    return counts;
  }, [rows]);

  const hasProductChanges = !sameForm(savedProductForm, editProductForm);
  const hasCategoryChanges = !sameForm(savedCategoryForm, editCategoryForm);
  const productImagePreviewSrc = buildPublicImagePath(
    editProductForm.image,
    "img/menu/products",
  );
  const categoryImagePreviewSrc = buildPublicImagePath(
    editCategoryForm.image,
    "img/menu/categories",
  );
  const canCreate =
    form.name.trim().length > 0 &&
    form.price.trim().length > 0 &&
    Number.isFinite(Number(form.price)) &&
    (form.trackInventory === "0" ||
      (Number(form.initialStock || 0) >= 0 &&
        (form.trackExpiration === "0" ||
          Number(form.initialStock || 0) === 0 ||
          form.expirationDate)));
  const canCreateCategory = categoryForm.name.trim().length > 0;
  const confirmDeleteProduct =
    rows.find((row) => row.id === confirmDeleteProductId) || null;
  const confirmDeleteCategory =
    categories.find((category) => category.id === confirmDeleteCategoryId) ||
    null;

  async function load() {
    setStatus({ type: "loading" });
    try {
      const [data, categoryData] = await Promise.all([
        adminRequest<ProductRow[]>("/api/admin/cafeteria-products"),
        adminRequest<CategoryRow[]>("/api/admin/cafeteria-products/categories"),
      ]);
      setRows(
        data.map((row) => ({
          ...row,
          available:
            typeof row.available === "boolean"
              ? row.available
                ? 1
                : 0
              : Number(row.available) === 1
                ? 1
                : 0,
          current_stock: Number(row.current_stock || 0),
        })),
      );
      setCategories(
        categoryData.map((category) => ({
          ...category,
          active:
            category.active === true || Number(category.active) === 1 ? 1 : 0,
          sort_order: Number(category.sort_order || 0),
        })),
      );
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar los productos.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [categoryFilter, productSearch, rowsPerPage]);

  async function create() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/cafeteria-products", {
        method: "POST",
        body: productPayload(form),
      });
      setForm(emptyProductForm);
      setStatus({ type: "success", message: "Producto creado." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo crear el producto." });
    }
  }

  async function saveProduct(id: number, nextForm: ProductFormState) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/cafeteria-products/${id}`, {
        method: "PUT",
        body: productPayload(nextForm),
      });
      setStatus({ type: "success", message: "Producto actualizado." });
      closeProductEditor(true);
      await load();
    } catch {
      setStatus({
        type: "error",
        message: "No se pudo actualizar el producto.",
      });
    }
  }

  async function remove(id: number) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/cafeteria-products/${id}`, {
        method: "DELETE",
      });
      setStatus({ type: "success", message: "Producto eliminado." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar el producto." });
    }
  }

  async function createCategory() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/cafeteria-products/categories", {
        method: "POST",
        body: categoryPayload(categoryForm),
      });
      setCategoryForm(emptyCategoryForm);
      setStatus({ type: "success", message: "Categoria creada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo crear la categoria." });
    }
  }

  async function saveCategory(id: number, nextForm: CategoryFormState) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/cafeteria-products/categories/${id}`, {
        method: "PUT",
        body: categoryPayload(nextForm),
      });
      setStatus({ type: "success", message: "Categoria actualizada." });
      closeCategoryEditor(true);
      await load();
    } catch {
      setStatus({
        type: "error",
        message: "No se pudo actualizar la categoria.",
      });
    }
  }

  async function removeCategory(id: number) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/cafeteria-products/categories/${id}`, {
        method: "DELETE",
      });
      setStatus({ type: "success", message: "Categoria eliminada." });
      await load();
    } catch {
      setStatus({
        type: "error",
        message: "No se pudo eliminar la categoria.",
      });
    }
  }

  function openProductEditor(row: ProductRow) {
    const nextForm = toProductForm(row);
    setEditingProduct(row);
    setEditProductForm(nextForm);
    setSavedProductForm(nextForm);
  }

  async function openInventory(product: ProductRow) {
    setInventoryProduct(product);
    setInventoryForm(emptyInventoryForm);
    setInventoryPage(0);
    setInventoryFilters({ type: "", dateFrom: "", dateTo: "" });
    await loadInventoryMovements(product, {
      page: 0,
      rowsPerPage: inventoryRowsPerPage,
      filters: { type: "", dateFrom: "", dateTo: "" },
    });
    await loadInventoryBatches(product);
  }

  async function loadInventoryBatches(product = inventoryProduct) {
    if (!product || !isTrackingExpiration(product)) {
      setInventoryBatches([]);
      return;
    }
    try {
      const batches = await adminRequest<InventoryBatchRow[]>(
        `/api/admin/cafeteria-products/${product.id}/inventory-batches`,
      );
      setInventoryBatches(batches || []);
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar los lotes.",
      });
    }
  }

  async function loadInventoryMovements(
    product = inventoryProduct,
    options: {
      page?: number;
      rowsPerPage?: number;
      filters?: InventoryFilters;
    } = {},
  ) {
    if (!product) return;
    const nextPage = options.page ?? inventoryPage;
    const nextRowsPerPage = options.rowsPerPage ?? inventoryRowsPerPage;
    const nextFilters = options.filters ?? inventoryFilters;
    try {
      const params = new URLSearchParams({
        limit: String(nextRowsPerPage),
        offset: String(nextPage * nextRowsPerPage),
      });
      if (nextFilters.type) params.set("type", nextFilters.type);
      if (nextFilters.dateFrom) params.set("dateFrom", nextFilters.dateFrom);
      if (nextFilters.dateTo) params.set("dateTo", nextFilters.dateTo);
      const data = await adminRequest<InventoryMovementResponse>(
        `/api/admin/cafeteria-products/${
          product.id
        }/inventory-movements?${params.toString()}`,
      );
      setInventoryMovements(data.rows || []);
      setInventoryTotal(Number(data.total || 0));
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar los movimientos de inventario.",
      });
    }
  }

  async function createInventoryMovement() {
    if (!inventoryProduct) return;
    const quantityDelta = ["WASTE", "ADJUSTMENT_NEGATIVE"].includes(
      inventoryForm.type,
    )
      ? -Number(inventoryForm.quantity || 0)
      : Number(inventoryForm.quantity || 0);
    setStatus({ type: "loading" });
    try {
      await adminRequest(
        `/api/admin/cafeteria-products/${inventoryProduct.id}/inventory-movements`,
        {
          method: "POST",
          body: {
            type: inventoryForm.type,
            quantity: Number(inventoryForm.quantity || 0),
            reason: inventoryForm.reason,
            expirationDate: inventoryForm.expirationDate || null,
            lotNumber: inventoryForm.lotNumber || null,
          },
        },
      );
      setInventoryProduct((prev) =>
        prev
          ? {
              ...prev,
              current_stock: currentStock(prev) + quantityDelta,
            }
          : prev,
      );
      setInventoryForm(emptyInventoryForm);
      setStatus({ type: "success", message: "Inventario actualizado." });
      await load();
      await loadInventoryMovements(inventoryProduct);
      await loadInventoryBatches(inventoryProduct);
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo actualizar el inventario.",
      });
    }
  }

  async function setPhysicalCount() {
    if (!inventoryProduct) return;
    const realCount = Number(inventoryForm.realCount || 0);
    setStatus({ type: "loading" });
    try {
      await adminRequest(
        `/api/admin/cafeteria-products/${inventoryProduct.id}/physical-count`,
        {
          method: "POST",
          body: {
            realCount,
            reason: inventoryForm.reason,
          },
        },
      );
      setInventoryProduct((prev) =>
        prev
          ? {
              ...prev,
              current_stock: realCount,
            }
          : prev,
      );
      setInventoryForm(emptyInventoryForm);
      setStatus({ type: "success", message: "Conteo fisico registrado." });
      await load();
      await loadInventoryMovements(inventoryProduct);
      await loadInventoryBatches(inventoryProduct);
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo registrar el conteo fisico.",
      });
    }
  }

  async function writeOffExpiredBatches() {
    if (!inventoryProduct) return;
    const reason = window.prompt("Motivo de baja por vencimiento") || "";
    if (!reason.trim()) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(
        `/api/admin/cafeteria-products/${inventoryProduct.id}/write-off-expired`,
        {
          method: "POST",
          body: { reason },
        },
      );
      setStatus({ type: "success", message: "Vencidos dados de baja." });
      await load();
      await loadInventoryMovements(inventoryProduct);
      await loadInventoryBatches(inventoryProduct);
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudieron dar de baja los vencidos.",
      });
    }
  }

  function closeProductEditor(force = false) {
    if (
      !force &&
      hasProductChanges &&
      !window.confirm("Hay cambios sin guardar. Cerrar?")
    ) {
      return;
    }
    setEditingProduct(null);
    setEditProductForm(emptyProductForm);
    setSavedProductForm(null);
  }

  function openCategoryEditor(row: CategoryRow) {
    const nextForm = toCategoryForm(row);
    setEditingCategory(row);
    setEditCategoryForm(nextForm);
    setSavedCategoryForm(nextForm);
  }

  function closeCategoryEditor(force = false) {
    if (
      !force &&
      hasCategoryChanges &&
      !window.confirm("Hay cambios sin guardar. Cerrar?")
    ) {
      return;
    }
    setEditingCategory(null);
    setEditCategoryForm(emptyCategoryForm);
    setSavedCategoryForm(null);
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Cafeteria
          </Typography>
          <Typography className="admin-crud__subtitle">
            Administra categorias, imagenes de seccion y productos del menu.
          </Typography>
        </div>
        <div className="admin-crud__actions">
          <Button
            variant="outlined"
            onClick={() => void load()}
            disabled={status.type === "loading"}
          >
            Recargar
          </Button>
        </div>
      </header>

      {status.type === "error" ? (
        <Alert severity="error">{status.message}</Alert>
      ) : null}
      {status.type === "success" ? (
        <Alert severity="success">{status.message}</Alert>
      ) : null}

      <Paper className="admin-crud__tabs-panel">
        <Tabs
          value={activeTab}
          onChange={(_, value: "categories" | "products") =>
            setActiveTab(value)
          }
          variant="scrollable"
          scrollButtons="auto"
          className="admin-crud__tabs"
        >
          <Tab
            value="categories"
            label={`Categorias (${categories.length})`}
            className="admin-crud__tab"
          />
          <Tab
            value="products"
            label={`Productos (${rows.length})`}
            className="admin-crud__tab"
          />
        </Tabs>
      </Paper>

      {activeTab === "categories" ? (
        <>
          <Paper className="admin-crud__panel admin-crud__panel--accent">
            <div className="admin-crud__panel-inner admin-crud__grid">
              <Typography component="h2" className="admin-crud__section-title">
                Crear categoria
              </Typography>
              <CategoryForm form={categoryForm} setForm={setCategoryForm} />
              <div className="admin-crud__actions">
                <Button
                  variant="contained"
                  onClick={() => void createCategory()}
                  disabled={status.type === "loading" || !canCreateCategory}
                >
                  Crear categoria
                </Button>
              </div>
            </div>
          </Paper>

          <Paper className="admin-crud__panel">
            <div className="admin-crud__panel-inner admin-crud__section-header">
              <div>
                <Typography
                  component="h2"
                  className="admin-crud__section-title"
                >
                  Categorias existentes
                </Typography>
                <Typography className="admin-crud__section-copy">
                  Edita los detalles en un panel amplio y revisa aqui el orden
                  del menu.
                </Typography>
              </div>
              <div className="admin-crud__meta">
                <Chip label={`${categories.length} categorias`} size="small" />
                <Chip
                  label={`${categories.filter((category) => Number(category.active) === 1).length} activas`}
                  color="primary"
                  size="small"
                />
              </div>
            </div>
            <TableContainer>
              <Table className="admin-crud__table admin-crud__table--comfortable">
                <TableHead>
                  <TableRow>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Orden</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Productos</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id} hover>
                      <TableCell className="admin-crud__cell--wrap">
                        <Typography fontWeight={900}>{category.name}</Typography>
                      </TableCell>
                      <TableCell className="admin-crud__cell--nowrap">
                        {category.sort_order}
                      </TableCell>
                      <TableCell className="admin-crud__cell--nowrap">
                        <Chip
                          label={
                            Number(category.active) === 1
                              ? "Activa"
                              : "Inactiva"
                          }
                          color={
                            Number(category.active) === 1
                              ? "success"
                              : "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell className="admin-crud__cell--nowrap">
                        <Chip
                          label={`${
                            productCountsByCategory.get(category.id) || 0
                          } productos`}
                          size="small"
                        />
                      </TableCell>
                      <TableCell className="admin-crud__cell--nowrap">
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            onClick={() => openCategoryEditor(category)}
                            disabled={status.type === "loading"}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setConfirmDeleteCategoryId(category.id)}
                            disabled={status.type === "loading"}
                          >
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>Sin registros.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      ) : null}

      {activeTab === "products" ? (
        <>
          <Paper className="admin-crud__panel admin-crud__panel--accent">
            <div className="admin-crud__panel-inner admin-crud__grid">
              <Typography component="h2" className="admin-crud__section-title">
                Crear producto
              </Typography>
              <ProductForm
                form={form}
                setForm={setForm}
                categoryOptions={categoryOptions}
              />
              <div className="admin-crud__actions">
                <Button
                  variant="contained"
                  onClick={() => void create()}
                  disabled={status.type === "loading" || !canCreate}
                >
                  Crear producto
                </Button>
              </div>
            </div>
          </Paper>

          <Paper className="admin-crud__panel">
            <div className="admin-crud__panel-inner admin-crud__section-header">
              <div>
                <Typography
                  component="h2"
                  className="admin-crud__section-title"
                >
                  Productos del menu
                </Typography>
                <Typography className="admin-crud__section-copy">
                  Filtra la lista y edita cada producto desde su panel lateral.
                </Typography>
              </div>
              <div className="admin-crud__meta">
                <Chip label={`${filtered.length} productos`} size="small" />
                {productSearch.trim() ? (
                  <Chip label={`de ${rows.length} totales`} size="small" />
                ) : null}
              </div>
            </div>
            <div className="admin-crud__table-header admin-crud__table-header--controls">
              <TextField
                label="Buscar producto"
                placeholder="Nombre del producto"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                size="small"
              />
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="all">Todas las categorias</MenuItem>
                <MenuItem value="__none__">Sin categoria</MenuItem>
                {categoryOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </div>
            <TableContainer>
              <Table className="admin-crud__table admin-crud__table--comfortable">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Inventario</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((product) => (
                    <TableRow key={product.id} hover>
                      <TableCell className="admin-crud__cell--wrap">
                        <Typography fontWeight={900}>{product.name}</Typography>
                        {product.description ? (
                          <Typography className="admin-crud__clamp">
                            {product.description}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell className="admin-crud__cell--nowrap">
                        {moneyFormatter.format(product.price)}
                      </TableCell>
                      <TableCell className="admin-crud__cell--nowrap">
                        <Chip
                          label={
                            Number(product.available ?? 1) === 1
                              ? "Disponible"
                              : "No disponible"
                          }
                          color={
                            Number(product.available ?? 1) === 1
                              ? "success"
                              : "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell className="admin-crud__cell--nowrap">
                        {product.category || "Sin categoria"}
                      </TableCell>
                      <TableCell className="admin-crud__cell--nowrap">
                        {isTrackingInventory(product) ? (
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={
                                isTrackingExpiration(product)
                                  ? `${sellableStock(product)} vendibles`
                                  : `${currentStock(product)} ${
                                      product.unit || "unidad"
                                    }`
                              }
                              color={
                                product.minimum_stock != null &&
                                sellableStock(product) <=
                                  Number(product.minimum_stock)
                                  ? "warning"
                                  : "default"
                              }
                              size="small"
                            />
                            {product.minimum_stock != null &&
                            sellableStock(product) <=
                              Number(product.minimum_stock) ? (
                              <Chip
                                label="Stock bajo"
                                color="warning"
                                size="small"
                              />
                            ) : null}
                            {expirationStatus(product) ? (
                              <Chip
                                label={expirationStatus(product)?.label}
                                color={expirationStatus(product)?.color}
                                size="small"
                              />
                            ) : null}
                          </Stack>
                        ) : (
                          <Chip label="Sin control" size="small" />
                        )}
                      </TableCell>
                      <TableCell className="admin-crud__cell--nowrap">
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            onClick={() => openProductEditor(product)}
                            disabled={status.type === "loading"}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => void openInventory(product)}
                            disabled={
                              status.type === "loading" ||
                              !isTrackingInventory(product)
                            }
                          >
                            Inventario
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setConfirmDeleteProductId(product.id)}
                            disabled={status.type === "loading"}
                          >
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>Sin registros.</TableCell>
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
              onRowsPerPageChange={(e) =>
                setRowsPerPage(Number(e.target.value))
              }
              rowsPerPageOptions={[5, 10, 20, 50]}
            />
          </Paper>
        </>
      ) : null}

      <Drawer
        anchor="right"
        open={editingProduct != null}
        onClose={() => closeProductEditor()}
        PaperProps={{ className: "admin-crud__drawer" }}
      >
        <DrawerHeader
          title="Editar producto"
          subtitle={editingProduct?.name}
          dirty={hasProductChanges}
        />
        <div className="admin-crud__drawer-content">
          {productImagePreviewSrc ? (
            <div className="admin-crud__image-preview">
              <img
                src={productImagePreviewSrc}
                alt={editProductForm.name || "Producto"}
              />
            </div>
          ) : null}
          <ProductForm
            form={editProductForm}
            setForm={setEditProductForm}
            categoryOptions={categoryOptions}
            multiline
          />
        </div>
        <div className="admin-crud__drawer-actions">
          <Button
            variant="outlined"
            onClick={() => closeProductEditor()}
            disabled={status.type === "loading"}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editingProduct) return;
              void saveProduct(editingProduct.id, editProductForm);
            }}
            disabled={
              status.type === "loading" ||
              !editProductForm.name.trim() ||
              !Number.isFinite(Number(editProductForm.price)) ||
              !hasProductChanges
            }
          >
            Guardar producto
          </Button>
        </div>
      </Drawer>

      <Drawer
        anchor="right"
        open={editingCategory != null}
        onClose={() => closeCategoryEditor()}
        PaperProps={{ className: "admin-crud__drawer" }}
      >
        <DrawerHeader
          title="Editar categoria"
          subtitle={editingCategory?.name}
          dirty={hasCategoryChanges}
        />
        <div className="admin-crud__drawer-content">
          {categoryImagePreviewSrc ? (
            <div className="admin-crud__image-preview">
              <img
                src={categoryImagePreviewSrc}
                alt={editCategoryForm.name || "Categoria"}
              />
            </div>
          ) : null}
          <CategoryForm form={editCategoryForm} setForm={setEditCategoryForm} />
        </div>
        <div className="admin-crud__drawer-actions">
          <Button
            variant="outlined"
            onClick={() => closeCategoryEditor()}
            disabled={status.type === "loading"}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editingCategory) return;
              void saveCategory(editingCategory.id, editCategoryForm);
            }}
            disabled={
              status.type === "loading" ||
              !editCategoryForm.name.trim() ||
              !hasCategoryChanges
            }
          >
            Guardar categoria
          </Button>
        </div>
      </Drawer>

      <Dialog
        open={confirmDeleteProductId != null}
        onClose={() => setConfirmDeleteProductId(null)}
        aria-labelledby="confirm-delete-product-title"
      >
        <DialogTitle id="confirm-delete-product-title">
          Confirmar eliminacion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDeleteProduct
              ? `Eliminar el producto "${confirmDeleteProduct.name}"?`
              : "Eliminar este producto?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteProductId(null)}
            disabled={status.type === "loading"}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDeleteProductId == null) return;
              const id = confirmDeleteProductId;
              setConfirmDeleteProductId(null);
              void remove(id);
            }}
            disabled={status.type === "loading"}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteCategoryId != null}
        onClose={() => setConfirmDeleteCategoryId(null)}
        aria-labelledby="confirm-delete-category-title"
      >
        <DialogTitle id="confirm-delete-category-title">
          Confirmar eliminacion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDeleteCategory
              ? `Eliminar la categoria "${confirmDeleteCategory.name}"? Los productos quedaran sin categoria.`
              : "Eliminar esta categoria?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteCategoryId(null)}
            disabled={status.type === "loading"}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDeleteCategoryId == null) return;
              const id = confirmDeleteCategoryId;
              setConfirmDeleteCategoryId(null);
              void removeCategory(id);
            }}
            disabled={status.type === "loading"}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={inventoryProduct != null}
        onClose={() => setInventoryProduct(null)}
        maxWidth="md"
        fullWidth
        aria-labelledby="inventory-title"
      >
        <DialogTitle id="inventory-title">
          {inventoryProduct
            ? `Inventario - ${inventoryProduct.name}`
            : "Inventario"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {inventoryProduct ? (
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`Stock fisico: ${
                    inventoryProduct.physical_stock ?? currentStock(inventoryProduct)
                  } ${inventoryProduct.unit || "unidad"}`}
                  color="primary"
                  size="small"
                />
                {isTrackingExpiration(inventoryProduct) ? (
                  <Chip
                    label={`Vendible: ${sellableStock(inventoryProduct)}`}
                    color="success"
                    size="small"
                  />
                ) : null}
                {inventoryProduct.minimum_stock != null ? (
                  <Chip
                    label={`Minimo: ${inventoryProduct.minimum_stock}`}
                    size="small"
                  />
                ) : null}
                {isTrackingExpiration(inventoryProduct) ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => void writeOffExpiredBatches()}
                    disabled={status.type === "loading"}
                  >
                    Dar de baja vencidos
                  </Button>
                ) : null}
              </Stack>
            ) : null}

            <div className="admin-crud__row">
              <Select
                value={inventoryForm.type}
                onChange={(e) =>
                  setInventoryForm((s) => ({
                    ...s,
                    type: e.target.value as InventoryFormState["type"],
                  }))
                }
                size="small"
                fullWidth
              >
                <MenuItem value="PURCHASE">Compra</MenuItem>
                <MenuItem value="WASTE">Merma</MenuItem>
                <MenuItem value="ADJUSTMENT_POSITIVE">
                  Ajuste positivo
                </MenuItem>
                <MenuItem value="ADJUSTMENT_NEGATIVE">
                  Ajuste negativo
                </MenuItem>
              </Select>
              <TextField
                label="Cantidad"
                value={inventoryForm.quantity}
                onChange={(e) =>
                  setInventoryForm((s) => ({
                    ...s,
                    quantity: e.target.value,
                  }))
                }
                inputProps={{ inputMode: "numeric", min: 1 }}
                size="small"
                fullWidth
              />
            </div>

            <div className="admin-crud__row">
              <TextField
                label="Motivo"
                value={inventoryForm.reason}
                onChange={(e) =>
                  setInventoryForm((s) => ({
                    ...s,
                    reason: e.target.value,
                  }))
                }
                size="small"
                fullWidth
              />
              <Button
                variant="contained"
                onClick={() => void createInventoryMovement()}
                disabled={
                  status.type === "loading" ||
                  !Number(inventoryForm.quantity || 0) ||
                  !inventoryForm.reason.trim() ||
                  (inventoryProduct != null &&
                    isTrackingExpiration(inventoryProduct) &&
                    ["PURCHASE", "ADJUSTMENT_POSITIVE"].includes(
                      inventoryForm.type,
                    ) &&
                    !inventoryForm.expirationDate)
                }
              >
                Registrar movimiento
              </Button>
            </div>

            {inventoryProduct && isTrackingExpiration(inventoryProduct) ? (
              <div className="admin-crud__row">
                <TextField
                  label="Vencimiento del lote"
                  type="date"
                  value={inventoryForm.expirationDate}
                  onChange={(e) =>
                    setInventoryForm((s) => ({
                      ...s,
                      expirationDate: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  fullWidth
                  disabled={
                    inventoryForm.type === "WASTE" ||
                    inventoryForm.type === "ADJUSTMENT_NEGATIVE"
                  }
                />
                <TextField
                  label="Numero de lote"
                  value={inventoryForm.lotNumber}
                  onChange={(e) =>
                    setInventoryForm((s) => ({
                      ...s,
                      lotNumber: e.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                  disabled={
                    inventoryForm.type === "WASTE" ||
                    inventoryForm.type === "ADJUSTMENT_NEGATIVE"
                  }
                />
              </div>
            ) : null}

            {inventoryProduct && !isTrackingExpiration(inventoryProduct) ? (
              <div className="admin-crud__row">
                <TextField
                  label="Conteo fisico"
                  value={inventoryForm.realCount}
                  onChange={(e) =>
                    setInventoryForm((s) => ({
                      ...s,
                      realCount: e.target.value,
                    }))
                  }
                  inputProps={{ inputMode: "numeric", min: 0 }}
                  size="small"
                  fullWidth
                />
                <Button
                  variant="outlined"
                  onClick={() => void setPhysicalCount()}
                  disabled={
                    status.type === "loading" ||
                    inventoryForm.realCount.trim() === "" ||
                    !inventoryForm.reason.trim()
                  }
                >
                  Ajustar a conteo
                </Button>
              </div>
            ) : null}

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Select
                value={inventoryFilters.type}
                onChange={(e) =>
                  setInventoryFilters((s) => ({
                    ...s,
                    type: String(e.target.value),
                  }))
                }
                size="small"
                displayEmpty
              >
                <MenuItem value="">Todos los tipos</MenuItem>
                {Object.entries(inventoryTypeLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label="Desde"
                type="date"
                value={inventoryFilters.dateFrom}
                onChange={(e) =>
                  setInventoryFilters((s) => ({
                    ...s,
                    dateFrom: e.target.value,
                  }))
                }
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Hasta"
                type="date"
                value={inventoryFilters.dateTo}
                onChange={(e) =>
                  setInventoryFilters((s) => ({
                    ...s,
                    dateTo: e.target.value,
                  }))
                }
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  setInventoryPage(0);
                  void loadInventoryMovements(inventoryProduct, {
                    page: 0,
                    filters: inventoryFilters,
                  });
                }}
              >
                Filtrar
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const filters = { type: "", dateFrom: "", dateTo: "" };
                  setInventoryFilters(filters);
                  setInventoryPage(0);
                  void loadInventoryMovements(inventoryProduct, {
                    page: 0,
                    filters,
                  });
                }}
              >
                Limpiar
              </Button>
            </Stack>

            {inventoryProduct && isTrackingExpiration(inventoryProduct) ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lote</TableCell>
                      <TableCell>Vence</TableCell>
                      <TableCell>Recibido</TableCell>
                      <TableCell>Actual</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventoryBatches.map((batch) => {
                      const batchProduct = {
                        ...inventoryProduct,
                        nearest_expiration_date: batch.expiration_date,
                      };
                      const state = expirationStatus(batchProduct);
                      return (
                        <TableRow key={batch.id} hover>
                          <TableCell>{batch.lot_number || `#${batch.id}`}</TableCell>
                          <TableCell>{batch.expiration_date}</TableCell>
                          <TableCell>{batch.received_quantity}</TableCell>
                          <TableCell>{batch.current_quantity}</TableCell>
                          <TableCell>
                            <Chip
                              label={state?.label || "Vigente"}
                              color={state?.color || "success"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {inventoryBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>Sin lotes.</TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Origen</TableCell>
                    <TableCell>Motivo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventoryMovements.map((movement) => (
                    <TableRow key={movement.id} hover>
                      <TableCell>
                        {formatDateTime(movement.occurred_at)}
                      </TableCell>
                      <TableCell>
                        {inventoryTypeLabels[movement.type] || movement.type}
                      </TableCell>
                      <TableCell>{movement.quantity_delta}</TableCell>
                      <TableCell>
                        {[movement.source_type, movement.source_id]
                          .filter(Boolean)
                          .join(" #")}
                      </TableCell>
                      <TableCell>{movement.reason || ""}</TableCell>
                    </TableRow>
                  ))}
                  {inventoryMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>Sin movimientos.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={inventoryTotal}
              page={inventoryPage}
              onPageChange={(_, nextPage) => {
                setInventoryPage(nextPage);
                void loadInventoryMovements(inventoryProduct, {
                  page: nextPage,
                });
              }}
              rowsPerPage={inventoryRowsPerPage}
              onRowsPerPageChange={(e) => {
                const nextRowsPerPage = Number(e.target.value);
                setInventoryRowsPerPage(nextRowsPerPage);
                setInventoryPage(0);
                void loadInventoryMovements(inventoryProduct, {
                  page: 0,
                  rowsPerPage: nextRowsPerPage,
                });
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInventoryProduct(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function DrawerHeader({
  title,
  subtitle,
  dirty,
}: {
  title: string;
  subtitle?: string;
  dirty: boolean;
}) {
  return (
    <div className="admin-crud__drawer-header">
      <div>
        <Typography component="h2" className="admin-crud__section-title">
          {title}
        </Typography>
        <Typography fontWeight={900}>{subtitle}</Typography>
      </div>
      <Chip
        label={dirty ? "Cambios sin guardar" : "Sin cambios"}
        color={dirty ? "warning" : "default"}
        size="small"
      />
    </div>
  );
}

function ProductForm({
  form,
  setForm,
  categoryOptions,
  multiline = false,
}: {
  form: ProductFormState;
  setForm: Dispatch<SetStateAction<ProductFormState>>;
  categoryOptions: Array<{ value: string; label: string }>;
  multiline?: boolean;
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
          label="Precio"
          value={form.price}
          onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
          inputProps={{ inputMode: "numeric" }}
          size="small"
          fullWidth
        />
      </div>
      <div className="admin-crud__row">
        <Select
          value={form.categoryId}
          onChange={(e) =>
            setForm((s) => ({ ...s, categoryId: e.target.value }))
          }
          size="small"
          fullWidth
          displayEmpty
        >
          <MenuItem value="">Sin categoria</MenuItem>
          {categoryOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={form.available}
          onChange={(e) =>
            setForm((s) => ({
              ...s,
              available: e.target.value as "1" | "0",
            }))
          }
          size="small"
          fullWidth
        >
          <MenuItem value="1">Disponible</MenuItem>
          <MenuItem value="0">No disponible</MenuItem>
        </Select>
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
          <MenuItem value="0">Sin control de inventario</MenuItem>
          <MenuItem value="1">Controlar inventario</MenuItem>
        </Select>
        <TextField
          label="Unidad"
          value={form.unit}
          onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
          size="small"
          fullWidth
        />
      </div>
      {form.trackInventory === "1" ? (
        <>
          <div className="admin-crud__row">
            <TextField
              label="Stock minimo"
              value={form.minimumStock}
              onChange={(e) =>
                setForm((s) => ({ ...s, minimumStock: e.target.value }))
              }
              inputProps={{ inputMode: "numeric", min: 0 }}
              size="small"
              fullWidth
            />
            <TextField
              label="Stock inicial"
              value={form.initialStock}
              onChange={(e) =>
                setForm((s) => ({ ...s, initialStock: e.target.value }))
              }
              helperText="Solo genera movimiento al crear producto."
              inputProps={{ inputMode: "numeric", min: 0 }}
              size="small"
              fullWidth
              disabled={multiline}
            />
          </div>
          <div className="admin-crud__row">
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
            <TextField
              label="Dias de alerta"
              value={form.expirationAlertDays}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  expirationAlertDays: e.target.value,
                }))
              }
              inputProps={{ inputMode: "numeric", min: 1 }}
              size="small"
              fullWidth
            />
          </div>
          {form.trackExpiration === "1" ? (
            <div className="admin-crud__row">
              <TextField
                label="Dias criticos"
                value={form.criticalExpirationAlertDays}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    criticalExpirationAlertDays: e.target.value,
                  }))
                }
                inputProps={{ inputMode: "numeric", min: 1 }}
                size="small"
                fullWidth
              />
              <TextField
                label="Vencimiento lote inicial"
                type="date"
                value={form.expirationDate}
                onChange={(e) =>
                  setForm((s) => ({ ...s, expirationDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
                disabled={multiline}
              />
              <TextField
                label="Numero de lote"
                value={form.lotNumber}
                onChange={(e) =>
                  setForm((s) => ({ ...s, lotNumber: e.target.value }))
                }
                size="small"
                fullWidth
                disabled={multiline}
              />
            </div>
          ) : null}
        </>
      ) : null}
      <TextField
        label="Imagen (nombre de archivo)"
        value={form.image}
        onChange={(e) =>
          setForm((s) => ({ ...s, image: e.target.value }))
        }
        onBlur={(e) =>
          setForm((s) => ({ ...s, image: fileNameOnly(e.target.value) }))
        }
        placeholder="Aromatica.webp"
        size="small"
        fullWidth
      />
      <TextField
        label="Descripcion"
        value={form.description}
        onChange={(e) =>
          setForm((s) => ({ ...s, description: e.target.value }))
        }
        minRows={multiline ? 4 : 2}
        multiline
        size="small"
        fullWidth
      />
    </div>
  );
}

function CategoryForm({
  form,
  setForm,
}: {
  form: CategoryFormState;
  setForm: Dispatch<SetStateAction<CategoryFormState>>;
}) {
  return (
    <div className="admin-crud__grid">
      <div className="admin-crud__row">
        <TextField
          label="Nombre de categoria"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          size="small"
          fullWidth
        />
        <TextField
          label="Orden"
          value={form.sortOrder}
          onChange={(e) =>
            setForm((s) => ({ ...s, sortOrder: e.target.value }))
          }
          inputProps={{ inputMode: "numeric" }}
          size="small"
          fullWidth
        />
      </div>
      <div className="admin-crud__row">
        <TextField
          label="Imagen de categoria (nombre de archivo)"
          value={form.image}
          onChange={(e) =>
            setForm((s) => ({ ...s, image: e.target.value }))
          }
          onBlur={(e) =>
            setForm((s) => ({ ...s, image: fileNameOnly(e.target.value) }))
          }
          placeholder="bebidas-calientes.webp"
          size="small"
          fullWidth
        />
        <Select
          value={form.active}
          onChange={(e) =>
            setForm((s) => ({ ...s, active: e.target.value as "1" | "0" }))
          }
          size="small"
          fullWidth
        >
          <MenuItem value="1">Activa</MenuItem>
          <MenuItem value="0">Inactiva</MenuItem>
        </Select>
      </div>
    </div>
  );
}
