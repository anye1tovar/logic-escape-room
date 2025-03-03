import { Link } from "react-router";

export default function RubikWorkshop() {
  return (
    <div className="bg-[#231f20] text-white min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#ecbb0c] mb-4">
          Desafío Rubik: Domina tu primer Cubo
        </h1>
        <p className="text-lg mb-4">
          Aprende a resolver el cubo de Rubik en este emocionante taller. Desde
          los primeros movimientos hasta estrategias avanzadas, este taller te
          dará las herramientas necesarias para mejorar tu velocidad y
          precisión.
        </p>
        <p className="text-lg mb-4">
          <strong>📅 Fecha:</strong> Jueves, 6 de marzo de 2024
        </p>
        <p className="text-lg mb-4">
          <strong>🕒 Hora:</strong> 7:00 PM - 8:00 PM
        </p>
        <p className="text-lg mb-4">
          <strong>⏳ Duración:</strong> 1 hora
        </p>
        <p className="text-lg mb-4">
          <strong>🎤 Tallerista:</strong> Esteban Tovar
        </p>
        <p className="text-lg mb-4">
          <strong>🔗 Inscripción:</strong>{" "}
          <a
            href="https://forms.gle/ZqZYF73vaydJcBLv6"
            className="text-[#00b2ed] underline"
            target="_blank"
          >
            Haz clic aquí para inscribirte
          </a>
        </p>
        <h2 className="text-2xl font-semibold text-[#ecbb0c] mt-6 mb-4">
          Material del taller
        </h2>
        <ul className="list-disc pl-6 mb-4">
          <li>
            Un cubo de Rubik (si tienes uno, tráelo; si no, te proporcionaremos
            uno en el taller)
          </li>
          <li>Guía de solución básica</li>
          <li>Práctica guiada con el instructor</li>
        </ul>
        <h2 className="text-2xl font-semibold text-[#ecbb0c] mt-6 mb-4">
          Material de apoyo
        </h2>
        <ul className="list-disc pl-6">
          <li>
            <a
              href="https://www.youtube.com/watch?v=GyY0OxDk5lI&ab_channel=Cuby"
              className="text-[#00b2ed] underline"
            >
              Tutorial interactivo en línea
            </a>
          </li>
          <li>
            <a
              href="https://igaciencia.eu/sites/default/files/rubik.pdf"
              className="text-[#00b2ed] underline"
            >
              PDF con los movimientos clave
            </a>
          </li>
        </ul>
        <div className="mt-6">
          <Link to="/talleres" className="text-[#00b2ed] underline">
            ← Volver a la lista de talleres
          </Link>
        </div>
      </div>
    </div>
  );
}
