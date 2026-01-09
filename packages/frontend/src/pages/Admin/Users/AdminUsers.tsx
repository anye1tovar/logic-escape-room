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

type UserRow = {
  id: number;
  email: string;
  name: string | null;
  role: "admin" | "game_master";
  active: boolean | number | string;
  created_at: number | string;
};

type FormState = {
  email: string;
  name: string;
  role: "admin" | "game_master";
  password: string;
  active: "1" | "0";
};

type ResetState = {
  id: number;
  email: string;
  password: string;
};

function normalizeActive(value: UserRow["active"]) {
  return value === true || value === 1 || value === "1";
}

function formatCreatedAt(value: UserRow["created_at"]) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return new Date(numeric).toLocaleString();
}

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const [form, setForm] = useState<FormState>({
    email: "",
    name: "",
    role: "admin",
    password: "",
    active: "1",
  });

  const [resetDialog, setResetDialog] = useState<ResetState | null>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => b.id - a.id);
  }, [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<UserRow[]>("/api/admin/users");
      const normalized = data.map((row) => ({
        ...row,
        active: normalizeActive(row.active),
      }));
      setRows(normalized);
      setStatus({ type: "idle" });
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudieron cargar los usuarios." });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!form.email.trim() || !form.password.trim()) {
      setStatus({
        type: "error",
        message: "Email y contraseña son obligatorios.",
      });
      return;
    }

    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/users", {
        method: "POST",
        body: {
          email: form.email.trim(),
          name: form.name.trim() || null,
          role: form.role,
          password: form.password,
          active: form.active === "1",
        },
      });
      setForm((prev) => ({ ...prev, email: "", name: "", password: "" }));
      setStatus({ type: "success", message: "Usuario creado." });
      await load();
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudo crear el usuario." });
    }
  }

  async function update(row: UserRow) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/users/${row.id}`, {
        method: "PATCH",
        body: {
          name: row.name ?? null,
          role: row.role,
          active: normalizeActive(row.active),
        },
      });
      setStatus({ type: "success", message: "Usuario actualizado." });
      await load();
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudo actualizar el usuario." });
    }
  }

  async function resetPassword() {
    if (!resetDialog) return;
    if (!resetDialog.password.trim()) {
      setStatus({
        type: "error",
        message: "La nueva contraseña es obligatoria.",
      });
      return;
    }

    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/users/${resetDialog.id}/reset-password`, {
        method: "POST",
        body: { password: resetDialog.password },
      });
      setResetDialog(null);
      setStatus({ type: "success", message: "Contraseña actualizada." });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: "No se pudo actualizar la contraseña.",
      });
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Usuarios
          </Typography>
          <Typography className="admin-crud__subtitle">
            Administra cuentas de administracion y Game Master.
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
              label="Email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__row">
            <TextField
              label="Contrasena"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((s) => ({ ...s, password: e.target.value }))
              }
              size="small"
              fullWidth
            />
            <Select
              value={form.role}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  role: e.target.value as FormState["role"],
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="admin">admin</MenuItem>
              <MenuItem value="game_master">game_master</MenuItem>
            </Select>
          </div>

          <div className="admin-crud__row">
            <Select
              value={form.active}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  active: e.target.value as FormState["active"],
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="1">Activo</MenuItem>
              <MenuItem value="0">Inactivo</MenuItem>
            </Select>
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
                <TableCell>Email</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Creado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    <TextField
                      value={row.name ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === row.id ? { ...x, name: e.target.value } : x
                          )
                        )
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.role}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === row.id
                              ? {
                                  ...x,
                                  role: e.target.value as UserRow["role"],
                                }
                              : x
                          )
                        )
                      }
                      size="small"
                    >
                      <MenuItem value="admin">admin</MenuItem>
                      <MenuItem value="game_master">game_master</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={normalizeActive(row.active) ? "1" : "0"}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === row.id
                              ? { ...x, active: e.target.value === "1" }
                              : x
                          )
                        )
                      }
                      size="small"
                    >
                      <MenuItem value="1">Activo</MenuItem>
                      <MenuItem value="0">Inactivo</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>{formatCreatedAt(row.created_at)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => void update(row)}
                        disabled={status.type === "loading"}
                      >
                        Guardar
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() =>
                          setResetDialog({
                            id: row.id,
                            email: row.email,
                            password: "",
                          })
                        }
                        disabled={status.type === "loading"}
                      >
                        Reset pass
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
        open={resetDialog != null}
        onClose={() => setResetDialog(null)}
        aria-labelledby="reset-user-password-title"
      >
        <DialogTitle id="reset-user-password-title">
          Resetear contrasena
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {resetDialog
              ? `Nueva contrasena para ${resetDialog.email}.`
              : "Nueva contrasena."}
          </DialogContentText>
          <TextField
            label="Nueva contrasena"
            type="password"
            fullWidth
            margin="dense"
            value={resetDialog?.password || ""}
            onChange={(e) =>
              setResetDialog((prev) =>
                prev ? { ...prev, password: e.target.value } : prev
              )
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setResetDialog(null)}
            disabled={status.type === "loading"}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void resetPassword()}
            disabled={status.type === "loading"}
          >
            Actualizar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
