import { motion } from "framer-motion";
import "./AnnouncementBar.scss";

type AnnouncementBarProps = {
  text: string;
  fixed?: boolean;
};

const AnnouncementBar = ({ text, fixed = false }: AnnouncementBarProps) => {
  const classes = `announcement-bar${fixed ? " announcement-bar--fixed" : ""}`;
  return (
    <motion.div
      className={classes}
      initial={fixed ? { y: -100, opacity: 0 } : { opacity: 0 }}
      animate={fixed ? { y: 0, opacity: 1 } : { opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="announcement-bar__container">
        <motion.div className="announcement-bar__content">
          <div className="announcement-bar__marquee" aria-live="polite">
            <motion.div
              className="announcement-bar__marquee-track"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <span className="announcement-bar__text">{text}</span>
              <span className="announcement-bar__text">{text}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="announcement-bar__gradient-border"
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

export default AnnouncementBar;
