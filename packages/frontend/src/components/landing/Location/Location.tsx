import { useTranslation } from "react-i18next";
import "./Location.scss";

const Location = () => {
  const { t } = useTranslation();

  return (
    <section className="location" id="location">
      <div className="location__halo" />
      <div className="location__content">
        <header className="location__header">
          <p className="location__eyebrow">
            {t("location.eyebrow", "Encuéntranos")}
          </p>
          <h2>
            {t("location.title.start", "Aquí puede iniciar tu")}{" "}
            <span className="location__highlight">
              {t("location.title.highlight", "aventura")}
            </span>
          </h2>
          <a
            href="https://maps.app.goo.gl/XC3GgNicYAaekga16"
            target="_blank"
            rel="noreferrer"
            className="location__link"
          >
            {t("location.link", "Abrir en Google Maps ↗")}
          </a>
        </header>

        <div className="location__map">
          <iframe
            title={t("location.mapTitle", "Mapa Logic Escape Room")}
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3971.149444264959!2d-73.356876!3d5.544847999999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e6a7d00608356bb%3A0x190f3285ea4c8a88!2sLogic%20Escape%20room!5e0!3m2!1sen!2sco!4v1766540816470!5m2!1sen!2sco"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
};

export default Location;
