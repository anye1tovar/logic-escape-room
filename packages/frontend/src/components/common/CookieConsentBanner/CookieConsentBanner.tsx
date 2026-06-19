import { useEffect, useState } from "react";
import {
  getMarketingConsent,
  saveMarketingConsent,
} from "../../../lib/marketingConsent";
import Button from "../Button";
import "./CookieConsentBanner.scss";

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(getMarketingConsent() == null);
  }, []);

  const answer = (marketing: boolean) => {
    saveMarketingConsent(marketing);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      className="cookie-consent"
      aria-label="Preferencias de cookies"
      role="dialog"
    >
      <div className="cookie-consent__copy">
        <h2 className="cookie-consent__title">Gestión de Cookies</h2>
        <h3 className="cookie-consent__subtitle">Apreciamos tu privacidad</h3>
        <p>
          Utilizamos cookies para mejorar tu experiencia de navegacion, medir
          anuncios y analizar nuestro trafico. No guardamos datos personales
          para el analisis.
        </p>
      </div>
      <div className="cookie-consent__actions">
        <Button
          type="button"
          variant="neutral"
          size="sm"
          pill
          onClick={() => answer(false)}
        >
          Rechazar
        </Button>
        <Button
          type="button"
          variant="sun"
          size="sm"
          pill
          onClick={() => answer(true)}
        >
          Aceptar cookies
        </Button>
      </div>
    </aside>
  );
}
