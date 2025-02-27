import { useState } from "react";
import SocialMediaView from "./components/social-media-view.componen";
import canibalImg from "/canibal.png";
import portalImg from "/portal.png";
import QrCodeModal from "./components/qr-core-modal.component";

function Button({ children, className = "", variant = "default", onClick }) {
  const baseStyle = "px-4 py-2 rounded-md font-semibold text-center";
  const variantStyles = {
    default: "bg-[#ecbb0c] text-black",
    ghost: "bg-transparent text-white",
  };
  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const waLink = "https://wa.me/573181278688";

export default function HomePage() {
  const [isQrModalOpen, setQrModalOpen] = useState(false);
  const pageUrl = window.location.href;

  return (
    <div className="bg-[#231f20] text-white min-h-screen flex flex-col items-center">
      {/* Body */}
      <div className="w-full max-w-3xl px-4">
        {/* Parte 1: Imágenes de juegos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="text-center">
            <img
              src={portalImg}
              alt="Portal"
              className="rounded-lg shadow-lg w-full"
            />
            <Button
              className="mt-4 w-full"
              onClick={() => window.open(waLink, "_blank", "noopener")}
            >
              Reservar
            </Button>
          </div>
          <div className="text-center">
            <img
              src={canibalImg}
              alt="Canibal"
              className="rounded-lg shadow-lg w-full"
            />
            <Button
              className="mt-4 w-full"
              onClick={() => window.open(waLink, "_blank", "noopener")}
            >
              Reservar
            </Button>
          </div>
        </div>

        {/* Parte 2: Horarios */}
        <div className="mt-8 text-center">
          <h2 className="text-3xl font-bold text-[#ecbb0c] mb-[8px]">
            Horarios
          </h2>
          <p className="text-lg">
            <b>Martes a Viernes:</b> 4:30PM - 9:30PM
          </p>
          <p className="text-lg">
            <b>Sábados:</b> 2:00PM - 9:00PM
          </p>
          <p className="text-lg">
            <b>Domingos:</b> Previa Reserva
          </p>
        </div>

        {/* Parte 3: Redes sociales y ubicación */}
        <SocialMediaView />

        <footer className="w-full py-6 flex justify-center">
          <button
            onClick={() => setQrModalOpen(true)}
            className="text-blue-500 hover:underline"
          >
            Generar QR de esta página
          </button>
        </footer>

        <QrCodeModal
          url={pageUrl}
          isOpen={isQrModalOpen}
          onClose={() => setQrModalOpen(false)}
        />
      </div>
    </div>
  );
}
