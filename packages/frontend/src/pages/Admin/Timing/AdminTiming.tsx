import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import { Alert, Button, Chip, Paper, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import "./AdminTiming.scss";

type ReservationRow = {
  id: number;
  room_id: number;
  date: string;
  start_time: string;
  timer_start_ms?: number | string | null;
  timer_end_ms?: number | string | null;
};

type RoomRow = { id: number; name: string };

type StopEntry = { stopMs: number; startMs: number; elapsedMs: number };
type NotificationEntry = { startMs: number; fired: Record<string, boolean> };

const STOP_STORAGE_KEY = "adminTimerStops";
const NOTIFICATION_STORAGE_KEY = "adminTimerNotifications";
const COLOMBIA_TIMEZONE = "America/Bogota";
const NOTIFICATION_THRESHOLDS = [
  { minutes: 30, remaining: 30 },
  { minutes: 45, remaining: 15 },
  { minutes: 55, remaining: 5 },
  { minutes: 60, remaining: 0 },
] as const;

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

function parseMs(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function formatStartTime(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "--:--";
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  const match = raw.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  return raw;
}

function getRoomChipStyles(roomId: number) {
  if (roomId === 1) return { backgroundColor: "#bbf7d0", color: "#14532d" };
  if (roomId === 2) return { backgroundColor: "#fecaca", color: "#7f1d1d" };
  if (roomId === 3) return { backgroundColor: "#e9d5ff", color: "#4c1d95" };
  return { backgroundColor: "rgba(148, 163, 184, 0.25)", color: "#e2e8f0" };
}

function formatDurationMs(value: number) {
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

function readStopCache(): Record<string, StopEntry> {
  const raw = localStorage.getItem(STOP_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, StopEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readNotificationCache(): Record<string, NotificationEntry> {
  const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, NotificationEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function sanitizeStopCache(
  rows: ReservationRow[],
  cache: Record<string, StopEntry>
) {
  if (!rows.length) return {};
  const rowById = new Map(rows.map((row) => [String(row.id), row]));
  const next: Record<string, StopEntry> = {};
  for (const [key, entry] of Object.entries(cache)) {
    const row = rowById.get(key);
    if (!row) continue;
    const startMs = parseMs(row.timer_start_ms);
    const endMs = parseMs(row.timer_end_ms);
    if (endMs != null) continue;
    if (!entry || !Number.isFinite(entry.elapsedMs)) continue;
    if (startMs == null || entry.startMs !== startMs) continue;
    next[key] = entry;
  }
  return next;
}

function sanitizeNotificationCache(
  rows: ReservationRow[],
  cache: Record<string, NotificationEntry>
) {
  if (!rows.length) return {};
  const rowById = new Map(rows.map((row) => [String(row.id), row]));
  const next: Record<string, NotificationEntry> = {};
  for (const [key, entry] of Object.entries(cache)) {
    const row = rowById.get(key);
    if (!row) continue;
    const startMs = parseMs(row.timer_start_ms);
    const endMs = parseMs(row.timer_end_ms);
    if (endMs != null) continue;
    if (!entry || !Number.isFinite(entry.startMs)) continue;
    if (startMs == null || entry.startMs !== startMs) continue;
    next[key] = entry;
  }
  return next;
}

export default function AdminTiming() {
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [stopCache, setStopCache] = useState<Record<string, StopEntry>>(() =>
    readStopCache()
  );
  const [notificationCache, setNotificationCache] = useState<
    Record<string, NotificationEntry>
  >(() => readNotificationCache());
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });
  const [now, setNow] = useState(() => Date.now());

  const roomMap = useMemo(() => {
    return new Map(rooms.map((room) => [room.id, room.name]));
  }, [rooms]);

  const today = useMemo(() => getColombiaTodayDateString(), []);

  useEffect(() => {
    localStorage.setItem(STOP_STORAGE_KEY, JSON.stringify(stopCache));
  }, [stopCache]);

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(notificationCache)
    );
  }, [notificationCache]);

  const hasRunning = useMemo(() => {
    return rows.some((row) => {
      const startMs = parseMs(row.timer_start_ms);
      const endMs = parseMs(row.timer_end_ms);
      if (startMs == null || endMs != null) return false;
      return !stopCache[String(row.id)];
    });
  }, [rows, stopCache]);

  useEffect(() => {
    if (!hasRunning) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [hasRunning]);

  async function load(options?: { silent?: boolean }) {
    const silent = Boolean(options?.silent);
    if (!silent) setStatus({ type: "loading" });
    try {
      const data = await adminRequest<{
        records: ReservationRow[];
      }>("/api/admin/reservations", {
        method: "POST",
        body: {
          filters: { dateFrom: today, dateTo: today, search: "" },
          page: 1,
          pageSize: 200,
        },
      });
      const records = data.records || [];
      setRows(records);
      setStopCache((prev) => sanitizeStopCache(records, prev));
      setNotificationCache((prev) =>
        sanitizeNotificationCache(records, prev)
      );
      if (!silent) setStatus({ type: "idle" });
    } catch {
      if (!silent)
        setStatus({ type: "error", message: "No se pudieron cargar las salas." });
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

  useEffect(() => {
    const timer = setInterval(() => void load({ silent: true }), 30_000);
    return () => clearInterval(timer);
  }, [today]);

  function getStopEntry(rowId: number) {
    return stopCache[String(rowId)] || null;
  }

  function getNotificationEntry(rowId: number) {
    return notificationCache[String(rowId)] || null;
  }

  function setStopEntry(rowId: number, entry: StopEntry | null) {
    setStopCache((prev) => {
      const next = { ...prev };
      const key = String(rowId);
      if (entry) {
        next[key] = entry;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  function setNotificationEntry(
    rowId: number,
    entry: NotificationEntry | null
  ) {
    setNotificationCache((prev) => {
      const next = { ...prev };
      const key = String(rowId);
      if (entry) {
        next[key] = entry;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  function isRunning(row: ReservationRow) {
    const startMs = parseMs(row.timer_start_ms);
    const endMs = parseMs(row.timer_end_ms);
    if (startMs == null || endMs != null) return false;
    return !getStopEntry(row.id);
  }

  function getElapsedMs(row: ReservationRow) {
    const startMs = parseMs(row.timer_start_ms);
    if (startMs == null) return 0;
    const endMs = parseMs(row.timer_end_ms);
    if (endMs != null) return Math.max(0, endMs - startMs);
    const stopEntry = getStopEntry(row.id);
    if (stopEntry) return Math.max(0, stopEntry.elapsedMs);
    return Math.max(0, now - startMs);
  }

  async function startTimer(row: ReservationRow, options?: { reset?: boolean }) {
    const stopEntry = getStopEntry(row.id);
    const reset = Boolean(options?.reset);
    const baseNow = Date.now();
    const startMs =
      !reset && stopEntry
        ? Math.max(0, baseNow - stopEntry.elapsedMs)
        : baseNow;

    if (typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }

    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/reservations/${row.id}/timer/start`, {
        method: "POST",
        body: { startMs },
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, timer_start_ms: startMs, timer_end_ms: null }
            : r
        )
      );
      setStopEntry(row.id, null);
      const existingNotification = getNotificationEntry(row.id);
      if (
        !reset &&
        existingNotification &&
        existingNotification.startMs === startMs
      ) {
        setNotificationEntry(row.id, existingNotification);
      } else {
        setNotificationEntry(row.id, { startMs, fired: {} });
      }
      setStatus({
        type: "success",
        message: reset
          ? "Cronometro reiniciado."
          : "Cronometro iniciado.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar.";
      setStatus({ type: "error", message });
    }
  }

  function stopTimer(row: ReservationRow) {
    const startMs = parseMs(row.timer_start_ms);
    if (startMs == null) return;
    const stopMs = Date.now();
    setStopEntry(row.id, {
      stopMs,
      startMs,
      elapsedMs: Math.max(0, stopMs - startMs),
    });
  }

  async function saveTimer(row: ReservationRow) {
    const stopEntry = getStopEntry(row.id);
    if (!stopEntry) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/reservations/${row.id}/timer/save`, {
        method: "POST",
        body: { endMs: stopEntry.stopMs },
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, timer_end_ms: stopEntry.stopMs }
            : r
        )
      );
      setStopEntry(row.id, null);
      setNotificationEntry(row.id, null);
      setStatus({ type: "success", message: "Tiempo guardado." });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar.";
      setStatus({ type: "error", message });
    }
  }

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!hasRunning) return;

    const updates: Array<[string, NotificationEntry]> = [];

    rows.forEach((row) => {
      if (!isRunning(row)) return;
      const startMs = parseMs(row.timer_start_ms);
      if (startMs == null) return;
      const elapsedMs = getElapsedMs(row);
      const elapsedMinutes = Math.floor(elapsedMs / 60_000);
      const roomName =
        roomMap.get(row.room_id) || `Sala #${row.room_id || row.id}`;
      const roomTime = formatStartTime(row.start_time);
      const cacheEntry =
        getNotificationEntry(row.id) || { startMs, fired: {} };
      let didUpdate = false;

      if (cacheEntry.startMs !== startMs) {
        cacheEntry.startMs = startMs;
        cacheEntry.fired = {};
        didUpdate = true;
      }

      let highestMet: (typeof NOTIFICATION_THRESHOLDS)[number] | null = null;
      NOTIFICATION_THRESHOLDS.forEach((threshold) => {
        const key = String(threshold.minutes);
        if (cacheEntry.fired[key]) return;
        if (elapsedMinutes < threshold.minutes) return;
        highestMet = threshold;
      });

      if (highestMet) {
        const message =
          highestMet.remaining > 0
            ? `Alerta: ${roomName} ${roomTime}. Quedan ${highestMet.remaining} minutos de juego`
            : `Alerta: ${roomName} ${roomTime}. Se acabó el tiempo`;

        try {
          new Notification("Alerta", { body: message });
        } catch {
          return;
        }

        NOTIFICATION_THRESHOLDS.forEach((threshold) => {
          if (threshold.minutes <= highestMet.minutes) {
            cacheEntry.fired[String(threshold.minutes)] = true;
          }
        });
        didUpdate = true;
      }

      if (didUpdate) {
        updates.push([String(row.id), cacheEntry]);
      }
    });

    if (!updates.length) return;
    setNotificationCache((prev) => {
      const next = { ...prev };
      updates.forEach(([key, entry]) => {
        next[key] = entry;
      });
      return next;
    });
  }, [now, rows, roomMap, hasRunning, stopCache, notificationCache]);

  return (
    <div className="admin-timing">
      <header className="admin-timing__header">
        <div>
          <Typography component="h1" className="admin-timing__title">
            Cronometraje
          </Typography>
          <Typography className="admin-timing__subtitle">
            Salas reservadas para hoy: {today || "sin fecha"}.
          </Typography>
        </div>
        <div className="admin-timing__header-actions">
          <Button
            variant="outlined"
            onClick={() => void load()}
            disabled={status.type === "loading"}
          >
            Actualizar
          </Button>
        </div>
      </header>

      {status.type === "error" ? (
        <Alert severity="error">{status.message}</Alert>
      ) : null}
      {status.type === "success" ? (
        <Alert severity="success">{status.message}</Alert>
      ) : null}

      <div className="admin-timing__grid">
        {rows.map((row) => {
          const roomName =
            roomMap.get(row.room_id) || `Sala #${row.room_id || row.id}`;
          const elapsed = getElapsedMs(row);
          const running = isRunning(row);
          const stopEntry = getStopEntry(row.id);
          const saved = parseMs(row.timer_end_ms) != null;
          const canSave = Boolean(stopEntry);
          const canStart = !running && !saved;
          const canReset = parseMs(row.timer_start_ms) != null || saved;

          return (
            <Paper key={row.id} className="admin-timing__card">
              <div className="admin-timing__card-header">
                <div className="admin-timing__chip-row">
                  <Chip
                    label={roomName}
                    size="small"
                    sx={{
                      ...getRoomChipStyles(row.room_id),
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={`Hora: ${formatStartTime(row.start_time)}`}
                    size="small"
                    variant="outlined"
                    color="info"
                  />
                </div>
                {saved ? (
                  <span className="admin-timing__badge">Guardado</span>
                ) : null}
              </div>

              <div
                className={[
                  "admin-timing__timer",
                  running ? "is-running" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {formatDurationMs(elapsed)}
              </div>

              <div className="admin-timing__actions">
                <Button
                  variant="contained"
                  color={running ? "error" : "primary"}
                  onClick={() =>
                    running ? stopTimer(row) : void startTimer(row)
                  }
                  disabled={status.type === "loading" || (!running && !canStart)}
                  className="admin-timing__action-button"
                >
                  {running ? <StopIcon /> : <PlayArrowIcon />}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => void startTimer(row, { reset: true })}
                  disabled={status.type === "loading" || !canReset}
                  className="admin-timing__action-button"
                >
                  <RestartAltIcon />
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => void saveTimer(row)}
                  disabled={status.type === "loading" || !canSave}
                  className="admin-timing__action-button"
                >
                  <SaveIcon />
                </Button>
              </div>
            </Paper>
          );
        })}
        {rows.length === 0 && status.type !== "loading" ? (
          <Paper className="admin-timing__empty">
            <Typography>No hay reservas para hoy.</Typography>
          </Paper>
        ) : null}
      </div>
    </div>
  );
}
