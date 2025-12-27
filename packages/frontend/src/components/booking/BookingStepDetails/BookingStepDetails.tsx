type BookingStepDetailsProps = {
  className?: string;
};

export default function BookingStepDetails({
  className,
}: BookingStepDetailsProps) {
  return (
    <section className={className}>
      <header className="booking-step__header">
        <h2 className="booking-step__title">2. Datos</h2>
        <p className="booking-step__subtitle">
          Cuéntanos quién reserva y cómo podemos contactarte.
        </p>
      </header>

      <div className="booking-step__content">
        <div className="booking-form__grid booking-form__grid--two">
          <label className="booking-form__field">
            <span className="booking-form__label">Nombre completo</span>
            <input
              className="booking-form__input"
              type="text"
              placeholder="Tu nombre y apellido"
            />
          </label>
          <label className="booking-form__field">
            <span className="booking-form__label">Correo</span>
            <input
              className="booking-form__input"
              type="email"
              placeholder="tucorreo@ejemplo.com"
            />
          </label>
          <label className="booking-form__field">
            <span className="booking-form__label">Número de whatsapp</span>
            <input
              className="booking-form__input"
              type="tel"
              placeholder="300 000 0000"
            />
          </label>
        </div>

        <div className="booking-form__section">
          <h3 className="booking-form__section-title">Notas</h3>
          <label className="booking-form__field">
            <span className="booking-form__label">Indicaciones especiales</span>
            <textarea
              className="booking-form__textarea"
              placeholder="Cumpleaños, accesibilidad, claustrofobia, etc."
              rows={4}
            />
          </label>
        </div>
      </div>

      <footer className="booking-step__footer booking-step__footer--split">
        <button
          type="button"
          className="booking-actions__button booking-actions__button--ghost"
          disabled
        >
          Volver
        </button>
        <button type="button" className="booking-actions__button" disabled>
          Continuar
        </button>
      </footer>
    </section>
  );
}
