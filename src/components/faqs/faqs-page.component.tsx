import { useState } from "react";

const faqs = [
  {
    question: "¿Cuánto cuesta participar en una sala de escape?",
    answer: "Para conocer los precios actuales, contáctanos por WhatsApp.",
  },
  {
    question: "¿Cuántas personas pueden jugar en una sala de escape?",
    answer:
      "El mínimo es 2 personas y el máximo 6 por sala. Para la sala Caníbal, deben ser minimo 4 personas, maximo 6.",
  },
  {
    question: "¿Es necesario reservar con anticipación?",
    answer:
      "Los domingos es necesario reservar con al menos un día de anticipación. El resto de los días no es obligatorio, pero recomendamos hacerlo para asegurar tu sala.",
  },
  {
    question: "¿Cuánto dura una sesión en el escape room?",
    answer:
      "La sala de Portal dura 60 minutos y la sala de Caníbal dura 75 minutos. Ambas tienen el mismo precio, pero Caníbal es más difícil.",
  },
  {
    question: "¿Qué pasa si no logramos salir a tiempo?",
    answer:
      "Si no logras salir a tiempo, sonará la alarma y la actividad se detendrá.",
  },
  {
    question: "¿Es un juego adecuado para todas las edades?",
    answer: "El juego es recomendado para mayores de 12 años.",
  },
  {
    question: "¿Las salas de escape son de miedo o terror?",
    answer:
      "Tenemos una sala de aventura, Portal, basada en Jumanji, y una sala de terror, Caníbal.",
  },
  {
    question: "¿Puedo participar si tengo claustrofobia o ansiedad?",
    answer:
      "Si tienes alguna condición, infórmanos para estar alerta. Si tienes claustrofobia que no puedes controlar, mejor no participar.",
  },
  {
    question: "¿Necesito conocimientos previos para jugar?",
    answer: "No, no necesitas conocimientos previos.",
  },
  {
    question: "¿Puedo cancelar o modificar mi reserva?",
    answer: "Sí, puedes cancelar o modificar tu reserva.",
  },
  {
    question: "¿Se permite tomar fotos o grabar dentro de las salas?",
    answer:
      "Solo los miembros del staff pueden tomar fotos dentro de las salas. No se permite el ingreso de dispositivos móviles.",
  },
  {
    question: "¿Cómo puedo pagar mi reserva?",
    answer:
      "Para hacer el pago, contáctanos por WhatsApp y te daremos toda la información.",
  },
  {
    question: "¿Tienen promociones o descuentos?",
    answer:
      "Sí, puedes estar pendiente de nuestro Instagram @logic.escapetunja para conocer nuestras promociones y descuentos.",
  },
  {
    question: "¿Dónde están ubicados y cómo puedo llegar?",
    answer:
      "Estamos en Tunja: [Ubicación en Google Maps](https://maps.app.goo.gl/9M2Q558VShT4Bzjr9).",
  },
  {
    question: "¿Hay estacionamiento disponible?",
    answer:
      "Sí, hay estacionamiento disponible en frente del edificio y es gratis.",
  },
  {
    question: "¿Se puede consumir comida o bebida dentro del escape room?",
    answer:
      "No se permite el ingreso de alimentos a las salas de escape, pero puedes disfrutar algo en nuestra zona de cafetería antes o después de tu experiencia.",
  },
  {
    question: "¿Ofrecen talleres o eventos especiales?",
    answer:
      "Sí, ofrecemos talleres cada semana y también podemos ayudarte a organizar cumpleaños y team buildings. Si quieres dar un taller en Logic, contáctanos.",
  },
];

export default function FAQsPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-[#231f20] text-white min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#ecbb0c] mb-6 text-center">
          Preguntas Frecuentes
        </h1>
        <div>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="mb-4 p-4 bg-white text-black rounded-lg shadow-lg"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left font-semibold text-lg focus:outline-none"
              >
                {faq.question} {openIndex === index ? "▲" : "▼"}
              </button>
              {openIndex === index && (
                <p className="mt-2 text-gray-700">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
