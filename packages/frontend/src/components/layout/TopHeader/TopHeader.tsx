import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import "./TopHeader.scss";

const TopHeader = () => {
  const [isVisible, setIsVisible] = useState(true);

  const { t } = useTranslation();

  const announcements = [
    {
      id: 1,
      text: t("topHeader.announcement"),
      link: "#pricing",
      linkText: t("topHeader.bookNow"),
    },
  ];

  const currentAnnouncement = announcements[0];

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="top-header"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="top-header__container">
            <motion.div
              className="top-header__content"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: "reverse",
                repeatDelay: 3,
              }}
            >
              <span className="top-header__text">
                {currentAnnouncement.text}
              </span>
              <motion.a
                href={currentAnnouncement.link}
                className="top-header__link"
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                {currentAnnouncement.linkText}
                <motion.span
                  className="top-header__arrow"
                  animate={{ x: [0, 5, 0] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  →
                </motion.span>
              </motion.a>
            </motion.div>

            <motion.button
              className="top-header__close"
              onClick={handleClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              aria-label={t("topHeader.closeAria")}
            >
              ✕
            </motion.button>
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
      )}
    </AnimatePresence>
  );
};

export default TopHeader;
