import { useEffect, useRef, useState } from "react";
import BookingStepDetails from "../../components/booking/BookingStepDetails";
import BookingStepPayment from "../../components/booking/BookingStepPayment";
import BookingStepSelection from "../../components/booking/BookingStepSelection";
import BookingStepSummary from "../../components/booking/BookingStepSummary";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import "./Booking.scss";
import type { BookingStep1Output } from "../../components/booking/BookingStepSelection/BookingStepSelection";
import type { BookingDetailsFormValues } from "../../components/booking/BookingStepDetails/BookingStepDetails";

export default function Booking() {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [step1Data, setStep1Data] = useState<BookingStep1Output | null>(null);
  const [step2Data, setStep2Data] = useState<BookingDetailsFormValues | null>(
    null
  );
  const [reservationCode, setReservationCode] = useState<string | null>(null);
  const [reservedTotal, setReservedTotal] = useState<number | null>(null);
  const step1Ref = useRef<HTMLDivElement | null>(null);
  const step2Ref = useRef<HTMLDivElement | null>(null);
  const step3Ref = useRef<HTMLDivElement | null>(null);
  const step4Ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

    const ref =
      activeStep === 1
        ? step1Ref
        : activeStep === 2
          ? step2Ref
          : activeStep === 3
            ? step3Ref
            : step4Ref;

    ref.current?.scrollIntoView({ behavior, block: "start" });
  }, [activeStep]);

  return (
    <div className="booking">
      <Header />

      <main className="booking__main">
        <div className="booking__container">
          <header className="booking__header">
            <div className="booking__title-block">
              <p className="booking__eyebrow">Reservas</p>
              <h1 className="booking__title">
                <span>Reserva tu</span>
                <span className="booking__title-accent">Experiencia</span>
              </h1>
            </div>

            <div className="booking__copy">
              <p className="booking__subtitle">
                Completa el proceso en 4 pasos: selección, datos, resumen y pago.
              </p>
              <div className="booking__helper">
                <span>¿Ya tienes un código?</span>{" "}
                <a className="booking__helper-link" href="/consulta-reserva">
                  Consultar estado de reserva
                </a>
              </div>
            </div>
          </header>

          <nav className="booking__stepper" aria-label="Flujo de reserva">
            <ol className="booking__steps">
              <li
                className={`booking__step ${
                  activeStep === 1 ? "booking__step--active" : ""
                }`}
                aria-current={activeStep === 1 ? "step" : undefined}
              >
                <span className="booking__step-index">1</span>
                <span className="booking__step-text">
                  <span className="booking__step-title">Selección</span>
                  <span className="booking__step-desc">Sala, fecha y hora</span>
                </span>
              </li>
              <li
                className={`booking__step ${
                  activeStep === 2 ? "booking__step--active" : ""
                } ${activeStep < 2 ? "booking__step--locked" : ""}`}
                aria-current={activeStep === 2 ? "step" : undefined}
              >
                <span className="booking__step-index">2</span>
                <span className="booking__step-text">
                  <span className="booking__step-title">Datos</span>
                  <span className="booking__step-desc">Contacto y notas</span>
                </span>
              </li>
              <li
                className={`booking__step ${
                  activeStep === 3 ? "booking__step--active" : ""
                } ${activeStep < 3 ? "booking__step--locked" : ""}`}
                aria-current={activeStep === 3 ? "step" : undefined}
              >
                <span className="booking__step-index">3</span>
                <span className="booking__step-text">
                  <span className="booking__step-title">Resumen</span>
                  <span className="booking__step-desc">Revisa y reserva</span>
                </span>
              </li>
              <li
                className={`booking__step ${
                  activeStep === 4 ? "booking__step--active" : ""
                } ${activeStep < 4 ? "booking__step--locked" : ""}`}
                aria-current={activeStep === 4 ? "step" : undefined}
              >
                <span className="booking__step-index">4</span>
                <span className="booking__step-text">
                  <span className="booking__step-title">Pago</span>
                  <span className="booking__step-desc">
                    Instrucciones y código
                  </span>
                </span>
              </li>
            </ol>
          </nav>

          <div className="booking__panels">
            <div
              className={`booking__panel ${
                activeStep === 1 ? "booking__panel--active" : "booking__panel--locked"
              }`}
              ref={step1Ref}
              aria-disabled={activeStep === 1 ? undefined : "true"}
            >
              {activeStep !== 1 && (
                <div className="booking__panel-overlay">
                  Presiona “Volver” para editar este paso
                </div>
              )}
              <BookingStepSelection
                onComplete={(output) => {
                  setStep1Data(output);
                  setStep2Data(null);
                  setReservationCode(null);
                  setReservedTotal(null);
                  setActiveStep(2);
                }}
              />
            </div>

            <div
              className={`booking__panel ${
                activeStep === 2 ? "" : "booking__panel--locked"
              }`}
              aria-disabled={activeStep === 2 ? undefined : "true"}
              ref={step2Ref}
            >
              {activeStep !== 2 && (
                <div className="booking__panel-overlay">
                  {activeStep < 2
                    ? "Completa el paso 1 para continuar"
                    : "Presiona “Volver” para editar este paso"}
                </div>
              )}
              <BookingStepDetails
                onBack={() => setActiveStep(1)}
                onComplete={(output) => {
                  setStep2Data(output);
                  setActiveStep(3);
                }}
              />
            </div>

            <div
              className={`booking__panel ${
                activeStep === 3 ? "" : "booking__panel--locked"
              }`}
              aria-disabled={activeStep === 3 ? undefined : "true"}
              ref={step3Ref}
            >
              {activeStep !== 3 && (
                <div className="booking__panel-overlay">
                  {activeStep < 3
                    ? "Completa los pasos anteriores para continuar"
                    : "Este paso ya fue confirmado"}
                </div>
              )}
              <BookingStepSummary
                selection={step1Data}
                details={step2Data}
                onBack={() => setActiveStep(2)}
                onReserved={(result) => {
                  setReservationCode(result.reservationCode);
                  setReservedTotal(
                    typeof result.total === "number" ? result.total : null
                  );
                  setActiveStep(4);
                }}
              />
            </div>

            <div
              className={`booking__panel ${
                activeStep === 4 ? "" : "booking__panel--locked"
              }`}
              aria-disabled={activeStep === 4 ? undefined : "true"}
              ref={step4Ref}
            >
              {activeStep !== 4 && (
                <div className="booking__panel-overlay">
                  {activeStep < 4
                    ? "Crea la reserva en el paso 3 para continuar"
                    : "Paso bloqueado"}
                </div>
              )}
              <BookingStepPayment
                selection={step1Data}
                details={step2Data}
                reservationCode={reservationCode}
                quoteTotal={reservedTotal}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
