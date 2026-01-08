import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
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
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import "../adminCrud.scss";

type RateRow = {
  id: number;
  day_type: "weekday" | "weekend";
  day_label: string | null;
  day_range: string | null;
  players: number;
  price_per_person: number;
  currency: string;
};

type FormState = {
  dayType: "weekday" | "weekend";
  dayLabel: string;
  dayRange: string;
  players: string;
  pricePerPerson: string;
  currency: string;
};

export default function AdminRates() {
  const [rows, setRows] = useState<RateRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const [form, setForm] = useState<FormState>({
    dayType: "weekday",
    dayLabel: "",
    dayRange: "",
    players: "4",
    pricePerPerson: "30000",
    currency: "COP",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.day_type !== b.day_type) return a.day_type.localeCompare(b.day_type);
      return b.players - a.players;
    });
  }, [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<RateRow[]>("/api/admin/rates");
      setRows(data);
      setStatus({ type: "idle" });
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudieron cargar los precios." });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/rates", {
        method: "POST",
        body: {
          dayType: form.dayType,
          dayLabel: form.dayLabel || null,
          dayRange: form.dayRange || null,
          players: Number(form.players),
          pricePerPerson: Number(form.pricePerPerson),
          currency: form.currency || "COP",
        },
      });
      setStatus({ type: "success", message: "Precio creado." });
      await load();
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudo crear el precio." });
    }
  }

  async function update(row: RateRow) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/rates/${row.id}`, {
        method: "PUT",
        body: {
          dayType: row.day_type,
          dayLabel: row.day_label,
          dayRange: row.day_range,
          players: row.players,
          pricePerPerson: row.price_per_person,
          currency: row.currency,
        },
      });
      setStatus({ type: "success", message: "Precio actualizado." });
      await load();
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudo actualizar el precio." });
    }
  }

  async function remove(id: number) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/rates/${id}`, { method: "DELETE" });
      setStatus({ type: "success", message: "Precio eliminado." });
      await load();
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudo eliminar el precio." });
    }
  }

  const confirmDeleteRow = rows.find((row) => row.id === confirmDeleteId) || null;

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Precios
          </Typography>
          <Typography className="admin-crud__subtitle">
            Gestiona la tabla `rates`.
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

      {status.type === "error" ? <Alert severity="error">{status.message}</Alert> : null}
      {status.type === "success" ? (
        <Alert severity="success">{status.message}</Alert>
      ) : null}

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__row">
            <Select
              value={form.dayType}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  dayType: e.target.value as "weekday" | "weekend",
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="weekday">weekday</MenuItem>
              <MenuItem value="weekend">weekend</MenuItem>
            </Select>

            <TextField
              label="Jugadores"
              value={form.players}
              onChange={(e) => setForm((s) => ({ ...s, players: e.target.value }))}
              inputProps={{ inputMode: "numeric" }}
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__row">
            <TextField
              label="Precio por persona"
              value={form.pricePerPerson}
              onChange={(e) =>
                setForm((s) => ({ ...s, pricePerPerson: e.target.value }))
              }
              inputProps={{ inputMode: "numeric" }}
              size="small"
              fullWidth
            />

            <TextField
              label="Moneda"
              value={form.currency}
              onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__row">
            <TextField
              label="Etiqueta"
              value={form.dayLabel}
              onChange={(e) => setForm((s) => ({ ...s, dayLabel: e.target.value }))}
              size="small"
              fullWidth
            />

            <TextField
              label="Rango"
              value={form.dayRange}
              onChange={(e) => setForm((s) => ({ ...s, dayRange: e.target.value }))}
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__actions">
            <Button
              variant="contained"
              onClick={() => void create()}
              disabled={status.type === "loading"}
            >
              Crear
            </Button>
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Jugadores</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>Rango</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Select
                      value={r.day_type}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  day_type: e.target.value as RateRow["day_type"],
                                }
                              : x
                          )
                        )
                      }
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="weekday">weekday</MenuItem>
                      <MenuItem value="weekend">weekend</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={String(r.players)}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, players: Number(e.target.value) }
                              : x
                          )
                        )
                      }
                      size="small"
                      inputProps={{ inputMode: "numeric" }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={String(r.price_per_person)}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  price_per_person: Number(e.target.value),
                                }
                              : x
                          )
                        )
                      }
                      size="small"
                      inputProps={{ inputMode: "numeric" }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={r.day_label ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, day_label: e.target.value } : x
                          )
                        )
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={r.day_range ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, day_range: e.target.value } : x
                          )
                        )
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
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
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>Sin registros.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog
        open={confirmDeleteId != null}
        onClose={() => setConfirmDeleteId(null)}
        aria-labelledby="confirm-delete-rate-title"
      >
        <DialogTitle id="confirm-delete-rate-title">
          Confirmar eliminacion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDeleteRow
              ? `¿Eliminar el precio ${confirmDeleteRow.day_type} (${confirmDeleteRow.players} jugadores)?`
              : "¿Eliminar este precio?"}
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
