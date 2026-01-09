import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import "./NotFound.scss";

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="not-found">
      <Header />

      <main className="not-found__main">
        <section className="not-found__panel">
          <p className="not-found__eyebrow">{t("notFound.eyebrow")}</p>
          <h1 className="not-found__title">
            <span>{t("notFound.titleLine1")}</span>
            <span className="not-found__title-accent">
              {t("notFound.titleLine2")}
            </span>
          </h1>
          <p className="not-found__copy">{t("notFound.description")}</p>
          <div className="not-found__actions">
            <button
              type="button"
              className="not-found__button"
              onClick={() => navigate("/")}
            >
              {t("notFound.cta")}
            </button>
          </div>
        </section>

        <aside className="not-found__art" aria-hidden="true">
          <div className="not-found__orb not-found__orb--one" />
          <div className="not-found__orb not-found__orb--two" />
          <div className="not-found__card not-found__card--primary">
            <span className="not-found__code">404</span>
            <span className="not-found__code-label">
              {t("notFound.eyebrow")}
            </span>
          </div>
          <div className="not-found__card not-found__card--clue">
            <span className="not-found__card-label">
              {t("notFound.clueTitle")}
            </span>
            <span className="not-found__card-text">
              {t("notFound.clueText")}
            </span>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}
