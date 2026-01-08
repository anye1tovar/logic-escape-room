import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Button,
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
  TablePagination,
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
  category: string | null;
  image: string | null;
};

type FormState = {
  name: string;
  price: string;
  description: string;
  available: "1" | "0";
  category: string;
  image: string;
};

export default function AdminCafeteriaProducts() {
  const [rows, setRows] = useState<ProductRow[]>([]);
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
    category: "",
    image: "",
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const catA = (a.category || "").toLowerCase();
      const catB = (b.category || "").toLowerCase();
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });
  }, [rows]);

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      const raw = (row.category || "").trim();
      const label = raw || "Sin categoria";
      const value = raw || "__none__";
      if (!seen.has(value)) {
        seen.set(value, label);
      }
    }
    return Array.from(seen.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return sorted;
    if (categoryFilter === "__none__") {
      return sorted.filter((row) => !(row.category || "").trim());
    }
    const needle = categoryFilter.trim().toLowerCase();
    return sorted.filter(
      (row) => (row.category || "").trim().toLowerCase() === needle
    );
  }, [categoryFilter, sorted]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<ProductRow[]>(
        "/api/admin/cafeteria-products"
      );
      setRows(data);
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
          category: form.category || null,
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
          category: row.category,
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

  const canCreate =
    form.name.trim().length > 0 &&
    form.price.trim().length > 0 &&
    Number.isFinite(Number(form.price));

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Cafeteria
          </Typography>
          <Typography className="admin-crud__subtitle">
            Gestiona la tabla `cafeteria_products`.
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

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__grid">
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
            <TextField
              label="Categoria"
              value={form.category}
              onChange={(e) =>
                setForm((s) => ({ ...s, category: e.target.value }))
              }
              size="small"
              fullWidth
            />
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
              Crear
            </Button>
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__actions">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            size="small"
          >
            <MenuItem value="all">Todas las categorias</MenuItem>
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
                    <TextField
                      value={r.category ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, category: e.target.value }
                              : x
                          )
                        )
                      }
                      size="small"
                      fullWidth
                    />
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
                        onClick={() => void remove(r.id)}
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
    </div>
  );
}
