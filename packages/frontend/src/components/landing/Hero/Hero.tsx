import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "./Hero.scss";
import { useNavigate } from "react-router-dom";
import Button from "../../common/Button";

const interactiveTourUrl = "https://view.genially.com/691f2119c3498b2b8303a23d";
const heroBackground = "/landing/logic-escape-room-hero.webp";

const statsValues = [
  { labelKey: "hero.stats.teams", value: "+2000" },
  { labelKey: "hero.stats.rating", value: "5/5" },
  { labelKey: "hero.stats.time", value: "60 min" },
];

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
              className="hero__button"
              variant="sun"
              pill
              onClick={() => openBooking()}
            >
              {t("hero.reserve")}
            </Button>
            <Button href="#rooms" className="hero__button" variant="ghost" pill>
              {t("hero.viewRooms")}
            </Button>
            <Button
              href={interactiveTourUrl}
              target="_blank"
              rel="noreferrer"
              className="hero__button"
              variant="interactive"
              pill
            >
              {t("hero.tourInteractive")}
            </Button>
          </motion.div>

          <motion.div
            className="hero__stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55 }}
          >
            {statsValues.map((stat, idx) => (
              <motion.div
                key={stat.labelKey}
                className="hero__stat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + idx * 0.05, duration: 0.6 }}
              >
                <span className="hero__stat-value">{stat.value}</span>
                <span className="hero__stat-label">{t(stat.labelKey)}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
