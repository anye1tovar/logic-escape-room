import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { ClickAwayListener, IconButton, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isDurationTooltipOpen, setIsDurationTooltipOpen] = useState(false);
  const [isDepositTooltipOpen, setIsDepositTooltipOpen] = useState(false);
  const hasAdminToken = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem("adminToken"));
  }, []);
  const isWalkIn = useMemo(() => {
    if (!hasAdminToken || !selection) return false;
    if (selection.slotStart) {
      const parsed = dayjs(selection.slotStart);
      if (parsed.isValid()) return parsed.isBefore(dayjs());
    }
    if (selection.date) {
      return dayjs(selection.date).isBefore(dayjs(), "day");
    }
    return false;
  }, [hasAdminToken, selection]);

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
          err instanceof Error
            ? err.message
            : t("booking.summary.errors.loadTotal")
        );
      }
    })();

    return () => {
      isActive = false;
    };
  }, [selection?.date, selection?.peopleCount, t]);

  return (
    <section className={className}>
      <header className="booking-step__header">
        <h2 className="booking-step__title">
          3. {t("booking.steps.summary.title")}
        </h2>
        <p className="booking-step__subtitle">
          {t("booking.summary.subtitle")}
        </p>
      </header>

      <div className="booking-summary" aria-label={t("booking.summary.aria")}>
        <div className="booking-summary__row">
          <span className="booking-summary__label">
            {t("booking.summary.labels.room")}
          </span>
          <span className="booking-summary__value">
            {selection?.roomName || "-"}
          </span>
        </div>
        <div className="booking-summary__row">
          <span className="booking-summary__label">
            {t("booking.summary.labels.date")}
          </span>
          <span className="booking-summary__value">
            {selection?.date || "-"}
          </span>
        </div>
        <div className="booking-summary__row">
          <span className="booking-summary__label">
            {t("booking.summary.labels.time")}
          </span>
          <span className="booking-summary__value">
            {selection?.slotStart ? formatTime(selection.slotStart) : "-"}
          </span>
        </div>
        <div className="booking-summary__row">
          <span className="booking-summary__label">
            {t("booking.summary.labels.duration")}
            <ClickAwayListener
              onClickAway={() => setIsDurationTooltipOpen(false)}
            >
              <Tooltip
                title={t("booking.summary.duration.tooltip")}
                arrow
                open={isDurationTooltipOpen}
                onClose={() => setIsDurationTooltipOpen(false)}
                disableHoverListener
                disableFocusListener
                disableTouchListener
              >
                <IconButton
                  aria-label={t("booking.summary.duration.tooltipAria")}
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
          <span className="booking-summary__value">
            {t("booking.common.minutesValue", { minutes: 90 })}
          </span>
        </div>
        <div className="booking-summary__divider" />
        <div className="booking-summary__row">
          <span className="booking-summary__label">
            {t("booking.summary.labels.people")}
          </span>
          <span className="booking-summary__value">
            {typeof selection?.peopleCount === "number"
              ? selection.peopleCount
              : "-"}
          </span>
        </div>
        <div className="booking-summary__divider" />
        <div className="booking-summary__row">
          <span className="booking-summary__label">
            {t("booking.common.totalValue")}
          </span>
          <span className="booking-summary__value">
            {formatMoneyCop(quoteTotal)}
          </span>
        </div>
        <div className="booking-summary__row booking-summary__row--total">
          <span className="booking-summary__label">
            {t("booking.summary.labels.depositMinimum")}{" "}
            <ClickAwayListener
              onClickAway={() => setIsDepositTooltipOpen(false)}
            >
              <Tooltip
                title={t("booking.summary.deposit.tooltip")}
                arrow
                open={isDepositTooltipOpen}
                onClose={() => setIsDepositTooltipOpen(false)}
                disableHoverListener
                disableFocusListener
                disableTouchListener
              >
                <IconButton
                  aria-label={t("booking.summary.deposit.tooltipAria")}
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
          {t("booking.actions.back")}
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
                whatsapp,
                date: selection.date,
                roomId: selection.roomId,
                time: selection.slotStart,
                endTime: selection.slotEnd,
                attendees: selection.peopleCount,
                notes: details.notes,
                total: quoteTotal,
                isFirstTime: details.isFirstTime === true,
                ...(isWalkIn ? { reservationSource: "walk_in" } : {}),
              })) as {
                consultCode?: string;
                reservationCode?: string;
                id?: number | string;
              };

              const reservationCode =
                created.reservationCode || created.consultCode;
              if (!reservationCode)
                throw new Error(t("booking.summary.errors.missingCode"));

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
                  : t("booking.summary.errors.createFailed")
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {isSubmitting
            ? t("booking.actions.reserving")
            : t("booking.actions.reserve")}
        </button>
      </footer>
    </section>
  );
}
