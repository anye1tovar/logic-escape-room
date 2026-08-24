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
    Number.isFinite(Number(form.price));
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
                      <TableCell colSpan={5}>Sin registros.</TableCell>
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
      <TextField
        label="Imagen (nombre de archivo)"
        value={form.image}
        onChange={(e) =>
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
