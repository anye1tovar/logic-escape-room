import { Fragment, useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
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
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

type ReservationRow = {
  id: number;
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  actual_duration_ms: number | null;
  consult_code: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  players: number;
  notes: string | null;
  total: number | null;
  status: string;
  is_first_time: number;
  reservation_source?: string | null;
  reprogrammed?: number | boolean | null;
};

function fullName(r: ReservationRow) {
  return `${r.first_name || ""} ${r.last_name || ""}`.trim();
}

type RoomRow = { id: number; name: string };

const COLOMBIA_TIMEZONE = "America/Bogota";
const COLOMBIA_OFFSET = "-05:00";

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

function normalizeDatePart(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function getColombiaTodayDateString() {
  const formatter = new Intl.DateTimeFormat("es-CO", {
    timeZone: COLOMBIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function daysUntilColombia(date: string) {
  const target = normalizeDatePart(date);
  const today = getColombiaTodayDateString();
  if (!target || !today) return null;

  const [ty, tm, td] = target.split("-").map((part) => Number(part));
  const [cy, cm, cd] = today.split("-").map((part) => Number(part));
  if (
    !Number.isFinite(ty) ||
    !Number.isFinite(tm) ||
    !Number.isFinite(td) ||
    !Number.isFinite(cy) ||
    !Number.isFinite(cm) ||
    !Number.isFinite(cd)
  )
    return null;

  const targetUtc = Date.UTC(ty, tm - 1, td);
  const todayUtc = Date.UTC(cy, cm - 1, cd);
  const diff = Math.round((targetUtc - todayUtc) / 86_400_000);
  return Number.isFinite(diff) ? diff : null;
}

function formatDaysUntilColombia(date: string) {
  const diff = daysUntilColombia(date);
  if (diff == null) return "";
  if (diff == 0) return "Hoy";
  if (diff == 1) return "Mañana";
  if (diff > 1) return `En ${diff} días`;
  return `Hace ${Math.abs(diff)} días`;
}

function formatWeekdayColombia(date: string, value: string) {
  const datePart = String(date || "").trim();
  if (!datePart) return "";

  const raw = String(value || "").trim();
  const timePart = /^\d{2}:\d{2}$/.test(raw) ? `${raw}:00` : "";
  const iso = raw.includes("T")
    ? raw
    : timePart
    ? `${datePart}T${timePart}${COLOMBIA_OFFSET}`
    : `${datePart}T12:00:00${COLOMBIA_OFFSET}`;

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";

  const weekday = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    timeZone: COLOMBIA_TIMEZONE,
  }).format(parsed);

  return weekday ? `${weekday[0].toUpperCase()}${weekday.slice(1)}` : "";
}

function formatDurationMs(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "";
  const totalMs = Math.max(0, Math.trunc(value));
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((totalMs % 1000) / 10);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const cs = String(centiseconds).padStart(2, "0");
  return `${mm}:${ss}.${cs}`;
}

function parseDurationToMs(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,4}):([0-5]\d)\.(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const centiseconds = Number(match[3]);
  if (
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    !Number.isFinite(centiseconds)
  )
    return null;
  return minutes * 60_000 + seconds * 1000 + centiseconds * 10;
}

type ReservationsPageResponse = {
  filters: { dateFrom: string; dateTo?: string | null; search: string };
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
  const [filterDateTo, setFilterDateTo] = useState<Dayjs | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [durationDrafts, setDurationDrafts] = useState<Record<number, string>>(
    {}
  );
  const [durationErrors, setDurationErrors] = useState<Record<number, string>>(
    {}
  );
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{
    id: number;
    message: string;
  } | null>(null);

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
    return null;
  }, [filterDateTo]);

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
      const filters = {
        dateFrom,
        ...(dateTo ? { dateTo } : {}),
        search,
      };

      const data = await adminRequest<ReservationsPageResponse>(
        "/api/admin/reservations",
        {
          method: "POST",
          body: {
            filters,
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
      const nextDateTo = data.filters?.dateTo || dateTo;
      setFilterDateTo(nextDateTo ? dayjs(nextDateTo) : null);
      setFilterSearch(String(data.filters?.search || search));
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar las reservas.",
      });
    }
  }

  async function reloadCurrentPage() {
    await load({
      filters: {
        dateFrom: filterDateFromString,
        ...(filterDateToString ? { dateTo: filterDateToString } : {}),
        search: filterSearch.trim(),
      },
      page,
      pageSize,
    });
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

  useEffect(() => {
    if (!rowError) return;
    const timer = setTimeout(() => setRowError(null), 5000);
    return () => clearTimeout(timer);
  }, [rowError]);

  async function save(row: ReservationRow) {
    if (!Number.isFinite(Number(row.room_id)) || Number(row.room_id) <= 0) {
      setStatus({ type: "error", message: "Sala (roomId) es requerida." });
      setRowError({ id: row.id, message: "Sala (roomId) es requerida." });
      await reloadCurrentPage();
      return { ok: false, message: "Sala (roomId) es requerida." };
    }
    if (!Number.isFinite(Number(row.players)) || Number(row.players) <= 0) {
      setStatus({
        type: "error",
        message: "Jugadores debe ser un numero valido.",
      });
      setRowError({
        id: row.id,
        message: "Jugadores debe ser un numero valido.",
      });
      await reloadCurrentPage();
      return { ok: false, message: "Jugadores debe ser un numero valido." };
    }

    const draftValue = durationDrafts[row.id];
    if (draftValue != null) {
      const trimmed = draftValue.trim();
      if (trimmed) {
        const parsed = parseDurationToMs(trimmed);
        if (parsed == null) {
          setDurationErrors((prev) => ({
            ...prev,
            [row.id]: "Formato esperado: MM:SS.hh.",
          }));
          setRowError({ id: row.id, message: "Formato esperado: MM:SS.hh." });
          await reloadCurrentPage();
          return { ok: false, message: "Formato esperado: MM:SS.hh." };
        }
        setDurationErrors((prev) => {
          if (!prev[row.id]) return prev;
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        row.actual_duration_ms = parsed;
      } else {
        setDurationErrors((prev) => {
          if (!prev[row.id]) return prev;
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        row.actual_duration_ms = null;
      }
      setDurationDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
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
          actualDurationMs: row.actual_duration_ms,
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
          ...(filterDateToString ? { dateTo: filterDateToString } : {}),
          search: filterSearch.trim(),
        },
        page,
        pageSize,
      });
      if (rowError?.id === row.id) setRowError(null);
      return { ok: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar la reserva.";
      setStatus({
        type: "error",
        message,
      });
      setRowError({ id: row.id, message });
      await reloadCurrentPage();
      return { ok: false, message };
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
          ...(filterDateToString ? { dateTo: filterDateToString } : {}),
          search: filterSearch.trim(),
        },
        page,
        pageSize,
      });
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar la reserva." });
    }
  }

  const confirmDeleteRow =
    rows.find((row) => row.id === confirmDeleteId) || null;

  const actionsCellSx = {
    position: "sticky" as const,
    right: 0,
    backgroundColor: "rgba(17,24,39,0.98)",
    zIndex: 1,
  };

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
                    ...(filterDateToString
                      ? { dateTo: filterDateToString }
                      : {}),
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
                setFilterDateTo(null);
                setFilterSearch("");
                setPage(1);
                void load({
                  filters: { dateFrom: today, search: "" },
                  page: 1,
                  pageSize,
                });
              }}
              disabled={status.type === "loading"}
            >
              Limpiar
            </Button>
          </Stack>

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
                <TableCell sx={{ width: "1%", whiteSpace: "nowrap" }}>
                  <a
                    href="https://visualtimer.com/timers/multi-stopwatch/"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#ffffff" }}
                  >
                    Tiempo (mm:ss.hh)
                  </a>
                </TableCell>
                <TableCell sx={{ minWidth: 120, ...actionsCellSx }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <TableRow
                    hover
                    sx={
                      rowError?.id === r.id
                        ? { backgroundColor: "rgba(239, 68, 68, 0.15)" }
                        : undefined
                    }
                  >
                    <TableCell>{r.id}</TableCell>
                    <TableCell>
                      {(() => {
                        const weekday = formatWeekdayColombia(
                          r.date,
                          r.start_time
                        );
                        const relativeLabel = formatDaysUntilColombia(r.date);
                        return (
                          <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
                            <LocalizationProvider
                              dateAdapter={AdapterDayjs}
                              adapterLocale={pickerLocale}
                              localeText={pickerLocaleText}
                            >
                              <DateTimePicker
                                value={parseRowDateTime(r.date, r.start_time)}
                                onChange={(value) => {
                                  if (!value || !value.isValid()) return;
                                  const nextDate = value.format("YYYY-MM-DD");
                                  const nextTime = value.format("HH:mm");
                                  setRows((prev) =>
                                    prev.map((x) =>
                                      x.id === r.id
                                        ? {
                                            ...x,
                                            date: nextDate,
                                            start_time: nextTime,
                                            end_time: "",
                                          }
                                        : x
                                    )
                                  );
                                }}
                                format="YYYY-MM-DD HH:mm"
                                slotProps={{
                                  textField: {
                                    size: "small",
                                    fullWidth: true,
                                    placeholder: "2026-01-05 19:00",
                                  },
                                }}
                              />
                            </LocalizationProvider>
                            <Stack flexDirection={"row"} gap={1}>
                              {weekday ? (
                                <Chip label={weekday} size="small" />
                              ) : null}
                              {relativeLabel ? (
                                <Chip
                                  label={relativeLabel}
                                  size="small"
                                  variant="outlined"
                                  color={
                                    relativeLabel === "Hoy" ? "warning" : "info"
                                  }
                                />
                              ) : null}
                            </Stack>
                          </Stack>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.room_id}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, room_id: Number(e.target.value) }
                                : x
                            )
                          )
                        }
                        size="small"
                        fullWidth
                      >
                        {rooms.map((room) => (
                          <MenuItem key={room.id} value={room.id}>
                            {room.name || `Room #${room.id}`}
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
                                    return {
                                      ...x,
                                      players: Math.trunc(parsed),
                                    };
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
                        multiline
                        minRows={3}
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
                    <TableCell sx={{ width: "1%", whiteSpace: "nowrap" }}>
                      <TextField
                        value={
                          durationDrafts[r.id] ??
                          formatDurationMs(r.actual_duration_ms)
                        }
                        onChange={(e) => {
                          setDurationDrafts((prev) => ({
                            ...prev,
                            [r.id]: e.target.value,
                          }));
                          setDurationErrors((prev) => {
                            if (!prev[r.id]) return prev;
                            const next = { ...prev };
                            delete next[r.id];
                            return next;
                          });
                        }}
                        onBlur={(e) => {
                          const trimmed = e.target.value.trim();
                          if (!trimmed) {
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? { ...x, actual_duration_ms: null }
                                  : x
                              )
                            );
                            setDurationDrafts((prev) => {
                              const next = { ...prev };
                              delete next[r.id];
                              return next;
                            });
                            setDurationErrors((prev) => {
                              if (!prev[r.id]) return prev;
                              const next = { ...prev };
                              delete next[r.id];
                              return next;
                            });
                            return;
                          }
                          const parsed = parseDurationToMs(trimmed);
                          if (parsed == null) {
                            setDurationErrors((prev) => ({
                              ...prev,
                              [r.id]: "Formato esperado: MM:SS.hh.",
                            }));
                            return;
                          }
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, actual_duration_ms: parsed }
                                : x
                            )
                          );
                          setDurationDrafts((prev) => {
                            const next = { ...prev };
                            delete next[r.id];
                            return next;
                          });
                          setDurationErrors((prev) => {
                            if (!prev[r.id]) return prev;
                            const next = { ...prev };
                            delete next[r.id];
                            return next;
                          });
                        }}
                        size="small"
                        placeholder="00:00.00"
                        error={Boolean(durationErrors[r.id])}
                        helperText={durationErrors[r.id] || undefined}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        ...actionsCellSx,
                        ...(rowError?.id === r.id
                          ? { backgroundColor: "rgba(127, 29, 29, 0.4)" }
                          : {}),
                      }}
                    >
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          onClick={() => void save(r)}
                          disabled={status.type === "loading"}
                          aria-label="Guardar"
                          title="Guardar"
                          color="primary"
                        >
                          <SaveOutlinedIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => setConfirmDeleteId(r.id)}
                          disabled={status.type === "loading"}
                          aria-label="Eliminar"
                          title={fullName(r)}
                          color="error"
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {rowError?.id === r.id ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        sx={{ backgroundColor: "rgba(239, 68, 68, 0.12)" }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#b91c1c",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            fontSize: { xs: "0.8rem", sm: "0.9rem" },
                          }}
                        >
                          {rowError.message}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))}
              {totalRecords === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>Sin registros.</TableCell>
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
                        ...(filterDateToString
                          ? { dateTo: filterDateToString }
                          : {}),
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
                      ...(filterDateToString
                        ? { dateTo: filterDateToString }
                        : {}),
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
