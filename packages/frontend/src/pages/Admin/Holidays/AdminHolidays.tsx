import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Button,
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

type HolidayRow = { date: string; name: string | null };

export default function AdminHolidays() {
  const [rows, setRows] = useState<HolidayRow[]>([]);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<HolidayRow[]>("/api/admin/holidays");
      setRows(data);
      setStatus({ type: "idle" });
    } catch {
      setStatus({ type: "error", message: "No se pudieron cargar los festivos." });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/holidays", {
        method: "POST",
        body: { date, name: name || null },
      });
      setDate("");
      setName("");
      setStatus({ type: "success", message: "Festivo creado." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo crear el festivo." });
    }
  }

  async function remove(holidayDate: string) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/holidays/${encodeURIComponent(holidayDate)}`, {
        method: "DELETE",
      });
      setStatus({ type: "success", message: "Festivo eliminado." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar el festivo." });
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Festivos
          </Typography>
          <Typography className="admin-crud__subtitle">
            Gestiona la tabla `colombian_holidays`.
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
              label="Fecha (YYYY-MM-DD)"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="2026-01-01"
              size="small"
              fullWidth
            />

            <TextField
              label="Nombre (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Año nuevo"
              size="small"
              fullWidth
            />
          </div>
          <div className="admin-crud__actions">
            <Button
              variant="contained"
              onClick={() => void create()}
              disabled={status.type === "loading" || !date.trim()}
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
                <TableCell>Fecha</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.date} hover>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.name ?? ""}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => void remove(r.date)}
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
    </div>
  );
}
