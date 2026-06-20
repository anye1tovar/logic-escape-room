import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { buildLogicWhatsAppUrl } from "../../../utils/support";
import "./FloatingWhatsAppButton.scss";

const whatsappMessage = "Hola, me gustaría hacerles una pregunta";

const FloatingWhatsAppButton = () => {
  return (
    <div className="floating-actions" aria-label="Accesos rapidos">
      <a
        className="floating-actions__button floating-actions__button--whatsapp floating-whatsapp"
        href={buildLogicWhatsAppUrl(whatsappMessage)}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar a Logic por WhatsApp"
      >
        <WhatsAppIcon className="floating-actions__icon" aria-hidden="true" />
      </a>
    </div>
  );
};

export default FloatingWhatsAppButton;
