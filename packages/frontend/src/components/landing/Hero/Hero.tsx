import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "./Hero.scss";
import { useNavigate } from "react-router-dom";
import Button from "../../common/Button";

const heroBackground = "/landing/logic-escape-room-hero.webp";

const Hero = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openBooking = () => {
    navigate("/reservar");
  };

  const titleHighlights = t("hero.titleHighlights", {
    returnObjects: true,
  }) as string[];
  const highlight =
    Array.isArray(titleHighlights) && titleHighlights.length > 0
      ? titleHighlights[0]
      : t("hero.titlePrefix");
  const leadHighlight = t("hero.descriptionHighlight");
  const leadParts = t("hero.description").split(leadHighlight);

  return (
    <section className="hero" id="home">
      <div className="hero__background" aria-hidden="true">
        <img
          src={heroBackground}
          alt=""
          className="hero__background-image"
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="hero__grid">
        <motion.div
          className="hero__copy"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          <motion.h1
            className="hero__title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.25, ease: "easeOut" }}
          >
            {t("hero.titlePrefix")}{" "}
            <span className="hero__title-highlight">{highlight}</span>
          </motion.h1>

          <motion.p
            className="hero__lead"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.35, ease: "easeOut" }}
          >
            {leadParts[0]}
            <br />
            <span className="hero__lead-highlight">{leadHighlight}</span>
            {leadParts[1]}
          </motion.p>

          <motion.div
            className="hero__cta"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45 }}
          >
            <Button
              className="hero__button"
              variant="sun"
              pill
              onClick={() => openBooking()}
            >
              {t("hero.reserve")}
            </Button>
            <Button
              href="#rooms"
              className="hero__button--interactive"
              variant="interactive"
              pill
            >
              {t("hero.viewRooms")}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
