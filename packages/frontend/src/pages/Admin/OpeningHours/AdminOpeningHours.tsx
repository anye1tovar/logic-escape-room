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
  TextField,
  Typography,
} from "@mui/material";
import "../adminCrud.scss";

type OpeningHour = {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isOpen: number;
};

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function AdminOpeningHours() {
  const [rows, setRows] = useState<OpeningHour[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }, [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<OpeningHour[]>("/api/admin/opening-hours");
      setRows(data);
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar los horarios de apertura.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(row: OpeningHour) {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/opening-hours", {
        method: "PUT",
        body: row,
      });
      setStatus({ type: "success", message: "Horario guardado." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo guardar el horario." });
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Horarios de apertura
          </Typography>
          <Typography className="admin-crud__subtitle">
            Gestiona la tabla `opening_hours` (por día 0..6).
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
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Día</TableCell>
                <TableCell>Abre</TableCell>
                <TableCell>Cierra</TableCell>
                <TableCell>Abierto</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.dayOfWeek} hover>
                  <TableCell>
                    {dayNames[r.dayOfWeek] ?? String(r.dayOfWeek)} ({r.dayOfWeek})
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={r.openTime ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.dayOfWeek === r.dayOfWeek
                              ? { ...x, openTime: e.target.value || null }
                              : x
                          )
                        )
                      }
                      size="small"
                      placeholder="09:00"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={r.closeTime ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.dayOfWeek === r.dayOfWeek
                              ? { ...x, closeTime: e.target.value || null }
                              : x
                          )
                        )
                      }
                      size="small"
                      placeholder="19:00"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={String(r.isOpen)}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.dayOfWeek === r.dayOfWeek
                              ? { ...x, isOpen: e.target.value === "1" ? 1 : 0 }
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
                      <Button
                        variant="contained"
                        onClick={() => void save(r)}
                        disabled={status.type === "loading"}
                      >
                        Guardar
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
    </div>
  );
}
