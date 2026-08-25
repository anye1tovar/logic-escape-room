import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";

type Product = { id: number; name: string; price: number; available: number };
type Promotion = {
  id: number;
  name: string;
  promotionalPrice: number;
  originalPrice: number;
  active: boolean | number;
  items: Array<{ name: string; quantity: number }>;
  daysOfWeek?: number[];
  startsTime?: string | null;
  endsTime?: string | null;
};

type Form = {
  name: string;
  description: string;
  promotionalPrice: string;
  productIds: string[];
  quantities: Record<string, string>;
  startsAt: string;
  endsAt: string;
  daysOfWeek: number[];
  startsTime: string;
  endsTime: string;
  active: "1" | "0";
};

const emptyForm: Form = {
  name: "",
  description: "",
  promotionalPrice: "",
  productIds: [],
  quantities: {},
  startsAt: "",
  endsAt: "",
  daysOfWeek: [],
  startsTime: "",
  endsTime: "",
  active: "1",
};
const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function AdminCafeteriaPromotions() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function load() {
    try {
      const [productRows, promotionRows] = await Promise.all([
        adminRequest<Product[]>("/api/admin/cafeteria-products"),
        adminRequest<Promotion[]>("/api/admin/cafeteria-products/promotions"),
      ]);
      setProducts(
        productRows.filter((product) => Number(product.available) === 1),
      );
      setPromotions(promotionRows);
    } catch {
      setMessage({
        type: "error",
        text: "No se pudieron cargar las promociones.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const originalPrice = useMemo(
    () =>
      form.productIds.reduce(
        (total, id) =>
          total +
          (products.find((product) => String(product.id) === id)?.price || 0) *
            Number(form.quantities[id] || 1),
        0,
      ),
    [form.productIds, form.quantities, products],
  );

  async function create() {
    try {
      await adminRequest("/api/admin/cafeteria-products/promotions", {
        method: "POST",
        body: {
          name: form.name,
          description: form.description || null,
          promotionalPrice: Number(form.promotionalPrice),
          active: form.active === "1" ? 1 : 0,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          daysOfWeek: form.daysOfWeek,
          startsTime: form.startsTime || null,
          endsTime: form.endsTime || null,
          items: form.productIds.map((productId) => ({
            productId: Number(productId),
            quantity: Number(form.quantities[productId] || 1),
          })),
        },
      });
      setForm(emptyForm);
      setMessage({ type: "success", text: "Promocion creada." });
      await load();
    } catch {
      setMessage({ type: "error", text: "No se pudo crear la promocion." });
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Eliminar esta promocion?")) return;
    try {
      await adminRequest(`/api/admin/cafeteria-products/promotions/${id}`, {
        method: "DELETE",
      });
      setMessage({ type: "success", text: "Promocion eliminada." });
      await load();
    } catch {
      setMessage({ type: "error", text: "No se pudo eliminar la promocion." });
    }
  }

  const valid =
    form.name.trim() &&
    Number(form.promotionalPrice) >= 0 &&
    form.productIds.length > 0 &&
    form.productIds.every(
      (productId) =>
        Number.isInteger(Number(form.quantities[productId])) &&
        Number(form.quantities[productId]) > 0,
    ) &&
    ((!form.startsTime && !form.endsTime) ||
      (form.startsTime && form.endsTime));
  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Promociones
          </Typography>
          <Typography className="admin-crud__subtitle">
            Crea ofertas informativas para el menu digital.
          </Typography>
        </div>
        <Button variant="outlined" onClick={() => void load()}>
          Recargar
        </Button>
      </header>
      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}
      <Paper className="admin-crud__panel admin-crud__panel--accent">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <Typography component="h2" className="admin-crud__section-title">
            Crear promocion
          </Typography>
          <div className="admin-crud__row">
            <TextField
              label="Nombre especial"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Precio promocional"
              value={form.promotionalPrice}
              onChange={(e) =>
                setForm({ ...form, promotionalPrice: e.target.value })
              }
              inputProps={{ inputMode: "numeric" }}
              size="small"
              fullWidth
            />
          </div>
          <Select
            multiple
            displayEmpty
            value={form.productIds}
            onChange={(e) =>
              setForm({
                ...form,
                productIds: e.target.value as string[],
                quantities: Object.fromEntries(
                  (e.target.value as string[]).map((id) => [
                    id,
                    form.quantities[id] || "1",
                  ]),
                ),
              })
            }
            size="small"
            fullWidth
            renderValue={(selected) =>
              (selected as string[])
                .map(
                  (id) =>
                    products.find((product) => String(product.id) === id)?.name,
                )
                .join(", ") || "Selecciona productos"
            }
          >
            {products.map((product) => (
              <MenuItem key={product.id} value={String(product.id)}>
                {product.name} - {money.format(product.price)}
              </MenuItem>
            ))}
          </Select>
          {form.productIds.map((productId) => (
            <div className="admin-crud__row" key={productId}>
              <Typography>
                {
                  products.find((product) => String(product.id) === productId)
                    ?.name
                }
              </Typography>
              <TextField
                label="Cantidad"
                type="number"
                inputProps={{ min: 1, step: 1 }}
                value={form.quantities[productId] || "1"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantities: {
                      ...form.quantities,
                      [productId]: e.target.value,
                    },
                  })
                }
                size="small"
              />
            </div>
          ))}
          <TextField
            label="Descripcion"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline
            minRows={2}
            size="small"
            fullWidth
          />
          <div className="admin-crud__row">
            <TextField
              label="Desde"
              type="date"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
            <TextField
              label="Hasta"
              type="date"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
          </div>
          <Typography variant="subtitle2">Horario opcional</Typography>
          <div className="admin-crud__row">
            <TextField
              label="Desde hora"
              type="time"
              value={form.startsTime}
              onChange={(e) => setForm({ ...form, startsTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
            <TextField
              label="Hasta hora"
              type="time"
              value={form.endsTime}
              onChange={(e) => setForm({ ...form, endsTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
          </div>
          <div>
            {[
              "Domingo",
              "Lunes",
              "Martes",
              "Miercoles",
              "Jueves",
              "Viernes",
              "Sabado",
            ].map((day, index) => (
              <FormControlLabel
                key={day}
                control={
                  <Checkbox
                    checked={form.daysOfWeek.includes(index)}
                    onChange={() =>
                      setForm({
                        ...form,
                        daysOfWeek: form.daysOfWeek.includes(index)
                          ? form.daysOfWeek.filter((value) => value !== index)
                          : [...form.daysOfWeek, index],
                      })
                    }
                  />
                }
                label={day}
              />
            ))}
          </div>
          <div className="admin-crud__actions">
            {originalPrice > 0 ? (
              <Chip
                label={`Precio normal: ${money.format(originalPrice)}`}
                size="small"
              />
            ) : null}
            <Button
              variant="contained"
              onClick={() => void create()}
              disabled={!valid}
            >
              Crear promocion
            </Button>
          </div>
        </div>
      </Paper>
      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner">
          <Typography component="h2" className="admin-crud__section-title">
            Promociones existentes
          </Typography>
        </div>
        <TableContainer>
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Promocion</TableCell>
                <TableCell>Productos</TableCell>
                <TableCell>Horario</TableCell>
                <TableCell>Precios</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {promotions.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell>
                    <Typography fontWeight={900}>{promotion.name}</Typography>
                  </TableCell>
                  <TableCell>
                    {promotion.items
                      .map((item) => `${item.quantity}x ${item.name}`)
                      .join(", ")}
                  </TableCell>
                  <TableCell>
                    {promotion.startsTime || promotion.endsTime
                      ? `${promotion.startsTime || "00:00"} - ${promotion.endsTime || "23:59"}`
                      : "Todo el dia"}
                    {promotion.daysOfWeek?.length
                      ? ` (${promotion.daysOfWeek.map((day) => ["D", "L", "M", "X", "J", "V", "S"][day]).join(", ")})`
                      : ""}
                  </TableCell>
                  <TableCell>
                    <s>{money.format(promotion.originalPrice)}</s>{" "}
                    <strong>{money.format(promotion.promotionalPrice)}</strong>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        Number(promotion.active) === 1 ? "Activa" : "Inactiva"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      color="error"
                      onClick={() => void remove(promotion.id)}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!promotions.length ? (
                <TableRow>
                  <TableCell colSpan={5}>Sin promociones.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}
