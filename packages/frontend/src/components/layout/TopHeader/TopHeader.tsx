import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "./TopHeader.scss";

const TopHeader = () => {
  const { t } = useTranslation();

  const announcements = [
    {
      id: 1,
      text: t("topHeader.announcement"),
    },
  ];

  const currentAnnouncement = announcements[0];

  return (
    <motion.div
      className="top-header"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
          <div className="top-header__container">
            <motion.div className="top-header__content">
              <div className="top-header__marquee" aria-live="polite">
                <motion.div
                  className="top-header__marquee-track"
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <span className="top-header__text">
                    {currentAnnouncement.text}
                  </span>
                  <span className="top-header__text">
                    {currentAnnouncement.text}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </div>

      {/* Animated gradient border */}
      <motion.div
        className="top-header__gradient-border"
        animate={{
          background: [
            "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899, #6366f1)",
            "linear-gradient(90deg, #8b5cf6, #ec4899, #6366f1, #8b5cf6)",
            "linear-gradient(90deg, #ec4899, #6366f1, #8b5cf6, #ec4899)",
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
};

export default TopHeader;
