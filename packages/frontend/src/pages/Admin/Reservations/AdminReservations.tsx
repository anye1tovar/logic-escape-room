import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Box,
  Button,
  Pagination,
  Paper,
  Select,
  MenuItem,
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
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { enUS, esES } from "@mui/x-date-pickers/locales";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import "dayjs/locale/en";
import "dayjs/locale/es";
import "../adminCrud.scss";

type ReservationRow = {
  id: number;
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  consult_code: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  players: number;
  notes: string | null;
  total: number | null;
  status: string;
  is_first_time: number;
};

function fullName(r: ReservationRow) {
  return `${r.first_name || ""} ${r.last_name || ""}`.trim();
}

type RoomRow = { id: number; name: string };

function parseRowDateTime(date: string, value: string) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.includes("T")) {
    const parsed = dayjs(raw);
    return parsed.isValid() ? parsed : null;
  }
  if (/^\d{2}:\d{2}$/.test(raw)) {
    const parsed = dayjs(`${String(date || "").trim()}T${raw}`);
    return parsed.isValid() ? parsed : null;
  }
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed : null;
}

export default function AdminReservations() {
  const { i18n } = useTranslation();
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [filterDate, setFilterDate] = useState<Dayjs | null>(null);
  const [filterName, setFilterName] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const pickerLocale = useMemo(() => {
    const lang = i18n.language || "es";
    return lang.startsWith("en") ? "en" : "es";
  }, [i18n.language]);

  const pickerLocaleText = useMemo(() => {
    const base = pickerLocale === "en" ? enUS : esES;
    return base.components.MuiLocalizationProvider.defaultProps.localeText;
  }, [pickerLocale]);

  const filterDateString = useMemo(() => {
    if (!filterDate || !filterDate.isValid()) return "";
    return filterDate.format("YYYY-MM-DD");
  }, [filterDate]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.start_time !== b.start_time)
        return b.start_time.localeCompare(a.start_time);
      return b.id - a.id;
    });
  }, [rows]);

  const pageSize = 5;
  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(sorted.length / pageSize));
  }, [sorted.length]);

  const pagedRows = useMemo(() => {
    const safePage = Math.min(Math.max(page, 1), pageCount);
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [page, pageCount, sorted]);

  async function load(filters?: { date?: string; name?: string }) {
    setStatus({ type: "loading" });
    try {
      const base = "/api/admin/reservations";
      const url = new URL(base, window.location.origin);
      if (filters?.date) url.searchParams.set("date", filters.date);
      if (filters?.name) url.searchParams.set("name", filters.name);
      const data = await adminRequest<ReservationRow[]>(
        url.pathname + url.search
      );
      setRows(data);
      setPage(1);
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar las reservas.",
      });
    }
  }

  async function loadRooms() {
    try {
      const data = await adminRequest<Array<{ id: number; name: string }>>(
        "/api/admin/rooms"
      );
      setRooms(
        (data || [])
          .filter((r) => r && Number.isFinite(Number(r.id)))
          .map((r) => ({ id: Number(r.id), name: String(r.name || "") }))
      );
    } catch {
      setRooms([]);
    }
  }

  useEffect(() => {
    void load();
    void loadRooms();
  }, []);

  async function save(row: ReservationRow) {
    if (!Number.isFinite(Number(row.room_id)) || Number(row.room_id) <= 0) {
      setStatus({ type: "error", message: "Sala (roomId) es requerida." });
      return;
    }
    if (!Number.isFinite(Number(row.players)) || Number(row.players) <= 0) {
      setStatus({
        type: "error",
        message: "Jugadores debe ser un número válido.",
      });
      return;
    }

    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/reservations/${row.id}`, {
        method: "PUT",
        body: {
          roomId: row.room_id,
          date: row.date,
          startTime: row.start_time,
          endTime: row.end_time,
          consultCode: row.consult_code,
          firstName: row.first_name,
          lastName: row.last_name,
          phone: row.phone,
          email: row.email,
          players: row.players,
          notes: row.notes,
          total: row.total,
          status: row.status,
          isFirstTime: row.is_first_time,
        },
      });
      setStatus({
        type: "success",
        message: `Reserva #${row.id} actualizada.`,
      });
      await load({ date: filterDateString, name: filterName.trim() });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "No se pudo guardar la reserva.",
      });
    }
  }

  async function remove(id: number) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/reservations/${id}`, { method: "DELETE" });
      setStatus({ type: "success", message: `Reserva #${id} eliminada.` });
      await load({ date: filterDateString, name: filterName.trim() });
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar la reserva." });
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Reservas
          </Typography>
          <Typography className="admin-crud__subtitle">
            Filtra por fecha y nombre; edita y actualiza el estado.
          </Typography>
        </div>
      </header>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__row">
            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale={pickerLocale}
              localeText={pickerLocaleText}
            >
              <DatePicker
                label="Fecha"
                value={filterDate}
                onChange={(value) => setFilterDate(value)}
                format="YYYY-MM-DD"
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    placeholder: "2026-01-05",
                  },
                }}
              />
            </LocalizationProvider>
            <TextField
              label="Nombre / Email / Teléfono"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Juan / gmail / 300..."
              size="small"
              fullWidth
            />
          </div>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={() =>
                void load({ date: filterDateString, name: filterName.trim() })
              }
              disabled={status.type === "loading"}
            >
              Buscar
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setFilterDate(null);
                setFilterName("");
                void load();
              }}
              disabled={status.type === "loading"}
            >
              Limpiar
            </Button>
          </Stack>

          {status.type === "error" ? (
            <Alert severity="error">{status.message}</Alert>
          ) : null}
          {status.type === "success" ? (
            <Alert severity="success">{status.message}</Alert>
          ) : null}
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 2000 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 70 }}>#</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Fecha y Hora</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Sala</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Cliente</TableCell>
                <TableCell sx={{ minWidth: 250 }}>Contacto</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Pax</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Total</TableCell>
                <TableCell sx={{ minWidth: 380 }}>Notas</TableCell>
                <TableCell sx={{ minWidth: 170 }}>Estado</TableCell>
                <TableCell sx={{ minWidth: 220 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>
                    <LocalizationProvider
                      dateAdapter={AdapterDayjs}
                      adapterLocale={pickerLocale}
                      localeText={pickerLocaleText}
                    >
                      <DateTimePicker
                        label="Inicio"
                        value={parseRowDateTime(r.date, r.start_time)}
                        onChange={(value) => {
                          if (!value || !value.isValid()) return;
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? {
                                    ...x,
                                    date: value.format("YYYY-MM-DD"),
                                    start_time: value.format("HH:mm"),
                                  }
                                : x
                            )
                          );
                        }}
                        format="YYYY-MM-DD HH:mm"
                        slotProps={{
                          textField: {
                            size: "small",
                            placeholder: `${r.date} ${String(
                              r.start_time || ""
                            ).trim()}`,
                          },
                        }}
                        disabled
                      />
                    </LocalizationProvider>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.room_id ?? ""}
                      onChange={(e) => {
                        const next =
                          typeof e.target.value === "number"
                            ? e.target.value
                            : Number(e.target.value);
                        if (!Number.isFinite(next) || next <= 0) return;
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, room_id: Math.trunc(next) }
                              : x
                          )
                        );
                      }}
                      size="small"
                      fullWidth
                      displayEmpty
                      disabled
                    >
                      <MenuItem value="">
                        {rooms.length === 0 ? "Cargando..." : "Seleccionar"}
                      </MenuItem>
                      {rooms.map((room) => (
                        <MenuItem key={room.id} value={room.id}>
                          {room.name || `Sala #${room.id}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <TextField
                        value={r.first_name}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, first_name: e.target.value }
                                : x
                            )
                          )
                        }
                        size="small"
                        placeholder="Nombre"
                      />
                      <TextField
                        value={r.last_name}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, last_name: e.target.value }
                                : x
                            )
                          )
                        }
                        size="small"
                        placeholder="Apellido"
                      />
                      {r.consult_code ? (
                        <Box sx={{ opacity: 0.75, fontSize: "0.95rem" }}>
                          {r.consult_code}
                        </Box>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <TextField
                        value={r.email ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, email: e.target.value || null }
                                : x
                            )
                          )
                        }
                        size="small"
                        placeholder="email"
                      />
                      <TextField
                        value={r.phone ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, phone: e.target.value || null }
                                : x
                            )
                          )
                        }
                        size="small"
                        placeholder="teléfono"
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={String(r.players)}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? (() => {
                                  const raw = e.target.value;
                                  const trimmed = raw.trim();
                                  if (!trimmed) return x;
                                  const parsed = Number(trimmed);
                                  if (!Number.isFinite(parsed)) return x;
                                  return { ...x, players: Math.trunc(parsed) };
                                })()
                              : x
                          )
                        )
                      }
                      size="small"
                      type="number"
                      inputProps={{ min: 1, step: 1, inputMode: "numeric" }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={r.total == null ? "" : String(r.total)}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  total: (() => {
                                    const raw = e.target.value;
                                    const trimmed = raw.trim();
                                    if (!trimmed) return null;
                                    const parsed = Number(trimmed);
                                    if (!Number.isFinite(parsed))
                                      return x.total;
                                    return Math.trunc(parsed);
                                  })(),
                                }
                              : x
                          )
                        )
                      }
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: 1, inputMode: "numeric" }}
                      placeholder="COP"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={r.notes ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, notes: e.target.value || null }
                              : x
                          )
                        )
                      }
                      size="small"
                      placeholder="nota..."
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.status}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, status: String(e.target.value) }
                              : x
                          )
                        )
                      }
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="PENDING">PENDING</MenuItem>
                      <MenuItem value="CONFIRMED">CONFIRMED</MenuItem>
                      <MenuItem value="COMPLETED">COMPLETED</MenuItem>
                      <MenuItem value="CANCELLED">CANCELLED</MenuItem>
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
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => void remove(r.id)}
                        disabled={status.type === "loading"}
                        title={fullName(r)}
                      >
                        Eliminar
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>Sin registros.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        {sorted.length > 0 ? (
          <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
            <Pagination
              count={pageCount}
              page={Math.min(page, pageCount)}
              onChange={(_, next) => setPage(next)}
              color="primary"
              variant="outlined"
              shape="rounded"
            />
          </Stack>
        ) : null}
      </Paper>
    </div>
  );
}
