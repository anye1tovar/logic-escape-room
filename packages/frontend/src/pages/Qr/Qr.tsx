import { useEffect, useMemo, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import "./Qr.scss";
import { MenuItem, Select } from "@mui/material";

type RouteOption = {
  label: string;
  path: string;
};

const routeOptions: RouteOption[] = [
  { label: "Home", path: "/" },
  { label: "Cafeteria", path: "/cafeteria" },
];

const logoSrc = "/icons/nox-icon.webp";

export default function Qr() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [path, setPath] = useState<string>(routeOptions[0].path);
  const [customUrl, setCustomUrl] = useState("");
  const [qrSize, setQrSize] = useState<number>(320);
  const [qrColor, setQrColor] = useState<string>("#efbb3d");
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [logoSize, setLogoSize] = useState<number>(72);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const targetUrl = useMemo(() => {
    if (path !== "custom") return `${origin}${path}`;

    const value = customUrl.trim();
    if (!value || !/^(https?:\/\/|\/(?!\/))/i.test(value)) return "";

    try {
      const url = new URL(value, origin);
      return url.protocol === "http:" || url.protocol === "https:"
        ? url.href
        : "";
    } catch {
      return "";
    }
  }, [origin, path, customUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    container.innerHTML = "";
    qrRef.current = null;
    if (!targetUrl) return undefined;

    const ratio = Math.min(0.5, Math.max(0.08, logoSize / qrSize));
    const backgroundColor = showBackground ? "#ffffff" : "transparent";

    const qrCode = new QRCodeStyling({
      width: qrSize,
      height: qrSize,
      type: "svg",
      data: targetUrl,
      margin: 8,
      dotsOptions: {
        color: qrColor,
        type: "rounded",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: qrColor,
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      image: showLogo ? logoSrc : undefined,
      imageOptions: {
        crossOrigin: "anonymous",
        hideBackgroundDots: true,
        imageSize: showLogo ? ratio : 0,
        margin: 6,
      },
    });

    container.innerHTML = "";
    qrCode.append(container);
    qrRef.current = qrCode;

    return () => {
      container.innerHTML = "";
      qrRef.current = null;
    };
  }, [qrColor, qrSize, targetUrl, showBackground, showLogo, logoSize]);

  const handleDownload = () => {
    qrRef.current?.download({
      name: "logic-qr",
      extension: "png",
    });
  };

  return (
    <div className="qr-page">
      <Header />
      <main className="qr-page__main">
        <div className="qr-page__content">
          <header className="qr-page__header">
            <p className="qr-page__eyebrow">Generador QR</p>
            <h1 className="qr-page__title">Rutas Logic</h1>
            <p className="qr-page__subtitle">
              Genera un QR para el home, la cafeteria o una URL personalizada. Ajusta color,
              fondo y el logo si lo necesitas.
            </p>
          </header>

          <div className="qr-page__grid">
            <section className="qr-page__panel" aria-label="Configuracion QR">
              <div className="qr-page__field">
                <label htmlFor="qr-route">Ruta</label>
                <Select
                  id="qr-route"
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                >
                  {routeOptions.map((option) => (
                    <MenuItem key={option.path} value={option.path}>
                      {option.label}
                    </MenuItem>
                  ))}
                  <MenuItem value="custom">URL personalizada</MenuItem>
                </Select>
              </div>

              {path === "custom" && (
                <div className="qr-page__field">
                  <label htmlFor="qr-custom-url">URL personalizada</label>
                  <input
                    id="qr-custom-url"
                    type="text"
                    inputMode="url"
                    placeholder="https://ejemplo.com/ruta o /mi-ruta"
                    value={customUrl}
                    onChange={(event) => setCustomUrl(event.target.value)}
                    aria-describedby="qr-custom-url-help"
                    aria-invalid={customUrl.trim() !== "" && !targetUrl}
                  />
                  <p id="qr-custom-url-help" className="qr-page__note">
                    {customUrl.trim() && !targetUrl
                      ? "Ingresa una URL válida con http:// o https://, o una ruta que empiece por /."
                      : "Usa una URL con https:// o una ruta de este sitio que empiece por /."}
                  </p>
                </div>
              )}

              <div className="qr-page__field">
                <label htmlFor="qr-size">Tamano QR</label>
                <div className="qr-page__range">
                  <input
                    id="qr-size"
                    type="number"
                    min={220}
                    max={520}
                    step={10}
                    value={qrSize}
                    onChange={(event) => setQrSize(Number(event.target.value))}
                  />
                  <span>px</span>
                </div>
              </div>

              <div className="qr-page__field">
                <label htmlFor="qr-color">Color QR</label>
                <div className="qr-page__color">
                  <input
                    id="qr-color"
                    type="color"
                    value={qrColor}
                    onChange={(event) => setQrColor(event.target.value)}
                  />
                  <span>{qrColor.toUpperCase()}</span>
                </div>
              </div>

              <div className="qr-page__field qr-page__toggle">
                <input
                  id="qr-background"
                  type="checkbox"
                  checked={showBackground}
                  onChange={(event) => setShowBackground(event.target.checked)}
                />
                <label htmlFor="qr-background">Fondo blanco</label>
              </div>

              <div className="qr-page__field qr-page__toggle">
                <input
                  id="qr-logo"
                  type="checkbox"
                  checked={showLogo}
                  onChange={(event) => setShowLogo(event.target.checked)}
                />
                <label htmlFor="qr-logo">Logo Nox</label>
              </div>

              <div className="qr-page__field">
                <label htmlFor="qr-logo-size">Tamano logo</label>
                <div className="qr-page__range">
                  <input
                    id="qr-logo-size"
                    type="number"
                    min={32}
                    max={160}
                    step={4}
                    value={logoSize}
                    onChange={(event) =>
                      setLogoSize(Number(event.target.value))
                    }
                    disabled={!showLogo}
                  />
                  <span>px</span>
                </div>
              </div>

              <div className="qr-page__field">
                <label>URL</label>
                <div className="qr-page__url">{targetUrl || "Ingresa una URL para generar el QR."}</div>
              </div>

              <button
                type="button"
                className="qr-page__download"
                onClick={handleDownload}
                disabled={!targetUrl}
              >
                Descargar QR
              </button>
            </section>

            <section className="qr-page__preview" aria-label="Vista previa QR">
              <div
                className={`qr-page__canvas-wrap${
                  showBackground ? "" : " qr-page__canvas-wrap--transparent"
                }`}
              >
                <div ref={containerRef} />
              </div>
              {showLogo && (
                <p className="qr-page__note">
                  El logo se limita al 45% del tamano del QR.
                </p>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
