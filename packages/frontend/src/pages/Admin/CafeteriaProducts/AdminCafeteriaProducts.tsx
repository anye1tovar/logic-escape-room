import { useEffect, useMemo, useState } from "react";
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
  TableRow,
  TablePagination,
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

type FormState = {
  name: string;
  price: string;
  description: string;
  available: "1" | "0";
  categoryId: string;
  image: string;
};

type CategoryFormState = {
  name: string;
  image: string;
  sortOrder: string;
  active: "1" | "0";
};

export default function AdminCafeteriaProducts() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const [form, setForm] = useState<FormState>({
    name: "",
    price: "",
    description: "",
    available: "1",
    categoryId: "",
    image: "",
  });
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: "",
    image: "",
    sortOrder: "0",
    active: "1",
  });
  const [activeTab, setActiveTab] = useState<"categories" | "products">(
    "categories"
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const categoryA = categories.find((category) => category.id === a.category_id);
      const categoryB = categories.find((category) => category.id === b.category_id);
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
      .filter((category) => category.active === true || Number(category.active) === 1)
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
    if (categoryFilter === "all") return sorted;
    if (categoryFilter === "__none__") {
      return sorted.filter((row) => !row.category_id);
    }
    return sorted.filter((row) => String(row.category_id || "") === categoryFilter);
  }, [categoryFilter, sorted]);

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

  async function load() {
    setStatus({ type: "loading" });
    try {
      const [data, categoryData] = await Promise.all([
        adminRequest<ProductRow[]>("/api/admin/cafeteria-products"),
        adminRequest<CategoryRow[]>("/api/admin/cafeteria-products/categories"),
      ]);
      const normalized = data.map((row) => {
        const raw = row.available;
        const available =
          typeof raw === "boolean"
            ? raw
              ? 1
              : 0
            : Number(raw) === 1
            ? 1
            : 0;
        return { ...row, available };
      });
      setRows(normalized);
      setCategories(
        categoryData.map((category) => ({
          ...category,
          active:
            category.active === true || Number(category.active) === 1 ? 1 : 0,
          sort_order: Number(category.sort_order || 0),
        }))
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
  }, [categoryFilter, rowsPerPage]);

  async function create() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/cafeteria-products", {
        method: "POST",
        body: {
          name: form.name,
          price: Number(form.price),
          description: form.description || null,
          available: form.available === "1" ? 1 : 0,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          image: form.image || null,
        },
      });
      setForm((s) => ({ ...s, name: "", price: "" }));
      setStatus({ type: "success", message: "Producto creado." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo crear el producto." });
    }
  }

  async function update(row: ProductRow) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/cafeteria-products/${row.id}`, {
        method: "PUT",
        body: {
          name: row.name,
          price: row.price,
          description: row.description,
          available: row.available ?? 1,
          categoryId: row.category_id,
          image: row.image,
        },
      });
      setStatus({ type: "success", message: "Producto actualizado." });
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
        body: {
          name: categoryForm.name,
          image: categoryForm.image || null,
          sortOrder: Number(categoryForm.sortOrder || 0),
          active: categoryForm.active === "1" ? 1 : 0,
        },
      });
      setCategoryForm({
        name: "",
        image: "",
        sortOrder: "0",
        active: "1",
      });
      setStatus({ type: "success", message: "Categoria creada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo crear la categoria." });
    }
  }

  async function updateCategory(row: CategoryRow) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/cafeteria-products/categories/${row.id}`, {
        method: "PUT",
        body: {
          name: row.name,
          slug: row.slug,
          image: row.image,
          sortOrder: row.sort_order,
          active: row.active === true || Number(row.active) === 1 ? 1 : 0,
        },
      });
      setStatus({ type: "success", message: "Categoria actualizada." });
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
      setStatus({ type: "error", message: "No se pudo eliminar la categoria." });
    }
  }

  const confirmDeleteRow = rows.find((row) => row.id === confirmDeleteId) || null;

  const canCreate =
    form.name.trim().length > 0 &&
    form.price.trim().length > 0 &&
    Number.isFinite(Number(form.price));
  const canCreateCategory = categoryForm.name.trim().length > 0;

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
            <div className="admin-crud__section-header">
              <div>
                <Typography component="h2" className="admin-crud__section-title">
                  Crear categoria
                </Typography>
                <Typography className="admin-crud__section-copy">
                  Crea primero las categorias para poder asignarlas a los
                  productos.
                </Typography>
              </div>
            </div>
            <div className="admin-crud__row">
              <TextField
                label="Nombre de categoria"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((s) => ({ ...s, name: e.target.value }))
                }
                size="small"
                fullWidth
              />
              <TextField
                label="Orden"
                value={categoryForm.sortOrder}
                onChange={(e) =>
                  setCategoryForm((s) => ({ ...s, sortOrder: e.target.value }))
                }
                inputProps={{ inputMode: "numeric" }}
                size="small"
                fullWidth
              />
            </div>
            <div className="admin-crud__row">
              <TextField
                label="Imagen de categoria (URL o path)"
                value={categoryForm.image}
                onChange={(e) =>
                  setCategoryForm((s) => ({ ...s, image: e.target.value }))
                }
                size="small"
                fullWidth
              />
              <Select
                value={categoryForm.active}
                onChange={(e) =>
                  setCategoryForm((s) => ({
                    ...s,
                    active: e.target.value as "1" | "0",
                  }))
                }
                size="small"
                fullWidth
              >
                <MenuItem value="1">Activa</MenuItem>
                <MenuItem value="0">Inactiva</MenuItem>
              </Select>
            </div>
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
              <Typography component="h2" className="admin-crud__section-title">
                Categorias existentes
              </Typography>
              <Typography className="admin-crud__section-copy">
                Define el orden, estado e imagen que vera cada seccion del menu
                publico. Editar el nombre actualiza tambien los productos
                asociados.
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
                  <TableCell>Nombre</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Imagen</TableCell>
                  <TableCell>Orden</TableCell>
                  <TableCell>Activa</TableCell>
                  <TableCell>Productos</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} hover>
                    <TableCell className="admin-crud__cell--nowrap">
                      <TextField
                        value={category.name}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((item) =>
                              item.id === category.id
                                ? { ...item, name: e.target.value }
                                : item
                            )
                          )
                        }
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell className="admin-crud__cell--nowrap">
                      <TextField
                        value={category.slug}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((item) =>
                              item.id === category.id
                                ? { ...item, slug: e.target.value }
                                : item
                            )
                          )
                        }
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell className="admin-crud__cell--nowrap">
                      <TextField
                        value={category.image ?? ""}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((item) =>
                              item.id === category.id
                                ? { ...item, image: e.target.value }
                                : item
                            )
                          )
                        }
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell className="admin-crud__cell--nowrap">
                      <TextField
                        value={String(category.sort_order)}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((item) =>
                              item.id === category.id
                                ? {
                                    ...item,
                                    sort_order: Number(e.target.value || 0),
                                  }
                                : item
                            )
                          )
                        }
                        inputProps={{ inputMode: "numeric" }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell className="admin-crud__cell--nowrap">
                      <Select
                        value={String(
                          category.active === true ||
                            Number(category.active) === 1
                            ? 1
                            : 0
                        )}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((item) =>
                              item.id === category.id
                                ? {
                                    ...item,
                                    active: e.target.value === "1" ? 1 : 0,
                                  }
                                : item
                            )
                          )
                        }
                        size="small"
                        fullWidth
                      >
                        <MenuItem value="1">Si</MenuItem>
                        <MenuItem value="0">No</MenuItem>
                      </Select>
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
                          onClick={() => void updateCategory(category)}
                          disabled={status.type === "loading"}
                        >
                          Guardar
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => void removeCategory(category.id)}
                          disabled={status.type === "loading"}
                        >
                          Eliminar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
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
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                Crear producto
              </Typography>
              <Typography className="admin-crud__section-copy">
                Agrega bebidas, snacks o combos y asignales una categoria.
              </Typography>
            </div>
          </div>

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
              onChange={(e) =>
                setForm((s) => ({ ...s, price: e.target.value }))
              }
              inputProps={{ inputMode: "numeric" }}
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__row">
            <Select
              label="Categoria"
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
            <TextField
              label="Imagen (URL o path)"
              value={form.image}
              onChange={(e) =>
                setForm((s) => ({ ...s, image: e.target.value }))
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Descripcion"
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
              size="small"
              fullWidth
            />
          </div>

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
            <Typography component="h2" className="admin-crud__section-title">
              Productos del menu
            </Typography>
            <Typography className="admin-crud__section-copy">
              Filtra por categoria para editar precios, disponibilidad e
              imagenes sin perder contexto.
            </Typography>
          </div>
          <div className="admin-crud__meta">
            <Chip label={`${filtered.length} productos`} size="small" />
          </div>
        </div>
        <div className="admin-crud__table-header admin-crud__table-header--controls">
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
          <Table className="admin-crud__table admin-crud__table--auto">
            <TableHead>
              <TableRow>
                <TableCell className="admin-crud__cell--wrap">Nombre</TableCell>
                <TableCell className="admin-crud__cell--nowrap">
                  Precio
                </TableCell>
                <TableCell className="admin-crud__cell--nowrap">
                  Disponible
                </TableCell>
                <TableCell className="admin-crud__cell--wrap">
                  Categoria
                </TableCell>
                <TableCell className="admin-crud__cell--nowrap">
                  Imagen
                </TableCell>
                <TableCell className="admin-crud__cell--wrap">
                  Descripcion
                </TableCell>
                <TableCell className="admin-crud__cell--nowrap">
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell className="admin-crud__cell--nowrap">
                    <TextField
                      value={r.name}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, name: e.target.value } : x
                          )
                        )
                      }
                      size="small"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <TextField
                      value={String(r.price)}
                      onChange={(e) => {
                        const value = e.target.value;
                        const nextPrice =
                          value === "" ? 0 : Number(e.target.value);
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  price: Number.isFinite(nextPrice)
                                    ? nextPrice
                                    : x.price,
                                }
                              : x
                          )
                        );
                      }}
                      size="small"
                      inputProps={{ inputMode: "numeric" }}
                    />
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Select
                      value={String(r.available ?? 1)}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  available: e.target.value === "1" ? 1 : 0,
                                }
                              : x
                          )
                        )
                      }
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="1">Si</MenuItem>
                      <MenuItem value="0">No</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Select
                      value={r.category_id ? String(r.category_id) : ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  category_id: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }
                              : x
                          )
                        )
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
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <TextField
                      value={r.image ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, image: e.target.value } : x
                          )
                        )
                      }
                      size="small"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell className="admin-crud__cell--wrap">
                    <TextField
                      value={r.description ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, description: e.target.value }
                              : x
                          )
                        )
                      }
                      size="small"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => void update(r)}
                        disabled={status.type === "loading"}
                      >
                        Guardar
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setConfirmDeleteId(r.id)}
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
                  <TableCell colSpan={7}>Sin registros.</TableCell>
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
          onRowsPerPageChange={(e) => setRowsPerPage(Number(e.target.value))}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />
      </Paper>
      </>
      ) : null}
      <Dialog
        open={confirmDeleteId != null}
        onClose={() => setConfirmDeleteId(null)}
        aria-labelledby="confirm-delete-product-title"
      >
        <DialogTitle id="confirm-delete-product-title">
          Confirmar eliminacion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDeleteRow
              ? `¿Eliminar el producto "${confirmDeleteRow.name}"?`
              : "¿Eliminar este producto?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteId(null)}
            disabled={status.type === "loading"}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDeleteId == null) return;
              const id = confirmDeleteId;
              setConfirmDeleteId(null);
              void remove(id);
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
