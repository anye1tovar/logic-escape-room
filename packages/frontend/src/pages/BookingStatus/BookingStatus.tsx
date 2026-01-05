import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { useTranslation } from "react-i18next";
import "./BookingStatus.scss";

export default function BookingStatus() {
  const { t } = useTranslation();
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
              <p className="booking-status__meta">
                {t("booking.status.meta")}
              </p>
            </div>
          </header>

          <section
            className="booking-status__panel"
            aria-label={t("booking.status.formAria")}
          >
            <div className="booking-status__form">
              <label className="booking-status__field">
                <span className="booking-status__label">
                  {t("booking.status.codeLabel")}
                </span>
                <input
                  className="booking-status__input"
                  type="text"
                  placeholder={t("booking.status.codePlaceholder")}
                />
              </label>
              <button type="button" className="booking-status__button" disabled>
                {t("booking.status.searchCta")}
              </button>
            </div>

            <div className="booking-status__result" aria-live="polite">
              <div className="booking-status__result-card">
                <h2 className="booking-status__result-title">
                  {t("booking.status.resultTitle")}
                </h2>
                <p className="booking-status__result-text">
                  {t("booking.status.resultEmpty")}
                </p>

                <div
                  className="booking-status__timeline"
                  aria-label={t("booking.status.timelineAria")}
                >
                  <div className="booking-status__timeline-item booking-status__timeline-item--active">
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

                  <div className="booking-status__timeline-item">
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

                  <div className="booking-status__timeline-item">
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

                <div className="booking-status__note">
                  <span className="booking-status__note-title">
                    {t("booking.status.tipTitle")}
                  </span>{" "}
                  {t("booking.status.tipBody")}
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
