import socials from "../../../assets/data/socials.json";
import "./Footer.scss";

type SocialItem = {
  platform: string;
  url: string;
  icon?: string;
};

const Footer = () => {
  const socialLinks = (socials as SocialItem[]).filter((item) => item.platform && item.url);

  return (
    <footer className="footer" id="contact">
      <div className="footer__halo" />
      <div className="footer__container">
        <div className="footer__card">
          <div className="footer__header">
            <div className="footer__logo">Logic</div>
            <a
              className="footer__cta"
              href="https://wa.me/573181278688"
              target="_blank"
              rel="noreferrer"
            >
              Contáctanos
            </a>
          </div>

          <div className="footer__body">
            <div className="footer__title">
              <span>Comunícate</span>
              <span>con nosotros.</span>
            </div>

            <div className="footer__contact">
              <div className="footer__contact-item">
                <p className="footer__label">H.Q.</p>
                <p className="footer__value">Cl. 32 #5-72 3 piso, Tunja, Boyacá</p>
              </div>
              <div className="footer__contact-item">
                <p className="footer__label">P.</p>
                <a className="footer__value" href="tel:+573181278688">
                  318 1278688
                </a>
              </div>
              <div className="footer__contact-item">
                <p className="footer__label">E.</p>
                <a className="footer__value" href="mailto:logictunja@gmail.com">
                  logictunja@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="footer__divider" />

          <div className="footer__bottom">
            <div className="footer__note">
              <span className="footer__bullet">•</span> Escríbenos y reserva tu aventura
            </div>
            <div className="footer__socials">
              {socialLinks.map((item) => (
                <a
                  key={item.platform}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.platform}
                  className="footer__social"
                  title={item.platform}
                >
                  <span>{item.icon || item.platform[0]}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="footer__divider footer__divider--thin" />

          <div className="footer__credits">
            <span>© Diseño de interacción 2025</span>
            <a
              className="footer__cta footer__cta--ghost"
              href="https://wa.me/573181278688"
              target="_blank"
              rel="noreferrer"
            >
              Contáctanos
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
