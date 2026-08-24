import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "./EscapeRoomIntro.scss";

const escapeRoomVideo = "https://www.youtube.com/embed/LU_o6OZo6_I";

const EscapeRoomIntro = () => {
  const { t } = useTranslation();

  return (
    <section className="escape-intro" id="what-is-escape-room">
      <div className="escape-intro__content">
        <motion.div
          className="escape-intro__copy"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="escape-intro__eyebrow">
            {t("escapeIntro.eyebrow")}
          </p>
          <h2 className="escape-intro__title">{t("escapeIntro.title")}</h2>
          <p className="escape-intro__text">{t("escapeIntro.copy")}</p>
        </motion.div>

        <motion.div
          className="escape-intro__video"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <iframe
            src={escapeRoomVideo}
            title={t("escapeIntro.videoTitle")}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </motion.div>
      </div>
    </section>
  );
};

export default EscapeRoomIntro;
