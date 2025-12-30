import { useEffect, useMemo, useRef, useState } from "react";
import { fetchBookingQuote } from "../../../api/bookings";
import brebQrImg from "../../../assets/img/bre-b-qr.jpg";
import type { BookingDetailsFormValues } from "../BookingStepDetails/BookingStepDetails";
import type { BookingStep1Output } from "../BookingStepSelection/BookingStepSelection";

type BookingStepPaymentProps = {
  className?: string;
  selection: BookingStep1Output | null;
  details: BookingDetailsFormValues | null;
  reservationCode: string | null;
  quoteTotal?: number | null;
};

const BREB_KEY = "@PLATA3123715177";
const DEPOSIT_AMOUNT_COP = 50000;
const WHATSAPP_NUMBER = "3133815138";
const WHATSAPP_URL = "https://wa.me/573133815138";

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

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (err) {
    return false;
  }
}

export default function BookingStepPayment({
  className,
  selection,
  details,
  reservationCode,
  quoteTotal: quoteTotalProp,
}: BookingStepPaymentProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [quoteTotal, setQuoteTotal] = useState<number | null>(
    typeof quoteTotalProp === "number" ? quoteTotalProp : null
  );
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  const consultCode = reservationCode;

  useEffect(() => {
    setQuoteTotal(typeof quoteTotalProp === "number" ? quoteTotalProp : null);
  }, [quoteTotalProp]);

  useEffect(() => {
    if (typeof quoteTotalProp === "number") return;
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
  }, [selection?.date, selection?.peopleCount, quoteTotalProp]);

  const consultUrl = useMemo(() => {
    if (!consultCode) return "/consulta-reserva";
    return `/consulta-reserva?code=${encodeURIComponent(consultCode)}`;
  }, [consultCode]);

  const canShow =
    Boolean(selection) && Boolean(details) && Boolean(consultCode);

  if (!canShow) return null;

  return (
    <section className={className}>
      <header className="booking-step__header">
        <h2 className="booking-step__title">4. Pago</h2>
        <p className="booking-step__subtitle">
          Reserva creada. Realiza el abono y envía el comprobante por WhatsApp.
        </p>
      </header>

      <div className="booking-step__content">
        <div className="booking-form__section">
          <h3 className="booking-form__section-title">Reserva creada</h3>
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
            <div className="booking-summary__divider" />
            <div className="booking-summary__row">
              <span className="booking-summary__label">Jugadores</span>
              <span className="booking-summary__value">
                {typeof selection?.peopleCount === "number"
                  ? selection.peopleCount
                  : "—"}
              </span>
            </div>
            <div className="booking-summary__divider" />
            <div className="booking-summary__row booking-summary__row--total">
              <span className="booking-summary__label">Total</span>
              <span className="booking-summary__value">
                {formatMoneyCop(quoteTotal)}
              </span>
            </div>
            {quoteError && <div className="booking-alert">{quoteError}</div>}
          </div>
        </div>

        <div className="booking-form__section">
          <h3 className="booking-form__section-title">Instrucciones</h3>

          <p className="booking-form__hint">
            Para confirmar tu reserva, realiza un abono de{" "}
            <strong>${DEPOSIT_AMOUNT_COP.toLocaleString("es-CO")} COP</strong>.
          </p>
          <p className="booking-form__hint">
            Tienes <strong>24 horas</strong> para enviar el comprobante.
          </p>
          <p className="booking-form__hint">
            Envíalo al WhatsApp de Logic:{" "}
            <a className="booking-payment__link" href={WHATSAPP_URL}>
              {WHATSAPP_NUMBER}
            </a>
            .
          </p>

          <div className="booking-payment__breb">
            <div className="booking-payment__breb-label">Llave Bre-B</div>
            <div className="booking-payment__breb-row">
              <div
                className="booking-payment__breb-key"
                aria-label="Llave Bre-B"
              >
                {BREB_KEY}
              </div>
              <button
                type="button"
                className="booking-actions__button booking-actions__button--ghost booking-payment__qr-button"
                onClick={() => dialogRef.current?.showModal()}
              >
                Ver QR
              </button>
            </div>
            <p className="booking-form__hint">
              Puedes pagar escaneando el QR o usando la llave Bre-B.
            </p>
          </div>
        </div>

        <div className="booking-form__section booking-form__section--code">
          <h3 className="booking-form__section-title">Código de consulta</h3>
          <p className="booking-form__hint">
            Guarda este código para consultar el estado de tu reserva.
          </p>
          <div className="booking-code">
            <div
              className="booking-code__value"
              aria-label="Código de consulta"
            >
              {consultCode || "—"}
            </div>
            <div className="booking-code__actions">
              <button
                type="button"
                className="booking-actions__button booking-actions__button--ghost"
                onClick={async () => {
                  if (!consultCode) return;
                  const ok = await copyToClipboard(consultCode);
                  setCopyState(ok ? "copied" : "failed");
                  window.setTimeout(() => setCopyState("idle"), 1500);
                }}
                disabled={!consultCode}
              >
                {copyState === "copied"
                  ? "Copiado"
                  : copyState === "failed"
                  ? "No se pudo copiar"
                  : "Copiar"}
              </button>
              <a className="booking-code__link" href={consultUrl}>
                Consultar estado
              </a>
            </div>
          </div>
        </div>
      </div>

      <dialog className="booking-qr-dialog" ref={dialogRef}>
        <div className="booking-qr-dialog__content">
          <header className="booking-qr-dialog__header">
            <h4 className="booking-qr-dialog__title">QR de pago Bre-B</h4>
            <button
              type="button"
              className="booking-qr-dialog__close"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </header>
          <img
            className="booking-qr-dialog__img"
            src={brebQrImg}
            alt="QR de pago Bre-B"
          />
          <p className="booking-form__hint booking-qr-dialog__hint">
            Si prefieres, también puedes pagar por llave: {BREB_KEY}.
          </p>
        </div>
      </dialog>
    </section>
  );
}
