import MailOutlineIcon from "@mui/icons-material/MailOutline";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import socials from "../../../assets/data/socials.json";
import "./Footer.scss";

type SocialItem = {
  platform: string;
  url: string;
  icon?: string;
};

const logicLogo = "/img/logic.png";

const Footer = () => {
  const { t } = useTranslation();
  const socialLinks = (socials as SocialItem[]).filter((item) => item.platform && item.url);

  const renderIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram":
        return <InstagramIcon />;
      case "facebook":
        return <FacebookIcon />;
      case "whatsapp":
        return <WhatsAppIcon />;
      case "tiktok":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M16.86 6.8c1.08.85 2.3 1.52 3.64 1.66v3.04c-1.36-.04-2.68-.43-3.9-1.08v4.98c0 3.7-2.95 6.7-6.59 6.7-1.86 0-3.54-.77-4.76-2.02C4.03 19.74 3.4 18.2 3.4 16.5c0-3.7 2.95-6.7 6.59-6.7.3 0 .6.02.89.07v3.25a3.37 3.37 0 0 0-.89-.12 3.42 3.42 0 0 0-3.4 3.5c0 1.91 1.52 3.46 3.4 3.46a3.42 3.42 0 0 0 3.4-3.46V2h3.07c0 .83.08 1.63.26 2.4.17.83.44 1.6.84 2.4z"
              fill="currentColor"
            />
          </svg>
        );
      case "youtube":
        return <YouTubeIcon />;
      default:
        return <span>{platform[0]}</span>;
    }
  };

  return (
    <footer className="footer" id="contact">
      <div className="footer__halo" />
      <div className="footer__container">
        <div className="footer__card">
          <div className="footer__header">
            <img
              src={logicLogo}
              alt="Logo Logic Escape Room"
              className="footer__logo"
            />
            <a
              className="footer__cta"
              href="https://wa.me/573181278688"
              target="_blank"
              rel="noreferrer"
            >
              <Typography variant="h6">{t("footer.cta")}</Typography>
              <MailOutlineIcon fontSize="small" sx={{ mb: 0.5 }} />
            </a>
          </div>

          <div className="footer__body">
            <div className="footer__title">
              <span>{t("footer.titleLine1")}</span>
              <span>{t("footer.titleLine2")}</span>
            </div>

            <div className="footer__contact">
              <div className="footer__contact-item">
                <p className="footer__label">H.Q.</p>
                <p className="footer__value">
                  {t("footer.address")}
                </p>
              </div>
              <div className="footer__contact-item">
                <p className="footer__label">P.</p>
                <a className="footer__value" href="https://wa.me/573181278688">
                  {t("footer.phone")}
                </a>
              </div>
              <div className="footer__contact-item">
                <p className="footer__label">E.</p>
                <a
                  className="footer__value"
                  href="mailto:escaperoom.logic@gmail.com"
                >
                  {t("footer.email")}
                </a>
              </div>
            </div>
          </div>

          <div className="footer__divider" />

          <div className="footer__bottom">
            <div className="footer__note">
              <span className="footer__bullet">•</span> {t("footer.note")}
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
                  {renderIcon(item.platform)}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
