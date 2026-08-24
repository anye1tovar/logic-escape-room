import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
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
  cover_image: string | null;
  video_url: string | null;
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
  coverImage: string;
  videoUrl: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  theme: "",
  minPlayers: "",
  maxPlayers: "",
  minAge: "",
  durationMinutes: "",
  difficulty: "",
  active: "1",
  coverImage: "",
  videoUrl: "",
};

function toForm(row: RoomRow): FormState {
  return {
    name: row.name,
    description: row.description ?? "",
    theme: row.theme ?? "",
    minPlayers: row.min_players == null ? "" : String(row.min_players),
    maxPlayers: row.max_players == null ? "" : String(row.max_players),
    minAge: row.min_age == null ? "" : String(row.min_age),
    durationMinutes:
      row.duration_minutes == null ? "" : String(row.duration_minutes),
    difficulty: row.difficulty == null ? "" : String(row.difficulty),
    active: String(row.active ?? 1) === "0" ? "0" : "1",
    coverImage: fileNameOnly(row.cover_image),
    videoUrl: row.video_url ?? "",
  };
}

function fileNameOnly(value: string | null | undefined) {
  const normalized = value?.trim().replace(/[?#].*$/, "").replace(/\\/g, "/");
  return normalized?.split("/").filter(Boolean).pop() ?? "";
}

function toPayload(form: FormState) {
  return {
    name: form.name,
    description: form.description || null,
    theme: form.theme || null,
    coverImage: fileNameOnly(form.coverImage) || null,
    minPlayers: form.minPlayers ? Number(form.minPlayers) : null,
    maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : null,
    minAge: form.minAge ? Number(form.minAge) : null,
    durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
    difficulty: form.difficulty ? Number(form.difficulty) : null,
    active: form.active === "1" ? 1 : 0,
    videoUrl: form.videoUrl || null,
  };
}

function sameForm(a: FormState | null, b: FormState) {
  return a != null && JSON.stringify(a) === JSON.stringify(b);
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

export default function AdminRooms() {
  const [rows, setRows] = useState<RoomRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingRoom, setEditingRoom] = useState<RoomRow | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [savedEditForm, setSavedEditForm] = useState<FormState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.id - a.id), [rows]);
  const hasEditChanges = !sameForm(savedEditForm, editForm);
  const editImagePreviewSrc = buildPublicImagePath(editForm.coverImage, "rooms");

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
        body: toPayload(form),
      });
      setForm(emptyForm);
      setStatus({ type: "success", message: "Sala creada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo crear la sala." });
    }
  }

  async function update(id: number, nextForm: FormState) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/rooms/${id}`, {
        method: "PUT",
        body: toPayload(nextForm),
      });
      setStatus({ type: "success", message: "Sala actualizada." });
      closeEditor(true);
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

  function openEditor(row: RoomRow) {
    const nextForm = toForm(row);
    setEditingRoom(row);
    setEditForm(nextForm);
    setSavedEditForm(nextForm);
  }

  function closeEditor(force = false) {
    if (
      !force &&
      hasEditChanges &&
      !window.confirm("Hay cambios sin guardar. Cerrar?")
    ) {
      return;
    }
    setEditingRoom(null);
    setEditForm(emptyForm);
    setSavedEditForm(null);
  }

  const confirmDeleteRow =
    rows.find((row) => row.id === confirmDeleteId) || null;

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Salas
          </Typography>
          <Typography className="admin-crud__subtitle">
            Gestiona la tabla rooms.
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
          <div className="admin-crud__section-header">
            <Typography component="h2" className="admin-crud__section-title">
              Crear sala
            </Typography>
          </div>
          <RoomForm form={form} setForm={setForm} />
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
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Sala</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Jugadores</TableCell>
                <TableCell>Duracion</TableCell>
                <TableCell>Dificultad</TableCell>
                <TableCell>Video</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell className="admin-crud__cell--wrap">
                    <Typography fontWeight={900}>{r.name}</Typography>
                    {r.theme ? (
                      <Typography className="admin-crud__muted">
                        {r.theme}
                      </Typography>
                    ) : null}
                    {r.description ? (
                      <Typography className="admin-crud__clamp">
                        {r.description}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Chip
                      label={Number(r.active ?? 1) === 1 ? "Activa" : "Inactiva"}
                      color={Number(r.active ?? 1) === 1 ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    {r.min_players ?? "-"} / {r.max_players ?? "-"}
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    {r.duration_minutes == null
                      ? "-"
                      : `${r.duration_minutes} min`}
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    {r.difficulty ?? "-"}
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    {r.video_url ? (
                      <Button
                        href={r.video_url}
                        target="_blank"
                        rel="noreferrer"
                        size="small"
                        variant="outlined"
                      >
                        Abrir
                      </Button>
                    ) : (
                      <Typography className="admin-crud__muted">
                        Sin video
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => openEditor(r)}
                        disabled={status.type === "loading"}
                      >
                        Editar
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
                  <TableCell colSpan={7}>Sin registros.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Drawer
        anchor="right"
        open={editingRoom != null}
        onClose={() => closeEditor()}
        PaperProps={{ className: "admin-crud__drawer" }}
      >
        <div className="admin-crud__drawer-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Editar sala
            </Typography>
            <Typography fontWeight={900}>{editingRoom?.name}</Typography>
          </div>
          <Chip
            label={hasEditChanges ? "Cambios sin guardar" : "Sin cambios"}
            color={hasEditChanges ? "warning" : "default"}
            size="small"
          />
        </div>
        <div className="admin-crud__drawer-content">
          {editImagePreviewSrc ? (
            <div className="admin-crud__image-preview">
              <img src={editImagePreviewSrc} alt={editForm.name || "Sala"} />
            </div>
          ) : null}
          <RoomForm form={editForm} setForm={setEditForm} multiline />
        </div>
        <div className="admin-crud__drawer-actions">
          <Button
            variant="outlined"
            onClick={() => closeEditor()}
            disabled={status.type === "loading"}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editingRoom) return;
              void update(editingRoom.id, editForm);
            }}
            disabled={
              status.type === "loading" ||
              !editForm.name.trim() ||
              !hasEditChanges
            }
          >
            Guardar sala
          </Button>
        </div>
      </Drawer>

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
              ? `Eliminar la sala "${confirmDeleteRow.name}"?`
              : "Eliminar esta sala?"}
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

function RoomForm({
  form,
  setForm,
  multiline = false,
}: {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
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
          label="Tema"
          value={form.theme}
          onChange={(e) => setForm((s) => ({ ...s, theme: e.target.value }))}
          size="small"
          fullWidth
        />
      </div>
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
      <div className="admin-crud__row">
        <TextField
          label="Imagen (nombre de archivo)"
          value={form.coverImage}
          onChange={(e) =>
            setForm((s) => ({ ...s, coverImage: fileNameOnly(e.target.value) }))
          }
          placeholder="portal.webp"
          size="small"
          fullWidth
        />
        <TextField
          label="Video YouTube"
          value={form.videoUrl}
          onChange={(e) =>
            setForm((s) => ({ ...s, videoUrl: e.target.value }))
          }
          placeholder="https://youtube.com/shorts/..."
          size="small"
          fullWidth
        />
      </div>
      <div className="admin-crud__row admin-crud__row--four">
        <TextField
          label="Min jugadores"
          value={form.minPlayers}
          onChange={(e) =>
            setForm((s) => ({ ...s, minPlayers: e.target.value }))
          }
          inputProps={{ inputMode: "numeric" }}
          size="small"
          fullWidth
        />
        <TextField
          label="Max jugadores"
          value={form.maxPlayers}
          onChange={(e) =>
            setForm((s) => ({ ...s, maxPlayers: e.target.value }))
          }
          inputProps={{ inputMode: "numeric" }}
          size="small"
          fullWidth
        />
        <TextField
          label="Edad minima"
          value={form.minAge}
          onChange={(e) => setForm((s) => ({ ...s, minAge: e.target.value }))}
          inputProps={{ inputMode: "numeric" }}
          size="small"
          fullWidth
        />
        <TextField
          label="Duracion"
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
          label="Dificultad"
          value={form.difficulty}
          onChange={(e) =>
            setForm((s) => ({ ...s, difficulty: e.target.value }))
          }
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
          <MenuItem value="1">Activa</MenuItem>
          <MenuItem value="0">Inactiva</MenuItem>
        </Select>
      </div>
    </div>
  );
}
