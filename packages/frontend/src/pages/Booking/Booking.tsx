import { useEffect, useRef, useState } from "react";
import BookingStepDetails from "../../components/booking/BookingStepDetails";
import BookingStepPayment from "../../components/booking/BookingStepPayment";
import BookingStepSelection from "../../components/booking/BookingStepSelection";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import "./Booking.scss";

export default function Booking() {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const step1Ref = useRef<HTMLDivElement | null>(null);
  const step2Ref = useRef<HTMLDivElement | null>(null);
  const step3Ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

    const ref =
      activeStep === 1 ? step1Ref : activeStep === 2 ? step2Ref : step3Ref;

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
                Completa el proceso en 3 pasos: selección, datos y pago.
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
                  <span className="booking__step-title">Pago</span>
                  <span className="booking__step-desc">Resumen y confirmación</span>
                </span>
              </li>
            </ol>
          </nav>

          <div className="booking__panels">
            <div
              className={`booking__panel ${
                activeStep === 1 ? "booking__panel--active" : ""
              }`}
              ref={step1Ref}
            >
              <BookingStepSelection
                onComplete={(output) => {
                  void output;
                  setActiveStep(2);
                }}
              />
            </div>

            <div
              className={`booking__panel ${
                activeStep < 2 ? "booking__panel--locked" : ""
              }`}
              aria-disabled={activeStep < 2 ? "true" : undefined}
              ref={step2Ref}
            >
              {activeStep < 2 && (
                <div className="booking__panel-overlay">
                  Completa el paso 1 para continuar
                </div>
              )}
              <BookingStepDetails
                onComplete={(output) => {
                  void output;
                  setActiveStep(3);
                }}
              />
            </div>

            <div
              className={`booking__panel ${
                activeStep < 3 ? "booking__panel--locked" : ""
              }`}
              aria-disabled={activeStep < 3 ? "true" : undefined}
              ref={step3Ref}
            >
              {activeStep < 3 && (
                <div className="booking__panel-overlay">
                  Completa los pasos anteriores para continuar
                </div>
              )}
              <BookingStepPayment />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
