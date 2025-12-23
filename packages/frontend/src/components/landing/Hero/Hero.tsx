import { motion } from "framer-motion";
import logicLogo from "../../../assets/img/logic.png";
import "./Hero.scss";

const Hero = () => {
  return (
    <section className="hero" id="home">
      <motion.div
        className="hero__content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
      >
        <motion.img
          src={logicLogo}
          alt="Logic Escape Room"
          className="hero__logo"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeInOut", delay: 0.2 }}
        >
          ¿PODRÁS ESCAPAR EN 60 MINUTOS?
        </motion.h2>
      </motion.div>
    </section>
  );
};

export default Hero;
