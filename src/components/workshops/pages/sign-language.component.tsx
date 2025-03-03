import { Link } from "react-router";
import SignLanguageABC from "../components/sign-language-abc.component";

export default function SignLanguageWorkshop() {
  return (
    <div className="bg-[#231f20] text-white min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#ecbb0c] mb-4">
          Taller básico de lengua de señas
        </h1>
        <p className="text-lg mb-4">
          En este taller aprenderás los fundamentos de la lengua de señas
          colombiana. Es una oportunidad para conectar con la comunidad sorda y
          desarrollar nuevas habilidades comunicativas.
        </p>
        <p className="text-lg mb-4">
          <strong>📅 Fecha:</strong> Jueves, 13 de marzo de 2024
        </p>
        <p className="text-lg mb-4">
          <strong>🕒 Hora:</strong> 7:00 PM - 8:00 PM
        </p>
        <p className="text-lg mb-4">
          <strong>⏳ Duración:</strong> 1 hora
        </p>
        <p className="text-lg mb-4">
          <strong>🎤 Tallerista:</strong>{" "}
          <a
            href="https://www.linkedin.com/in/angelica-tovar/"
            target="_blank"
            className="text-[#00b2ed] underline"
          >
            Angélica Tovar
          </a>
        </p>
        <p className="text-lg mb-4">
          <strong>🔗 Inscripción:</strong>{" "}
          <a
            href="https://forms.gle/u4tz5CBQCjkD7yXf8"
            className="text-[#00b2ed] underline"
            target="_blank"
          >
            Haz clic aquí para inscribirte
          </a>
        </p>
        <h2 className="text-2xl font-semibold text-[#ecbb0c] mt-6 mb-4">
          Material del taller
        </h2>

        <SignLanguageABC />

        <ul className="list-disc pl-6 mb-4">
          <li>
            <a
              href="https://randomwordgenerator.com/picture.php"
              className="text-[#00b2ed] underline"
              target="_blank"
            >
              Generador de imagenes aleatorias
            </a>
          </li>
          <li>
            <a
              href="https://anye1tovar.github.io/LSC-ABCGame/"
              className="text-[#00b2ed] underline"
              target="_blank"
            >
              Juego de memoria ABC LSC
            </a>
          </li>
        </ul>
        <h2 className="text-2xl font-semibold text-[#ecbb0c] mt-6 mb-4">
          Material de apoyo
        </h2>
        <ul className="list-disc pl-6">
          <li>
            <a
              href="https://www.colombiaaprende.edu.co/sites/default/files/files_public/2022-04/Diccionario-lengua-de-senas.pdf"
              className="text-[#00b2ed] underline"
              target="_blank"
            >
              Diccionario INSOR en PDF
            </a>
          </li>
          <li>
            <a
              href="https://educativo.insor.gov.co/diccionario/"
              className="text-[#00b2ed] underline"
              target="_blank"
            >
              Página oficial diccionario INSOR
            </a>
          </li>
          <li>
            <a
              href="https://www.youtube.com/@lenguadesenascolombiana-ls5517"
              className="text-[#00b2ed] underline"
              target="_blank"
            >
              Videos de señas
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
