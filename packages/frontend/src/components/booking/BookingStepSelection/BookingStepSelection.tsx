import { useEffect, useMemo, useState } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { enUS, esES } from "@mui/x-date-pickers/locales";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import "dayjs/locale/en";
import "dayjs/locale/es";

import portalImg from "../../../assets/rooms/portal.png";
import canibalImg from "../../../assets/rooms/canibal.png";
import manicomioImg from "../../../assets/rooms/manicomio.png";

type AvailabilitySlot = {
  start: string;
  available: boolean;
  reason?: "too_late" | "booked" | string;
};

type AvailabilityRoom = {
  roomId: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
  difficulty: "easy" | "medium" | "hard" | string;
  slots: AvailabilitySlot[];
};

type AvailabilityResponse = {
  date: string;
  dayType?: "weekday" | "weekend" | string;
  isHoliday?: boolean;
  rates?: Array<{
    players: number;
    price_per_person?: number;
    pricePerPerson?: number;
    currency?: string;
  }>;
  timezone: string;
  serverNow: string;
  minAdvanceMinutes: number;
  rooms: AvailabilityRoom[];
};

export type BookingStep1Output = {
  date: string;
  roomId: string;
  roomName: string;
  durationMinutes: number;
  slotStart: string;
  slotEnd: string;
  peopleCount: number;
};

type BookingStepSelectionProps = {
  className?: string;
  onComplete?: (output: BookingStep1Output) => void;
};

const SLOT_DURATION_MINUTES = 90;

function difficultyLabel(value: AvailabilityRoom["difficulty"]) {
  switch (value) {
    case "easy":
      return "Fácil";
    case "medium":
      return "Media";
    case "hard":
      return "Difícil";
    default:
      return String(value);
  }
}

function formatTime(value: string) {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;
  return parsed.format("HH:mm");
}

function roomImage(roomId: string) {
  switch (roomId) {
    case "portal":
      return portalImg;
    case "canibal":
      return canibalImg;
    case "manicomio":
      return manicomioImg;
    default:
      return portalImg;
  }
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function addMinutesPreservingOffset(isoWithOffset: string, minutes: number) {
  const match = isoWithOffset.match(/([+-])(\d{2}):(\d{2})$/);
  const offsetStr = match ? `${match[1]}${match[2]}:${match[3]}` : "Z";
  const sign = match?.[1] === "-" ? -1 : 1;
  const offsetMinutes = match
    ? sign * (Number(match[2]) * 60 + Number(match[3]))
    : 0;

  const startMs = Date.parse(isoWithOffset);
  const endMs = startMs + minutes * 60_000;

  const shifted = new Date(endMs + offsetMinutes * 60_000);
  const yyyy = shifted.getUTCFullYear();
  const mm = pad2(shifted.getUTCMonth() + 1);
  const dd = pad2(shifted.getUTCDate());
  const hh = pad2(shifted.getUTCHours());
  const min = pad2(shifted.getUTCMinutes());
  const ss = pad2(shifted.getUTCSeconds());

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${offsetStr}`;
}

function formatMoney(value: number | null, locale: string, currency: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function pickRateForPlayers(
  rates: AvailabilityResponse["rates"] | undefined,
  players: number | null
) {
  const count = typeof players === "number" ? players : Number(players);
  if (!Number.isFinite(count) || count <= 0) return null;
  const list = Array.isArray(rates) ? rates : [];
  if (list.length === 0) return null;

  const exact = list.find((r) => Number(r.players) === count);
  if (exact) return exact;

  const sorted = [...list].sort(
    (a, b) => Number(b.players) - Number(a.players)
  );
  const floor = sorted.find((r) => Number(r.players) <= count);
  if (floor) return floor;

  return sorted[sorted.length - 1] || null;
}

export default function BookingStepSelection({
  className,
  onComplete,
}: BookingStepSelectionProps) {
  const { i18n } = useTranslation();
  const pickerLocale = useMemo(() => {
    const lang = i18n.language || "es";
    return lang.startsWith("en") ? "en" : "es";
  }, [i18n.language]);
  const pickerLocaleText = useMemo(() => {
    const base = pickerLocale === "en" ? enUS : esES;
    return base.components.MuiLocalizationProvider.defaultProps.localeText;
  }, [pickerLocale]);

  const today = useMemo(() => dayjs().startOf("day"), []);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(
    null
  );
  const [peopleCount, setPeopleCount] = useState<number | null>(null);

  const selectedRoom = useMemo(() => {
    if (!availability || !selectedRoomId) return null;
    return availability.rooms.find((r) => r.roomId === selectedRoomId) ?? null;
  }, [availability, selectedRoomId]);

  const minPlayers = selectedRoom?.minPlayers ?? 0;
  const maxPlayers = selectedRoom?.maxPlayers ?? 0;
  const locale = i18n.language?.startsWith("en") ? "en-US" : "es-CO";

  const selectedRate = useMemo(
    () => pickRateForPlayers(availability?.rates, peopleCount),
    [availability?.rates, peopleCount]
  );
  const selectedCurrency = selectedRate?.currency || "COP";
  const pricePerPerson = useMemo(() => {
    if (!selectedRate) return null;
    const value = Number(
      selectedRate.price_per_person ?? selectedRate.pricePerPerson ?? NaN
    );
    return Number.isFinite(value) ? value : null;
  }, [selectedRate]);
  const estimatedTotal =
    typeof peopleCount === "number" && typeof pricePerPerson === "number"
      ? peopleCount * pricePerPerson
      : null;

  const canContinue =
    Boolean(selectedDate) &&
    Boolean(selectedRoomId) &&
    Boolean(selectedSlotStart) &&
    typeof peopleCount === "number" &&
    selectedRoom != null &&
    peopleCount >= selectedRoom.minPlayers &&
    peopleCount <= selectedRoom.maxPlayers;

  useEffect(() => {
    dayjs.locale(pickerLocale);
  }, [pickerLocale]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailability(null);
      setSelectedRoomId(null);
      setSelectedSlotStart(null);
      setPeopleCount(null);
      setLoadError(null);
      return;
    }

    const date = selectedDate.format("YYYY-MM-DD");
    const controller = new AbortController();

    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setSelectedRoomId(null);
        setSelectedSlotStart(null);
        setPeopleCount(null);

        const apiBase = import.meta.env.VITE_API_BASE_URL || "";
        const res = await fetch(
          `${apiBase}/api/bookings/availability?date=${encodeURIComponent(
            date
          )}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error || "No pudimos cargar los horarios.");
        }
        const json = (await res.json()) as AvailabilityResponse;
        setAvailability(json);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setAvailability(null);
        setLoadError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [selectedDate]);

  const handleSelectRoom = (room: AvailabilityRoom) => {
    setSelectedRoomId(room.roomId);
    setSelectedSlotStart(null);
    setPeopleCount((current) => {
      if (typeof current !== "number") return room.minPlayers;
      if (current < room.minPlayers) return room.minPlayers;
      if (current > room.maxPlayers) return room.maxPlayers;
      return current;
    });
  };

  const handleSelectSlot = (room: AvailabilityRoom, slot: AvailabilitySlot) => {
    if (!slot.available) return;
    setSelectedRoomId(room.roomId);
    setSelectedSlotStart(slot.start);
    setPeopleCount((current) => {
      if (typeof current !== "number") return room.minPlayers;
      if (current < room.minPlayers) return room.minPlayers;
      if (current > room.maxPlayers) return room.maxPlayers;
      return current;
    });
  };

  const handleContinue = () => {
    if (
      !canContinue ||
      !selectedDate ||
      !selectedRoomId ||
      !selectedSlotStart ||
      typeof peopleCount !== "number"
    )
      return;
    if (!selectedRoom) return;
    const slotEnd = addMinutesPreservingOffset(
      selectedSlotStart,
      SLOT_DURATION_MINUTES
    );

    onComplete?.({
      date: selectedDate.format("YYYY-MM-DD"),
      roomId: selectedRoomId,
      roomName: selectedRoom.name,
      durationMinutes:
        typeof selectedRoom.durationMinutes === "number" &&
        Number.isFinite(selectedRoom.durationMinutes)
          ? selectedRoom.durationMinutes
          : SLOT_DURATION_MINUTES,
      slotStart: selectedSlotStart,
      slotEnd,
      peopleCount,
    });
  };

  return (
    <section className={className}>
      <header className="booking-step__header">
        <h2 className="booking-step__title">1. Selección</h2>
        <p className="booking-step__subtitle">
          Elige la experiencia, cuántas personas vienen y el horario disponible.
        </p>
      </header>

      <div className="booking-step__content">
        <div className="booking-form__section">
          <h3 className="booking-form__section-title">Fecha</h3>
          <div className="booking-form__field">
            <span className="booking-form__label">Selecciona una fecha</span>
            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale={pickerLocale}
              localeText={pickerLocaleText}
            >
              <DatePicker
                value={selectedDate}
                onChange={(value) => setSelectedDate(value)}
                minDate={today}
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiPaper-root": {
                        background:
                          "linear-gradient(135deg, rgba(17,10,38,0.98), rgba(19,9,44,0.92))",
                        border: "1px solid rgba(203,171,255,0.22)",
                        color: "#fff",
                        boxShadow: "0 22px 60px rgba(0, 0, 0, 0.55)",
                        backdropFilter: "blur(14px)",
                      },
                      "& .MuiPickersCalendarHeader-label": {
                        fontWeight: 900,
                        letterSpacing: "0.06em",
                      },
                      "& .MuiPickersArrowSwitcher-button": {
                        color: "rgba(255,255,255,0.95)",
                        "&:hover": {
                          backgroundColor: "rgba(203,171,255,0.10)",
                        },
                      },
                      "& .MuiDayCalendar-weekDayLabel": {
                        color: "rgba(255,255,255,0.7)",
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      },
                      "& .MuiPickersDay-root": {
                        color: "rgba(255,255,255,0.92)",
                        borderRadius: "12px",
                        "&:hover": {
                          backgroundColor: "rgba(203,171,255,0.12)",
                        },
                      },
                      "& .MuiPickersDay-root.MuiPickersDay-today": {
                        border: "1px solid rgba(239,187,61,0.6)",
                      },
                      "& .MuiPickersDay-root.Mui-disabled": {
                        color: "rgba(255,255,255,0.35)",
                      },
                      "& .MuiPickersDay-root.Mui-selected": {
                        backgroundColor: "#efbb3d",
                        color: "#110a26",
                        fontWeight: 900,
                        boxShadow: "0 10px 30px rgba(239,187,61,0.25)",
                      },
                      "& .MuiPickersDay-root.Mui-selected:hover": {
                        backgroundColor: "rgba(239,187,61,0.92)",
                      },
                      "& .MuiPickersLayout-actionBar button": {
                        borderRadius: "12px",
                        fontWeight: 900,
                        letterSpacing: "0.04em",
                      },
                    },
                  },
                  dialog: {
                    sx: {
                      "& .MuiPaper-root": {
                        background:
                          "linear-gradient(135deg, rgba(17,10,38,0.98), rgba(19,9,44,0.92))",
                        border: "1px solid rgba(203,171,255,0.22)",
                        color: "#fff",
                        boxShadow: "0 22px 60px rgba(0, 0, 0, 0.55)",
                      },
                      "& .MuiPickersCalendarHeader-label": {
                        fontWeight: 900,
                        letterSpacing: "0.06em",
                      },
                      "& .MuiPickersArrowSwitcher-button": {
                        color: "rgba(255,255,255,0.95)",
                        "&:hover": {
                          backgroundColor: "rgba(203,171,255,0.10)",
                        },
                      },
                      "& .MuiDayCalendar-weekDayLabel": {
                        color: "rgba(255,255,255,0.7)",
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      },
                      "& .MuiPickersDay-root": {
                        color: "rgba(255,255,255,0.92)",
                        borderRadius: "12px",
                        "&:hover": {
                          backgroundColor: "rgba(203,171,255,0.12)",
                        },
                      },
                      "& .MuiPickersDay-root.MuiPickersDay-today": {
                        border: "1px solid rgba(239,187,61,0.6)",
                      },
                      "& .MuiPickersDay-root.Mui-disabled": {
                        color: "rgba(255,255,255,0.35)",
                      },
                      "& .MuiPickersDay-root.Mui-selected": {
                        backgroundColor: "#efbb3d",
                        color: "#110a26",
                        fontWeight: 900,
                        boxShadow: "0 10px 30px rgba(239,187,61,0.25)",
                      },
                      "& .MuiPickersDay-root.Mui-selected:hover": {
                        backgroundColor: "rgba(239,187,61,0.92)",
                      },
                      "& .MuiPickersLayout-actionBar button": {
                        borderRadius: "12px",
                        fontWeight: 900,
                        letterSpacing: "0.04em",
                      },
                    },
                  },
                  textField: {
                    fullWidth: true,
                    placeholder: "YYYY-MM-DD",
                    sx: {
                      "> div > fieldset": {
                        borderColor: "#fff",
                      },
                      "& .MuiIconButton-root": { color: "#fff" },
                      "& .MuiPickersInputBase-sectionsContainer": {
                        color: "#fff",
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </div>
        </div>

        <div className="booking-form__section">
          <div className="booking-form__section-head">
            <h3 className="booking-form__section-title">Sala y horario</h3>
            <div className="booking-form__section-meta">
              {isLoading && <span className="booking-badge">Cargando…</span>}
            </div>
          </div>
          <p className="booking-form__hint">
            Si no encuentras cupo para el día u horario que buscas,{" "}
            <a
              className="booking-form__link"
              href="https://wa.me/573181278688"
              target="_blank"
              referrerPolicy="no-referrer"
            >
              comunícate con nosotros
            </a>{" "}
            y te ayudamos con otra opción.
          </p>

          {!selectedDate && (
            <p className="booking-form__hint">
              Selecciona una fecha para ver salas y horarios disponibles.
            </p>
          )}

          {loadError && (
            <div className="booking-alert" role="alert">
              {loadError}
            </div>
          )}

          {availability && (
            <div className="booking-rooms" role="list">
              {availability.rooms.map((room) => {
                const isSelected = room.roomId === selectedRoomId;
                const roomHasSlots =
                  Array.isArray(room.slots) && room.slots.length > 0;
                return (
                  <article
                    key={room.roomId}
                    className={`booking-room-card ${
                      isSelected ? "booking-room-card--selected" : ""
                    }`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="booking-room-card__top"
                      onClick={() => handleSelectRoom(room)}
                      aria-pressed={isSelected}
                    >
                      <div className="booking-room-card__image">
                        <img
                          src={roomImage(room.roomId)}
                          alt={room.name}
                          loading="lazy"
                        />
                      </div>
                      <div className="booking-room-card__info">
                        <div className="booking-room-card__name">
                          {room.name}
                        </div>
                        <div className="booking-room-card__meta">
                          {room.durationMinutes} min · {room.minPlayers}–
                          {room.maxPlayers} jugadores ·{" "}
                          {difficultyLabel(room.difficulty)}
                        </div>
                      </div>
                    </button>

                    <div
                      className="booking-room-card__slots"
                      aria-label={`Horarios ${room.name}`}
                    >
                      {!roomHasSlots && (
                        <div className="booking-room-card__empty">
                          Sin horarios para esta fecha.
                        </div>
                      )}
                      {roomHasSlots && (
                        <div className="booking-slots">
                          {room.slots.map((slot) => {
                            const isSlotSelected =
                              isSelected && slot.start === selectedSlotStart;
                            const label = formatTime(slot.start);
                            return (
                              <button
                                key={slot.start}
                                type="button"
                                className={`booking-slot ${
                                  slot.available
                                    ? "booking-slot--available"
                                    : "booking-slot--busy"
                                } ${
                                  isSlotSelected ? "booking-slot--selected" : ""
                                }`}
                                disabled={!slot.available}
                                onClick={() => handleSelectSlot(room, slot)}
                                aria-pressed={isSlotSelected}
                                title={
                                  !slot.available ? "Ocupado" : "Disponible"
                                }
                              >
                                <span className="booking-slot__time">
                                  {label}
                                </span>
                                {!slot.available && (
                                  <span className="booking-slot__badge">
                                    Ocupado
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="booking-form__section">
          <h3 className="booking-form__section-title">Personas</h3>
          <div className="booking-form__field">
            <span className="booking-form__label">Número de jugadores</span>
            <div
              className={`booking-people ${
                selectedRoom ? "" : "booking-people--disabled"
              }`}
              aria-label="Selector de personas"
            >
              <button
                type="button"
                className="booking-people__btn"
                disabled={
                  !selectedRoom ||
                  typeof peopleCount !== "number" ||
                  peopleCount <= minPlayers
                }
                onClick={() => {
                  if (!selectedRoom || typeof peopleCount !== "number") return;
                  setPeopleCount(Math.max(minPlayers, peopleCount - 1));
                }}
              >
                −
              </button>
              <div className="booking-people__value">
                {typeof peopleCount === "number" ? peopleCount : "—"}
              </div>
              <button
                type="button"
                className="booking-people__btn"
                disabled={
                  !selectedRoom ||
                  typeof peopleCount !== "number" ||
                  peopleCount >= maxPlayers
                }
                onClick={() => {
                  if (!selectedRoom || typeof peopleCount !== "number") return;
                  setPeopleCount(Math.min(maxPlayers, peopleCount + 1));
                }}
              >
                +
              </button>
            </div>
            <p className="booking-form__hint booking-form__hint--inline">
              {selectedRoom
                ? `Límites por sala: ${selectedRoom.minPlayers}–${selectedRoom.maxPlayers}`
                : "Selecciona una sala para habilitar el selector."}
            </p>
            {selectedRoom && typeof peopleCount === "number" && (
              <div className="booking-summary booking-summary--inline">
                <div className="booking-summary__row booking-summary__row--total">
                  <span className="booking-summary__label">Valor total</span>
                  <span className="booking-summary__value">
                    {formatMoney(estimatedTotal, locale, selectedCurrency)}
                  </span>
                </div>
                {pricePerPerson != null && (
                  <div className="booking-summary__row">
                    <span className="booking-summary__label">
                      Precio por persona
                    </span>
                    <span className="booking-summary__value">
                      {formatMoney(pricePerPerson, locale, selectedCurrency)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="booking-step__footer">
        <button
          type="button"
          className="booking-actions__button"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continuar
        </button>
      </footer>
    </section>
  );
}
