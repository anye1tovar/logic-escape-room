import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import "./BookingStatus.scss";

export default function BookingStatus() {
  return (
    <div className="booking-status">
      <Header />

      <main className="booking-status__main">
        <div className="booking-status__container">
          <header className="booking-status__header">
            <div className="booking-status__title-block">
              <p className="booking-status__eyebrow">Consulta</p>
              <h1 className="booking-status__title">
                <span>Estado de</span>
                <span className="booking-status__title-accent">Tu Reserva</span>
              </h1>
            </div>

            <div className="booking-status__copy">
              <p className="booking-status__subtitle">
                Ingresa tu código de consulta para ver el estado de la reserva.
              </p>
              <p className="booking-status__meta">
                El código se genera al finalizar el paso de pago.
              </p>
            </div>
          </header>

          <section className="booking-status__panel" aria-label="Formulario de consulta">
            <div className="booking-status__form">
              <label className="booking-status__field">
                <span className="booking-status__label">Código de consulta</span>
                <input
                  className="booking-status__input"
                  type="text"
                  placeholder="Ej: LGC-7F3K2Q"
                />
              </label>
              <button type="button" className="booking-status__button" disabled>
                Consultar
              </button>
            </div>

            <div className="booking-status__result" aria-live="polite">
              <div className="booking-status__result-card">
                <h2 className="booking-status__result-title">Resultado</h2>
                <p className="booking-status__result-text">
                  Aún no se ha realizado una consulta. Ingresa un código para ver
                  el estado aquí.
                </p>

                <div className="booking-status__timeline" aria-label="Estado">
                  <div className="booking-status__timeline-item booking-status__timeline-item--active">
                    <span className="booking-status__dot" />
                    <div className="booking-status__timeline-body">
                      <div className="booking-status__timeline-title">
                        Registrada
                      </div>
                      <div className="booking-status__timeline-desc">
                        Reserva creada y pendiente de confirmación.
                      </div>
                    </div>
                  </div>

                  <div className="booking-status__timeline-item">
                    <span className="booking-status__dot" />
                    <div className="booking-status__timeline-body">
                      <div className="booking-status__timeline-title">
                        Confirmada
                      </div>
                      <div className="booking-status__timeline-desc">
                        Pago validado y cupo asegurado.
                      </div>
                    </div>
                  </div>

                  <div className="booking-status__timeline-item">
                    <span className="booking-status__dot" />
                    <div className="booking-status__timeline-body">
                      <div className="booking-status__timeline-title">
                        Finalizada
                      </div>
                      <div className="booking-status__timeline-desc">
                        Experiencia completada.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="booking-status__note">
                  <span className="booking-status__note-title">
                    Consejo rápido:
                  </span>{" "}
                  guarda tu código en WhatsApp o en tu correo para consultarlo
                  cuando lo necesites.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

