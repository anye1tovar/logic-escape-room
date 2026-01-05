import { useEffect, useState } from "react";
import { ClickAwayListener, IconButton, Tooltip } from "@mui/material";
import { createBooking, fetchBookingQuote } from "../../../api/bookings";
import type { BookingDetailsFormValues } from "../BookingStepDetails/BookingStepDetails";
import type { BookingStep1Output } from "../BookingStepSelection/BookingStepSelection";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

type BookingStepSummaryProps = {
  className?: string;
  selection: BookingStep1Output | null;
  details: BookingDetailsFormValues | null;
  onBack?: () => void;
  onReserved?: (result: {
    reservationCode: string;
    consultCode?: string;
    bookingId?: number | string;
    total?: number | null;
  }) => void;
};

const DEPOSIT_AMOUNT_COP = 50000;

function formatMoneyCop(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function formatTime(value: string) {
  const match = String(value).match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const matchPlain = String(value).match(/^(\d{2}):(\d{2})$/);
  if (matchPlain) return `${matchPlain[1]}:${matchPlain[2]}`;
  return value;
}

function splitName(fullName: string) {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function BookingStepSummary({
  className,
  selection,
  details,
  onBack,
  onReserved,
}: BookingStepSummaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isDurationTooltipOpen, setIsDurationTooltipOpen] = useState(false);
  const [isDepositTooltipOpen, setIsDepositTooltipOpen] = useState(false);

  const canReserve = Boolean(selection) && Boolean(details) && !isSubmitting;

  useEffect(() => {
    const date = selection?.date;
    const attendees = selection?.peopleCount;
    if (!date || typeof attendees !== "number") {
      setQuoteTotal(null);
      setQuoteError(null);
      return;
    }

    let isActive = true;
    (async () => {
      try {
        setQuoteError(null);
        const quote = await fetchBookingQuote({ date, attendees });
        if (!isActive) return;
        setQuoteTotal(quote.total);
      } catch (err) {
        if (!isActive) return;
        setQuoteTotal(null);
        setQuoteError(
          err instanceof Error ? err.message : "Error cargando el total."
        );
      }
    })();

    return () => {
      isActive = false;
    };
  }, [selection?.date, selection?.peopleCount]);

  // const durationLabel = useMemo(() => {
  //   const minutes = selection?.durationMinutes;
  //   if (typeof minutes !== "number" || !Number.isFinite(minutes)) return "—";
  //   return `${minutes} min`;
  // }, [selection?.durationMinutes]);

  return (
    <section className={className}>
      <header className="booking-step__header">
        <h2 className="booking-step__title">3. Resumen</h2>
        <p className="booking-step__subtitle">
          Revisa los datos y presiona el botón Reservar para apartar tu cupo.
        </p>
      </header>

      <div className="booking-summary" aria-label="Resumen de la reserva">
        <div className="booking-summary__row">
          <span className="booking-summary__label">Sala</span>
          <span className="booking-summary__value">
            {selection?.roomName || "—"}
          </span>
        </div>
        <div className="booking-summary__row">
          <span className="booking-summary__label">Fecha</span>
          <span className="booking-summary__value">
            {selection?.date || "—"}
          </span>
        </div>
        <div className="booking-summary__row">
          <span className="booking-summary__label">Hora</span>
          <span className="booking-summary__value">
            {selection?.slotStart ? formatTime(selection.slotStart) : "—"}
          </span>
        </div>
        <div className="booking-summary__row">
          <span className="booking-summary__label">
            Duración
            <ClickAwayListener
              onClickAway={() => setIsDurationTooltipOpen(false)}
            >
              <Tooltip
                title="La experiencia dura 90 minutos en total, incluyendo la explicación previa, el tiempo dentro de la sala y la sesión de fotos."
                arrow
                open={isDurationTooltipOpen}
                onClose={() => setIsDurationTooltipOpen(false)}
                disableHoverListener
                disableFocusListener
                disableTouchListener
              >
                <IconButton
                  aria-label="Información de duración"
                  size="small"
                  onClick={() => setIsDurationTooltipOpen((prev) => !prev)}
                  edge="end"
                >
                  <InfoOutlinedIcon
                    fontSize="small"
                    sx={{ color: "rgba(255,255,255,0.75)" }}
                  />
                </IconButton>
              </Tooltip>
            </ClickAwayListener>
          </span>
          <span className="booking-summary__value">90 min</span>
        </div>
        <div className="booking-summary__divider" />
        <div className="booking-summary__row">
          <span className="booking-summary__label">Personas</span>
          <span className="booking-summary__value">
            {typeof selection?.peopleCount === "number"
              ? selection.peopleCount
              : "—"}
          </span>
        </div>
        <div className="booking-summary__divider" />
        <div className="booking-summary__row">
          <span className="booking-summary__label">Valor total</span>
          <span className="booking-summary__value">
            {formatMoneyCop(quoteTotal)}
          </span>
        </div>
        <div className="booking-summary__row booking-summary__row--total">
          <span className="booking-summary__label">
            Abono mínimo{" "}
            <ClickAwayListener
              onClickAway={() => setIsDepositTooltipOpen(false)}
            >
              <Tooltip
                title="El abono se realiza después de apartar el cupo. Al dar clic en Reservar verás las instrucciones detalladamente."
                arrow
                open={isDepositTooltipOpen}
                onClose={() => setIsDepositTooltipOpen(false)}
                disableHoverListener
                disableFocusListener
                disableTouchListener
              >
                <IconButton
                  aria-label="Información del abono mínimo"
                  size="small"
                  onClick={() => setIsDepositTooltipOpen((prev) => !prev)}
                  edge="end"
                >
                  <InfoOutlinedIcon
                    fontSize="small"
                    sx={{ color: "rgba(255,255,255,0.75)" }}
                  />
                </IconButton>
              </Tooltip>
            </ClickAwayListener>
          </span>
          <span className="booking-summary__value">
            ${DEPOSIT_AMOUNT_COP.toLocaleString("es-CO")}
          </span>
        </div>
        {quoteError && <div className="booking-alert">{quoteError}</div>}
      </div>

      {submitError && <div className="booking-alert">{submitError}</div>}

      <footer className="booking-step__footer booking-step__footer--split">
        <button
          type="button"
          className="booking-actions__button booking-actions__button--ghost"
          onClick={onBack}
          disabled={!onBack || isSubmitting}
        >
          Volver
        </button>
        <button
          type="button"
          className="booking-actions__button"
          disabled={!canReserve}
          onClick={async () => {
            if (!selection || !details) return;
            setSubmitError(null);
            setIsSubmitting(true);
            try {
              const whatsapp = `${details.dialCode}${details.phone}`;
              const { firstName, lastName } = splitName(details.fullName);
              const created = (await createBooking({
                name: details.fullName,
                firstName,
                lastName,
                email: details.email,
                whatsapp,
                date: selection.date,
                roomId: selection.roomId,
                time: selection.slotStart,
                endTime: selection.slotEnd,
                attendees: selection.peopleCount,
                notes: details.notes,
                total: quoteTotal,
                isFirstTime: details.isFirstTime === true,
              })) as {
                consultCode?: string;
                reservationCode?: string;
                id?: number | string;
              };

              const reservationCode =
                created.reservationCode || created.consultCode;
              if (!reservationCode) throw new Error("No se generó el código.");

              onReserved?.({
                reservationCode,
                consultCode: created.consultCode,
                bookingId: created.id,
                total: quoteTotal,
              });
            } catch (err) {
              setSubmitError(
                err instanceof Error
                  ? err.message
                  : "No pudimos crear la reserva. Intenta de nuevo."
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {isSubmitting ? "Reservando..." : "Reservar"}
        </button>
      </footer>
    </section>
  );
}
