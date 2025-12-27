type BookingStepPaymentProps = {
  className?: string;
};

export default function BookingStepPayment({ className }: BookingStepPaymentProps) {
  const exampleCode = "LGC-7F3K2Q";

  return (
    <section className={className}>
      <header className="booking-step__header">
        <h2 className="booking-step__title">3. Pago</h2>
        <p className="booking-step__subtitle">
          Revisa el resumen y elige tu método de pago.
        </p>
      </header>

      <div className="booking-step__content">
        <div className="booking-form__section">
          <h3 className="booking-form__section-title">Resumen</h3>
          <div className="booking-summary">
            <div className="booking-summary__row">
              <span className="booking-summary__label">Sala</span>
              <span className="booking-summary__value">El Caso del Reloj</span>
            </div>
            <div className="booking-summary__row">
              <span className="booking-summary__label">Fecha</span>
              <span className="booking-summary__value">—</span>
            </div>
            <div className="booking-summary__row">
              <span className="booking-summary__label">Hora</span>
              <span className="booking-summary__value">—</span>
            </div>
            <div className="booking-summary__row">
              <span className="booking-summary__label">Jugadores</span>
              <span className="booking-summary__value">4</span>
            </div>
            <div className="booking-summary__divider" />
            <div className="booking-summary__row booking-summary__row--total">
              <span className="booking-summary__label">Total</span>
              <span className="booking-summary__value">$ —</span>
            </div>
          </div>
        </div>

        <div className="booking-form__section">
          <h3 className="booking-form__section-title">Método de pago</h3>
          <div className="booking-form__radios" role="radiogroup">
            <label className="booking-form__radio booking-form__radio--selected">
              <input type="radio" name="paymentMethod" defaultChecked />
              <div className="booking-form__radio-body">
                <div className="booking-form__radio-title">Tarjeta</div>
                <div className="booking-form__radio-desc">
                  Paga con débito o crédito.
                </div>
              </div>
            </label>
            <label className="booking-form__radio">
              <input type="radio" name="paymentMethod" />
              <div className="booking-form__radio-body">
                <div className="booking-form__radio-title">Transferencia</div>
                <div className="booking-form__radio-desc">
                  Bancolombia / Nequi / Daviplata.
                </div>
              </div>
            </label>
            <label className="booking-form__radio">
              <input type="radio" name="paymentMethod" />
              <div className="booking-form__radio-body">
                <div className="booking-form__radio-title">En sitio</div>
                <div className="booking-form__radio-desc">
                  Reserva y paga en la llegada.
                </div>
              </div>
            </label>
          </div>
          <label className="booking-form__checkbox">
            <input type="checkbox" />
            <span>
              Acepto los términos y confirmo que la información es correcta.
            </span>
          </label>
        </div>

        <div className="booking-form__section booking-form__section--code">
          <h3 className="booking-form__section-title">Código de consulta</h3>
          <p className="booking-form__hint">
            Al finalizar, podrás revisar el estado de tu reserva con este código
            en el módulo de consulta.
          </p>
          <div className="booking-code">
            <div className="booking-code__value" aria-label="Código de consulta">
              {exampleCode}
            </div>
            <a className="booking-code__link" href={`/consulta-reserva?code=${exampleCode}`}>
              Ir a consultar estado
            </a>
          </div>
        </div>
      </div>

      <footer className="booking-step__footer booking-step__footer--split">
        <button type="button" className="booking-actions__button booking-actions__button--ghost" disabled>
          Volver
        </button>
        <button type="button" className="booking-actions__button" disabled>
          Confirmar y pagar
        </button>
      </footer>
    </section>
  );
}

