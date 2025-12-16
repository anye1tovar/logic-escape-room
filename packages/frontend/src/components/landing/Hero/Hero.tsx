import { motion } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import { useTranslation } from "react-i18next";
import { useBookingModal } from "../../../contexts/BookingModalContext";
import "./Hero.scss";

const Hero = () => {
  // Variantes de animación para los elementos
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const,
      },
    },
  };

  const floatingVariants = {
    initial: {
      y: 0,
    },
    animate: {
      y: [0, -20, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
  };

  const { t } = useTranslation();
  const { openBooking } = useBookingModal();

  const typeSequence = [
    ...(t("hero.titleHighlights", { returnObjects: true }) as string[]),
  ];

  return (
    <section className="hero" id="home">
      {/* Background animado */}
      <div className="hero__background">
        <motion.div
          className="hero__background-gradient hero__background-gradient--1"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="hero__background-gradient hero__background-gradient--2"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </div>

      {/* Grid pattern */}
      <div className="hero__grid" />

      <motion.div
        className="hero__container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Contenido principal */}
        <div className="hero__content">
          <motion.div className="hero__badge" variants={itemVariants}>
            <span className="hero__badge-icon">⚡</span>
            <span className="hero__badge-text">{t("hero.badge")}</span>
          </motion.div>

          <motion.h1 className="hero__title" variants={itemVariants}>
            {t("hero.titlePrefix")}{" "}
            <span className="hero__title-highlight">
              <TypeAnimation
                sequence={[
                  "Logic Escape Room",
                  3000,
                  "Una Aventura Única",
                  3000,
                  "Un Reto Inolvidable",
                  3000,
                ]}
                wrapper="span"
                speed={50}
                repeat={Infinity}
              />
            </span>
          </motion.h1>

          <motion.p className="hero__description" variants={itemVariants}>
            {t("hero.description")}
          </motion.p>

          <motion.div className="hero__cta" variants={itemVariants}>
            <motion.button
              type="button"
              className="hero__button hero__button--primary"
              onClick={() => openBooking()}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(139, 92, 246, 0.4)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span>{t("hero.reserve")}</span>
              <motion.span
                className="hero__button-arrow"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.button>

            <motion.a
              href="#rooms"
              className="hero__button hero__button--secondary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t("hero.viewRooms")}
            </motion.a>
          </motion.div>

          {/* Stats */}
          <motion.div className="hero__stats" variants={itemVariants}>
            <div className="hero__stat">
              <motion.span
                className="hero__stat-number"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: "spring", stiffness: 200 }}
              >
                500+
              </motion.span>
              <span className="hero__stat-label">{t("hero.stats.teams")}</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <motion.span
                className="hero__stat-number"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
              >
                4.9/5
              </motion.span>
              <span className="hero__stat-label">{t("hero.stats.rating")}</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <motion.span
                className="hero__stat-number"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
              >
                60min
              </motion.span>
              <span className="hero__stat-label">{t("hero.stats.time")}</span>
            </div>
          </motion.div>
        </div>

        {/* Imagen/Ilustración flotante */}
        <motion.div
          className="hero__image"
          variants={floatingVariants}
          initial="initial"
          animate="animate"
        >
          <div className="hero__image-wrapper">
            {/* Iconos decorativos */}
            <motion.div
              className="hero__icon hero__icon--1"
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              🔐
            </motion.div>
            <motion.div
              className="hero__icon hero__icon--2"
              animate={{
                rotate: -360,
                scale: [1, 1.3, 1],
              }}
              transition={{
                rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                scale: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                },
              }}
            >
              🧩
            </motion.div>
            <motion.div
              className="hero__icon hero__icon--3"
              animate={{
                rotate: 360,
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotate: { duration: 25, repeat: Infinity, ease: "linear" },
                scale: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                },
              }}
            >
              🔑
            </motion.div>
            <motion.div
              className="hero__icon hero__icon--4"
              animate={{
                rotate: -360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 18, repeat: Infinity, ease: "linear" },
                scale: {
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.5,
                },
              }}
            >
              ⏱️
            </motion.div>

            {/* Placeholder para imagen - puedes reemplazar con una imagen real */}
            <div className="hero__image-placeholder">
              <span className="hero__image-emoji">🎭</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="hero__scroll"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <motion.div
          className="hero__scroll-indicator"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span>↓</span>
        </motion.div>
        <span className="hero__scroll-text">{t("hero.scrollText")}</span>
      </motion.div>
    </section>
  );
};

export default Hero;
