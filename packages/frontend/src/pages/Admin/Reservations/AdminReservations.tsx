import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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

function formatRowDateTime(r: ReservationRow) {
  const dt = parseRowDateTime(r.date, r.start_time);
  if (dt) return dt.format("YYYY-MM-DD HH:mm");
  const time = String(r.start_time || "").trim();
  return `${String(r.date || "").trim()}${time ? ` ${time}` : ""}`.trim();
}

type ReservationsPageResponse = {
  filters: { dateFrom: string; dateTo: string; search: string };
  records: ReservationRow[];
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
};

export default function AdminReservations() {
  const { i18n } = useTranslation();
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState<Dayjs | null>(() =>
    dayjs()
  );
  const [filterDateTo, setFilterDateTo] = useState<Dayjs | null>(() => dayjs());
  const [filterSearch, setFilterSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const pickerLocale = useMemo(() => {
    const lang = i18n.language || "es";
    return lang.startsWith("en") ? "en" : "es";
  }, [i18n.language]);

  const pickerLocaleText = useMemo(() => {
    const base = pickerLocale === "en" ? enUS : esES;
    return base.components.MuiLocalizationProvider.defaultProps.localeText;
  }, [pickerLocale]);

  const filterDateFromString = useMemo(() => {
    if (filterDateFrom && filterDateFrom.isValid())
      return filterDateFrom.format("YYYY-MM-DD");
    return dayjs().format("YYYY-MM-DD");
  }, [filterDateFrom]);

  const filterDateToString = useMemo(() => {
    if (filterDateTo && filterDateTo.isValid())
      return filterDateTo.format("YYYY-MM-DD");
    return dayjs().format("YYYY-MM-DD");
  }, [filterDateTo]);

  const roomNameById = useMemo(() => {
    return new Map(rooms.map((r) => [r.id, r.name]));
  }, [rooms]);

  async function load(input?: {
    filters?: { dateFrom?: string; dateTo?: string; search?: string };
    page?: number;
    pageSize?: number;
  }) {
    setStatus({ type: "loading" });
    try {
      const nextPage = input?.page ?? page;
      const nextPageSize = input?.pageSize ?? pageSize;
      const dateFrom = input?.filters?.dateFrom ?? filterDateFromString;
      const dateTo = input?.filters?.dateTo ?? filterDateToString;
      const search = input?.filters?.search ?? filterSearch.trim();

      const data = await adminRequest<ReservationsPageResponse>(
        "/api/admin/reservations",
        {
          method: "POST",
          body: {
            filters: { dateFrom, dateTo, search },
            page: nextPage,
            pageSize: nextPageSize,
          },
        }
      );

      setRows(data.records || []);
      setPage(Number(data.page) || 1);
      setPageSize(Number(data.size) || nextPageSize);
      setPageCount(Number(data.totalPages) || 1);
      setTotalRecords(Number(data.totalRecords) || 0);
      setFilterDateFrom(dayjs(data.filters?.dateFrom || dateFrom));
      setFilterDateTo(dayjs(data.filters?.dateTo || dateTo));
      setFilterSearch(String(data.filters?.search || search));
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
      await load({
        filters: {
          dateFrom: filterDateFromString,
          dateTo: filterDateToString,
          search: filterSearch.trim(),
        },
        page,
        pageSize,
      });
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
      await load({
        filters: {
          dateFrom: filterDateFromString,
          dateTo: filterDateToString,
          search: filterSearch.trim(),
        },
        page,
        pageSize,
      });
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar la reserva." });
    }
  }

  const confirmDeleteRow = rows.find((row) => row.id === confirmDeleteId) || null;

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Reservas
          </Typography>
          <Typography className="admin-crud__subtitle">
            Filtra por fecha y búsqueda; edita y actualiza el estado.
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
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                sx={{ width: "100%" }}
              >
                <DatePicker
                  label="Desde"
                  value={filterDateFrom}
                  onChange={(value) => setFilterDateFrom(value)}
                  format="YYYY-MM-DD"
                  sx={{ flex: 1 }}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      placeholder: "2026-01-05",
                    },
                  }}
                />
                <DatePicker
                  label="Hasta"
                  value={filterDateTo}
                  onChange={(value) => setFilterDateTo(value)}
                  format="YYYY-MM-DD"
                  sx={{ flex: 1 }}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      placeholder: "2026-01-05",
                    },
                  }}
                />
              </Stack>
            </LocalizationProvider>
            <TextField
              label="Nombre / Teléfono / Código"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Juan / 300 / LGC..."
              size="small"
              fullWidth
            />
          </div>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={() => {
                setPage(1);
                void load({
                  filters: {
                    dateFrom: filterDateFromString,
                    dateTo: filterDateToString,
                    search: filterSearch.trim(),
                  },
                  page: 1,
                  pageSize,
                });
              }}
              disabled={status.type === "loading"}
            >
              Buscar
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                const today = dayjs().format("YYYY-MM-DD");
                setFilterDateFrom(dayjs(today));
                setFilterDateTo(dayjs(today));
                setFilterSearch("");
                setPage(1);
                void load({
                  filters: { dateFrom: today, dateTo: today, search: "" },
                  page: 1,
                  pageSize,
                });
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
                <TableCell sx={{ minWidth: 40 }}>#</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Fecha y Hora</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Sala</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Cliente</TableCell>
                <TableCell sx={{ minWidth: 250 }}>Teléfono</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Pax</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Total</TableCell>
                <TableCell sx={{ minWidth: 380 }}>Notas</TableCell>
                <TableCell sx={{ minWidth: 170 }}>Estado</TableCell>
                <TableCell sx={{ minWidth: 220 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>
                    <Box sx={{ whiteSpace: "nowrap" }}>
                      {formatRowDateTime(r)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {roomNameById.get(r.room_id) || `Sala #${r.room_id}`}
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
                        onClick={() => setConfirmDeleteId(r.id)}
                        disabled={status.type === "loading"}
                        title={fullName(r)}
                      >
                        Eliminar
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {totalRecords === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>Sin registros.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        {totalRecords > 0 ? (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ p: 2, gap: 2, flexWrap: "wrap" }}
          >
            <Typography variant="body2">{`Total: ${totalRecords}`}</Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2">Por página</Typography>
                <Select
                  size="small"
                  value={pageSize}
                  onChange={(e) => {
                    const next =
                      typeof e.target.value === "number"
                        ? e.target.value
                        : Number(e.target.value);
                    if (!Number.isFinite(next) || next <= 0) return;
                    setPageSize(next);
                    setPage(1);
                    void load({
                      filters: {
                        dateFrom: filterDateFromString,
                        dateTo: filterDateToString,
                        search: filterSearch.trim(),
                      },
                      page: 1,
                      pageSize: next,
                    });
                  }}
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </Box>
              <Pagination
                count={pageCount}
                page={Math.min(page, pageCount)}
                onChange={(_, next) => {
                  setPage(next);
                  void load({
                    filters: {
                      dateFrom: filterDateFromString,
                      dateTo: filterDateToString,
                      search: filterSearch.trim(),
                    },
                    page: next,
                    pageSize,
                  });
                }}
                color="primary"
                variant="outlined"
                shape="rounded"
              />
            </Stack>
          </Stack>
        ) : null}
      </Paper>
      <Dialog
        open={confirmDeleteId != null}
        onClose={() => setConfirmDeleteId(null)}
        aria-labelledby="confirm-delete-reservation-title"
      >
        <DialogTitle id="confirm-delete-reservation-title">
          Confirmar eliminacion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDeleteRow
              ? `¿Eliminar la reserva #${confirmDeleteRow.id} (${fullName(
                  confirmDeleteRow
                )})?`
              : "¿Eliminar esta reserva?"}
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
