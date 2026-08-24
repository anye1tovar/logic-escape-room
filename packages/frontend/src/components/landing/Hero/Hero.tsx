import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "./Hero.scss";
import Button from "../../common/Button";

const heroBackground = "/landing/logic-escape-room-hero.webp";

const Hero = () => {
  const { t } = useTranslation();
  const titleHighlights = t("hero.titleHighlights", {
    returnObjects: true,
  }) as string[];
  const highlight =
    Array.isArray(titleHighlights) && titleHighlights.length > 0
      ? titleHighlights[0]
      : t("hero.titlePrefix");

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
            {t("hero.description")}
          </motion.p>

          <motion.div
            className="hero__cta"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45 }}
          >
            <Button
              href="#rooms"
              className="hero__button hero__button--featured"
              variant="sun"
              pill
            >
              {t("hero.viewRooms")}
            </Button>
            <Button
              href="#what-is-escape-room"
              className="hero__button hero__button--secondary"
              variant="interactive"
              pill
            >
              {t("hero.whatIsEscapeRoom")}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
