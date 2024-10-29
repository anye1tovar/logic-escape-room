import QRCodeStyling, { FileExtension } from "qr-code-styling";
import React, { useEffect, useRef, useState } from "react";
import { QrCodeModalProps } from "../models/qr-core-modal.props";
import logicLogo from "/logo-logic.png";

const QrCodeModal: React.FC<QrCodeModalProps> = ({ url, isOpen, onClose }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [qrColor, setQrColor] = useState("#000000");
  const [qrSize, setQrSize] = useState(300);
  const [fileFormat, setFileFormat] = useState<FileExtension>("png");

  const qrCode = useRef(
    new QRCodeStyling({
      width: qrSize,
      height: qrSize,
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

  useEffect(() => {
    qrCode.current.update({
      backgroundOptions: {
        color: transparentBackground ? "transparent" : "#ffffff",
      },
      dotsOptions: { color: qrColor },
      width: qrSize,
      height: qrSize,
    });
  }, [transparentBackground, qrColor, qrSize]);

  const downloadQRCode = () => {
    qrCode.current.download({ extension: fileFormat });
  };

  const handleQrSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value);
    if (size > 0) setQrSize(size);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-auto">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center flex flex-col relative w-11/12 sm:w-2/3 md:w-1/2 lg:w-1/3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Código QR</h2>
        <div ref={qrCodeRef} className="flex justify-center mb-4" />{" "}
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
            <label className="flex items-center space-x-2 mb-2">
              <span>Tamaño del QR:</span>
              <input
                type="number"
                min="50"
                max="10000"
                value={qrSize}
                onChange={handleQrSizeChange}
                className="ml-2 p-1 border rounded w-20"
                placeholder="300"
              />
              <span>px</span>
            </label>
            <label className="flex items-center space-x-2 mb-2">
              <span>Formato de archivo:</span>
              <select
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value as FileExtension)}
                className="ml-2 p-1 border rounded"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="svg">SVG</option>
                <option value="webp">WEBP</option>
              </select>
            </label>
          </div>
        )}
        <div className="bottom-0 bg-white py-2 flex flex-col space-y-2 mt-4">
          <button
            onClick={downloadQRCode}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Descargar
          </button>
          <button
            onClick={onClose}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrCodeModal;
