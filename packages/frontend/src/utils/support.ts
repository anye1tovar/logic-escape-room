const LOGIC_WHATSAPP_NUMBER = "573181278688";

export function buildLogicWhatsAppUrl(message: string) {
  return `https://wa.me/${LOGIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message
  )}`;
}
