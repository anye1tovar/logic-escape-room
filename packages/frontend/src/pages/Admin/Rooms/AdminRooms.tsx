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

type RoomRow = {
  id: number;
  name: string;
  description: string | null;
  theme: string | null;
  min_players: number | null;
  max_players: number | null;
  min_age: number | null;
  duration_minutes: number | null;
  difficulty: number | null;
  active: number | null;
};

type FormState = {
  name: string;
  description: string;
  theme: string;
  minPlayers: string;
  maxPlayers: string;
  minAge: string;
  durationMinutes: string;
  difficulty: string;
  active: "1" | "0";
};

export default function AdminRooms() {
  const [rows, setRows] = useState<RoomRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    theme: "",
    minPlayers: "",
    maxPlayers: "",
    minAge: "",
    durationMinutes: "",
    difficulty: "",
    active: "1",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.id - a.id), [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<RoomRow[]>("/api/admin/rooms");
      setRows(data);
      setStatus({ type: "idle" });
    } catch {
      setStatus({ type: "error", message: "No se pudieron cargar las salas." });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/rooms", {
        method: "POST",
        body: {
          name: form.name,
          description: form.description || null,
          theme: form.theme || null,
          minPlayers: form.minPlayers ? Number(form.minPlayers) : null,
          maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : null,
          minAge: form.minAge ? Number(form.minAge) : null,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
          difficulty: form.difficulty ? Number(form.difficulty) : null,
          active: form.active === "1" ? 1 : 0,
        },
      });
      setForm((s) => ({ ...s, name: "" }));
      setStatus({ type: "success", message: "Sala creada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo crear la sala." });
    }
  }

  async function update(row: RoomRow) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/rooms/${row.id}`, {
        method: "PUT",
        body: {
          name: row.name,
          description: row.description,
          theme: row.theme,
          minPlayers: row.min_players,
          maxPlayers: row.max_players,
          minAge: row.min_age,
          durationMinutes: row.duration_minutes,
          difficulty: row.difficulty,
          active: row.active ?? 1,
        },
      });
      setStatus({ type: "success", message: "Sala actualizada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo actualizar la sala." });
    }
  }

  async function remove(id: number) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/rooms/${id}`, { method: "DELETE" });
      setStatus({ type: "success", message: "Sala eliminada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar la sala." });
    }
  }

  const confirmDeleteRow = rows.find((row) => row.id === confirmDeleteId) || null;

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Salas
          </Typography>
          <Typography className="admin-crud__subtitle">
            Gestiona la tabla `rooms`.
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
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label="Tema"
              value={form.theme}
              onChange={(e) => setForm((s) => ({ ...s, theme: e.target.value }))}
              size="small"
              fullWidth
            />
          </div>
          <TextField
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            size="small"
            fullWidth
          />
          <div className="admin-crud__row">
            <TextField
              label="Min jugadores"
              value={form.minPlayers}
              onChange={(e) => setForm((s) => ({ ...s, minPlayers: e.target.value }))}
              inputProps={{ inputMode: "numeric" }}
              size="small"
              fullWidth
            />
            <TextField
              label="Max jugadores"
              value={form.maxPlayers}
              onChange={(e) => setForm((s) => ({ ...s, maxPlayers: e.target.value }))}
              inputProps={{ inputMode: "numeric" }}
              size="small"
              fullWidth
            />
          </div>
          <div className="admin-crud__row">
            <TextField
              label="Edad mínima"
              value={form.minAge}
              onChange={(e) => setForm((s) => ({ ...s, minAge: e.target.value }))}
              inputProps={{ inputMode: "numeric" }}
              size="small"
              fullWidth
            />
            <TextField
              label="Duración (min)"
              value={form.durationMinutes}
              onChange={(e) =>
                setForm((s) => ({ ...s, durationMinutes: e.target.value }))
              }
              inputProps={{ inputMode: "numeric" }}
              size="small"
              fullWidth
            />
          </div>
          <div className="admin-crud__row">
            <TextField
              label="Dificultad (1..3)"
              value={form.difficulty}
              onChange={(e) => setForm((s) => ({ ...s, difficulty: e.target.value }))}
              inputProps={{ inputMode: "numeric" }}
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
              <MenuItem value="1">Sí</MenuItem>
              <MenuItem value="0">No</MenuItem>
            </Select>
          </div>
          <div className="admin-crud__actions">
            <Button
              variant="contained"
              onClick={() => void create()}
              disabled={status.type === "loading" || !form.name.trim()}
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
                <TableCell>Nombre</TableCell>
                <TableCell>Activa</TableCell>
                <TableCell>Min/Max</TableCell>
                <TableCell>Duración</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
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
                  <TableCell>
                    <Select
                      value={String(r.active ?? 1)}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, active: e.target.value === "1" ? 1 : 0 }
                              : x
                          )
                        )
                      }
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="1">Sí</MenuItem>
                      <MenuItem value="0">No</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        value={r.min_players ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, min_players: Number(e.target.value) }
                                : x
                            )
                          )
                        }
                        inputProps={{ inputMode: "numeric" }}
                        size="small"
                      />
                      <TextField
                        value={r.max_players ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, max_players: Number(e.target.value) }
                                : x
                            )
                          )
                        }
                        inputProps={{ inputMode: "numeric" }}
                        size="small"
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={r.duration_minutes ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, duration_minutes: Number(e.target.value) }
                              : x
                          )
                        )
                      }
                      inputProps={{ inputMode: "numeric" }}
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
                  <TableCell colSpan={5}>Sin registros.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog
        open={confirmDeleteId != null}
        onClose={() => setConfirmDeleteId(null)}
        aria-labelledby="confirm-delete-room-title"
      >
        <DialogTitle id="confirm-delete-room-title">
          Confirmar eliminacion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDeleteRow
              ? `¿Eliminar la sala "${confirmDeleteRow.name}"?`
              : "¿Eliminar esta sala?"}
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
