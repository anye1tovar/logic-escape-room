import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
const WHATSAPP_NUMBER = "3181278688";
const WHATSAPP_BASE_URL = "https://wa.me/573181278688";

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
  } catch {
    return false;
  }
}

export default function BookingStepPayment({
  className,
  selection,
  details,
  reservationCode,
}: BookingStepPaymentProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  const consultCode = reservationCode;

  const whatsappUrl = useMemo(() => {
    const name = details?.fullName?.trim() || "<Nombre de la persona>";
    const date = selection?.date || "<fecha>";
    const time = selection?.slotStart
      ? formatTime(selection.slotStart)
      : "<hora>";

    const message = t("booking.payment.whatsappPrefill", { name, date, time });

    return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`;
  }, [details, selection, t]);

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
        <h2 className="booking-step__title">
          4. {t("booking.steps.payment.title")}
        </h2>
        <p className="booking-step__subtitle">
          {t("booking.payment.subtitle")}
        </p>
      </header>

      <div className="booking-step__content">
        <div className="booking-form__section">
          <h3 className="booking-form__section-title">
            {t("booking.payment.instructionsTitle")}
          </h3>

          <ol style={{ marginLeft: "1.5rem" }}>
            <li className="booking-form__hint">
              {t("booking.payment.depositPrefix")}{" "}
              <strong className="booking-payment__amount">
                ${DEPOSIT_AMOUNT_COP.toLocaleString("es-CO")} COP
              </strong>
              .
            </li>
            <li className="booking-form__hint">
              {t("booking.payment.deadlinePrefix")} <strong>24</strong>{" "}
              {t("booking.payment.deadlineSuffix")}
            </li>
            <li className="booking-form__hint">
              {t("booking.payment.sendToWhatsapp")}{" "}
              <a className="booking-payment__link" href={whatsappUrl}>
                {WHATSAPP_NUMBER}
              </a>
              .
            </li>
          </ol>

          <div className="booking-payment__breb">
            <div className="booking-payment__breb-label">
              {t("booking.payment.payHint")}
            </div>
            <div className="booking-payment__breb-row">
              <div
                className="booking-payment__breb-key"
                aria-label={t("booking.payment.brebAria")}
              >
                {BREB_KEY}
              </div>
              <button
                type="button"
                className="booking-actions__button booking-actions__button--ghost booking-payment__qr-button"
                onClick={() => dialogRef.current?.showModal()}
              >
                {t("booking.payment.viewQr")}
              </button>
            </div>
          </div>
        </div>

        <div className="booking-form__section booking-form__section--code">
          <h3 className="booking-form__section-title">
            {t("booking.payment.consultCodeTitle")}
          </h3>
          <p className="booking-form__hint">
            {t("booking.payment.consultCodeHint")}
          </p>
          <div className="booking-code">
            <div
              className="booking-code__value"
              aria-label={t("booking.payment.consultCodeAria")}
            >
              {consultCode || "-"}
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
                  ? t("booking.payment.copy.copied")
                  : copyState === "failed"
                  ? t("booking.payment.copy.failed")
                  : t("booking.payment.copy.idle")}
              </button>
              <a className="booking-code__link" href={consultUrl}>
                {t("booking.payment.consultStatusLink")}
              </a>
            </div>
          </div>
        </div>
      </div>

      <dialog className="booking-qr-dialog" ref={dialogRef}>
        <div className="booking-qr-dialog__content">
          <header className="booking-qr-dialog__header">
            <h4 className="booking-qr-dialog__title">
              {t("booking.payment.qrDialog.title")}
            </h4>
            <button
              type="button"
              className="booking-qr-dialog__close"
              onClick={() => dialogRef.current?.close()}
              aria-label={t("booking.payment.qrDialog.closeAria")}
            >
              ✕
            </button>
          </header>
          <img
            className="booking-qr-dialog__img"
            src={brebQrImg}
            alt={t("booking.payment.qrDialog.imageAlt")}
          />
          <p className="booking-form__hint booking-qr-dialog__hint">
            {t("booking.payment.qrDialog.fallbackKey", { key: BREB_KEY })}
          </p>
        </div>
      </dialog>
    </section>
  );
}
