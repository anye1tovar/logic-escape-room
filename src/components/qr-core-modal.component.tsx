import QRCodeStyling from "qr-code-styling";
import React, { useEffect, useRef, useState } from "react";
import { QrCodeModalProps } from "../models/qr-core-modal.props";
import logicLogo from "/logo-logic.png";

const QrCodeModal: React.FC<QrCodeModalProps> = ({ url, isOpen, onClose }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [qrColor, setQrColor] = useState("#000000");

  const qrCode = useRef(
    new QRCodeStyling({
      width: 300,
      height: 300,
      data: url,
      image: logicLogo,
      backgroundOptions: {
        color: "#ffffff",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 5,
        imageSize: 0.5,
      },
      dotsOptions: {
        type: "classy",
        color: qrColor,
      },
      cornersSquareOptions: {
        type: "dot",
      },
      cornersDotOptions: {
        type: "dot",
      },
    })
  );

  useEffect(() => {
    if (isOpen && qrCodeRef.current) {
      qrCode.current.update({ data: url });
      qrCode.current.append(qrCodeRef.current);
    }
  }, [isOpen, url]);

  // Update the QR code when options change
  useEffect(() => {
    qrCode.current.update({
      backgroundOptions: {
        color: transparentBackground ? "transparent" : "#ffffff",
      },
      dotsOptions: { color: qrColor },
    });
  }, [transparentBackground, qrColor]);

  const downloadQRCode = () => {
    qrCode.current.download({ extension: "png" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center flex flex-col">
        <h2 className="text-xl font-bold mb-4">Código QR</h2>
        <div ref={qrCodeRef} />

        <button
          onClick={() => setShowOptions(!showOptions)}
          className="mt-4 text-blue-500 hover:underline"
        >
          Opciones de descarga
        </button>

        {showOptions && (
          <div className="mt-4 text-left bg-gray-200 rounded p-4">
            <label className="flex items-center space-x-2 mb-2">
              <span>Fondo transparente: </span>
              <input
                type="checkbox"
                checked={transparentBackground}
                onChange={() =>
                  setTransparentBackground(!transparentBackground)
                }
                className="form-checkbox"
              />
            </label>
            <label className="flex items-center space-x-2 mb-2">
              <span>Color del QR:</span>
              <input
                type="color"
                value={qrColor}
                onChange={(e) => setQrColor(e.target.value)}
                className="ml-2 p-1 border rounded"
              />
            </label>
          </div>
        )}

        <button
          onClick={downloadQRCode}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Descargar
        </button>
        <button
          onClick={onClose}
          className="mt-2 bg-gray-400 text-white px-4 py-2 rounded"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default QrCodeModal;
