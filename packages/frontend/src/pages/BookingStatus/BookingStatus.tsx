import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { fetchBookingStatus } from "../../api/bookings";
import "./BookingStatus.scss";

type LookupState =
  | { type: "idle" }
  | { type: "loading" }
  | {
      type: "success";
      status: string | null;
      consultCode: string;
      roomName?: string | null;
      date?: string | null;
      time?: string | null;
    }
  | { type: "error"; message: string };

function statusRank(status: string | null) {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();
  if (normalized === "COMPLETED") return 3;
  if (normalized === "CONFIRMED") return 2;
  if (normalized === "PENDING") return 1;
  return 0;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "";
  const match = String(value).match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const matchPlain = String(value).match(/^(\d{2}):(\d{2})$/);
  if (matchPlain) return `${matchPlain[1]}:${matchPlain[2]}`;
  return String(value);
}

export default function BookingStatus() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [code, setCode] = useState(() => {
    const urlCode = (searchParams.get("code") || "").trim();
    return urlCode ? urlCode.toUpperCase() : "";
  });
  const [lookup, setLookup] = useState<LookupState>({ type: "idle" });
  const [fieldError, setFieldError] = useState<string | null>(null);
  const lookupSeqRef = useRef(0);

  const currentStatusRank = useMemo(() => {
    if (lookup.type !== "success") return 0;
    return statusRank(lookup.status);
  }, [lookup]);

  const statusLabel = useMemo(() => {
    if (lookup.type !== "success") return null;

    const normalized = String(lookup.status || "")
      .trim()
      .toUpperCase();
    if (normalized === "PENDING")
      return t("booking.status.timeline.registered.title");
    if (normalized === "CONFIRMED")
      return t("booking.status.timeline.confirmed.title");
    if (normalized === "COMPLETED")
      return t("booking.status.timeline.completed.title");

    if (lookup.status) {
      return t("booking.status.unknownStatus", { status: lookup.status });
    }

    return t("booking.status.unknownStatus", { status: "Unknown" });
  }, [lookup, t]);

  const resultText = useMemo(() => {
    if (lookup.type === "idle") return t("booking.status.resultEmpty");
    if (lookup.type === "loading") return t("booking.status.resultLoading");
    if (lookup.type === "error") return lookup.message;
    return t("booking.status.resultFound", { status: statusLabel });
  }, [lookup, statusLabel, t]);

  const detailFallback = t("booking.status.detailFallback");
  const detailRoom =
    lookup.type === "success" ? lookup.roomName || detailFallback : null;
  const detailDate =
    lookup.type === "success" ? lookup.date || detailFallback : null;
  const detailTime =
    lookup.type === "success"
      ? lookup.time
        ? formatTime(lookup.time)
        : detailFallback
      : null;

  const runLookup = useCallback(
    async (nextCode: string, options?: { updateUrl?: boolean }) => {
      const consultCode = String(nextCode || "").trim();
      if (!consultCode) {
        setFieldError(t("booking.status.errors.requiredCode"));
        setLookup({ type: "idle" });
        return;
      }

      if (consultCode.length !== 15) {
        setFieldError(t("booking.status.errors.invalidCode"));
        setLookup({ type: "idle" });
        return;
      }

      const seq = ++lookupSeqRef.current;
      setFieldError(null);
      setLookup({ type: "loading" });
      if (options?.updateUrl !== false) setSearchParams({ code: consultCode });

      try {
        const res = await fetchBookingStatus(consultCode);
        if (lookupSeqRef.current !== seq) return;
        setLookup({
          type: "success",
          status: res.status ?? null,
          consultCode: res.consultCode ?? consultCode,
          roomName: res.roomName ?? null,
          date: res.date ?? null,
          time: res.time ?? null,
        });
      } catch (err: unknown) {
        if (lookupSeqRef.current !== seq) return;

        let httpStatus: number | null = null;
        if (typeof err === "object" && err !== null && "status" in err) {
          const statusValue = (err as { status?: unknown }).status;
          if (typeof statusValue === "number") httpStatus = statusValue;
          if (
            typeof statusValue === "string" &&
            statusValue.trim() &&
            Number.isFinite(Number(statusValue))
          ) {
            httpStatus = Number(statusValue);
          }
        }

        if (httpStatus === 404) {
          setFieldError(t("booking.status.errors.notFound"));
          setLookup({
            type: "error",
            message: t("booking.status.errors.notFound"),
          });
          return;
        }

        if (httpStatus === 400) {
          setFieldError(t("booking.status.errors.invalidCode"));
          setLookup({
            type: "error",
            message: t("booking.status.errors.invalidCode"),
          });
          return;
        }

        setFieldError(t("booking.status.errors.unknown"));
        setLookup({
          type: "error",
          message: t("booking.status.errors.unknown"),
        });
      }
    },
    [setSearchParams, t]
  );

  return (
    <div className="booking-status">
      <Header />

      <main className="booking-status__main">
        <div className="booking-status__container">
          <header className="booking-status__header">
            <div className="booking-status__title-block">
              <p className="booking-status__eyebrow">
                {t("booking.status.eyebrow")}
              </p>
              <h1 className="booking-status__title">
                <span>{t("booking.status.titleLine1")}</span>
                <span className="booking-status__title-accent">
                  {t("booking.status.titleLine2")}
                </span>
              </h1>
            </div>

            <div className="booking-status__copy">
              <p className="booking-status__subtitle">
                {t("booking.status.subtitle")}
              </p>
              <p className="booking-status__meta">{t("booking.status.meta")}</p>
            </div>
          </header>

          <section
            className="booking-status__panel"
            aria-label={t("booking.status.formAria")}
          >
            <form
              className="booking-status__form"
              onSubmit={(event) => {
                event.preventDefault();
                void runLookup(code, { updateUrl: true });
              }}
            >
              <label className="booking-status__field">
                <span className="booking-status__label">
                  {t("booking.status.codeLabel")}
                </span>
                <input
                  className="booking-status__input"
                  type="text"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.toUpperCase());
                    if (fieldError) setFieldError(null);
                    if (lookup.type !== "idle") setLookup({ type: "idle" });
                  }}
                  placeholder={t("booking.status.codePlaceholder")}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? "booking-status-code-error" : ""}
                  autoComplete="off"
                />
                {fieldError ? (
                  <span
                    className="booking-status__field-error"
                    id="booking-status-code-error"
                    role="alert"
                  >
                    {fieldError}
                  </span>
                ) : null}
              </label>
              <button
                type="submit"
                className="booking-status__button"
              >
                {t("booking.status.searchCta")}
              </button>
            </form>

            <div className="booking-status__result" aria-live="polite">
              <div className="booking-status__result-card">
                <h2 className="booking-status__result-title">
                  {t("booking.status.resultTitle")}
                </h2>
                <p className="booking-status__result-text">{resultText}</p>
                {lookup.type === "success" ? (
                  <dl className="booking-status__details">
                    <div className="booking-status__detail">
                      <dt className="booking-status__detail-label">
                        {t("booking.status.labels.room")}
                      </dt>
                      <dd className="booking-status__detail-value">
                        {detailRoom}
                      </dd>
                    </div>
                    <div className="booking-status__detail">
                      <dt className="booking-status__detail-label">
                        {t("booking.status.labels.date")}
                      </dt>
                      <dd className="booking-status__detail-value">
                        {detailDate}
                      </dd>
                    </div>
                    <div className="booking-status__detail">
                      <dt className="booking-status__detail-label">
                        {t("booking.status.labels.time")}
                      </dt>
                      <dd className="booking-status__detail-value">
                        {detailTime}
                      </dd>
                    </div>
                  </dl>
                ) : null}

                <div
                  className="booking-status__timeline"
                  aria-label={t("booking.status.timelineAria")}
                >
                  <div
                    className={[
                      "booking-status__timeline-item",
                      currentStatusRank >= 1
                        ? "booking-status__timeline-item--active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="booking-status__dot" />
                    <div className="booking-status__timeline-body">
                      <div className="booking-status__timeline-title">
                        {t("booking.status.timeline.registered.title")}
                      </div>
                      <div className="booking-status__timeline-desc">
                        {t("booking.status.timeline.registered.desc")}
                      </div>
                    </div>
                  </div>

                  <div
                    className={[
                      "booking-status__timeline-item",
                      currentStatusRank >= 2
                        ? "booking-status__timeline-item--active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="booking-status__dot" />
                    <div className="booking-status__timeline-body">
                      <div className="booking-status__timeline-title">
                        {t("booking.status.timeline.confirmed.title")}
                      </div>
                      <div className="booking-status__timeline-desc">
                        {t("booking.status.timeline.confirmed.desc")}
                      </div>
                    </div>
                  </div>

                  <div
                    className={[
                      "booking-status__timeline-item",
                      currentStatusRank >= 3
                        ? "booking-status__timeline-item--active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="booking-status__dot" />
                    <div className="booking-status__timeline-body">
                      <div className="booking-status__timeline-title">
                        {t("booking.status.timeline.completed.title")}
                      </div>
                      <div className="booking-status__timeline-desc">
                        {t("booking.status.timeline.completed.desc")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
