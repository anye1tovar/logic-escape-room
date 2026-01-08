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
  Paper,
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

type SettingRow = { key: string; value: string };

export default function AdminSettings() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.key.localeCompare(b.key)),
    [rows]
  );

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<SettingRow[]>("/api/admin/settings");
      setRows(data);
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar las configuraciones.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function upsert(key: string, value: string) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: { value },
      });
      setStatus({ type: "success", message: "Configuración guardada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo guardar la configuración." });
    }
  }

  async function remove(key: string) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      setStatus({ type: "success", message: "Configuración eliminada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar la configuración." });
    }
  }

  const confirmDeleteRow = rows.find((row) => row.key === confirmDeleteKey) || null;

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Configuraciones
          </Typography>
          <Typography className="admin-crud__subtitle">
            Gestiona la tabla `settings`.
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
              label="Key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="whatsapp_number"
              size="small"
              fullWidth
            />
            <TextField
              label="Value"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder="+57..."
              size="small"
              fullWidth
            />
          </div>
          <div className="admin-crud__actions">
            <Button
              variant="contained"
              onClick={() => void upsert(keyInput, valueInput)}
              disabled={status.type === "loading" || !keyInput.trim()}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.key} hover>
                  <TableCell>{r.key}</TableCell>
                  <TableCell>
                    <TextField
                      value={r.value}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.key === r.key ? { ...x, value: e.target.value } : x
                          )
                        )
                      }
                      size="small"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => void upsert(r.key, r.value)}
                        disabled={status.type === "loading"}
                      >
                        Guardar
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setConfirmDeleteKey(r.key)}
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
                  <TableCell colSpan={3}>Sin registros.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog
        open={confirmDeleteKey != null}
        onClose={() => setConfirmDeleteKey(null)}
        aria-labelledby="confirm-delete-setting-title"
      >
        <DialogTitle id="confirm-delete-setting-title">
          Confirmar eliminacion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDeleteRow
              ? `¿Eliminar la configuracion "${confirmDeleteRow.key}"?`
              : "¿Eliminar esta configuracion?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteKey(null)}
            disabled={status.type === "loading"}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (!confirmDeleteKey) return;
              const keyValue = confirmDeleteKey;
              setConfirmDeleteKey(null);
              void remove(keyValue);
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
