import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import "./Header.scss";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import coFlag from "../../../assets/icons/co.svg";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import usFlag from "../../../assets/icons/us.svg";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  // Efecto de blur en el header al hacer scroll
  const headerBlur = useTransform(
    scrollY,
    [0, 100],
    ["blur(0px)", "blur(10px)"]
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const { t, i18n } = useTranslation();

  const menuItems = [
    { name: t("header.menu.0"), href: "#home" },
    { name: t("header.menu.1"), href: "#rooms" },
    { name: t("header.menu.2"), href: "#about" },
    { name: t("header.menu.3"), href: "#pricing" },
    { name: t("header.menu.4"), href: "#contact" },
  ];
  const otherLang =
    i18n.language && i18n.language.startsWith("en") ? "es" : "en";

  return (
    <motion.header
      className={`header ${isScrolled ? "header--scrolled" : ""}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="header__container">
        {/* Logo */}
        <motion.div
          className="header__logo"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <a href="#home">
            <span className="header__logo-icon">🔐</span>
            <span className="header__logo-text">
              Logic <span className="header__logo-highlight">Escape</span>
            </span>
          </a>
        </motion.div>

        {/* Desktop Navigation */}
        <nav className="header__nav header__nav--desktop">
          {menuItems.map((item, index) => (
            <motion.a
              key={item.name}
              href={item.href}
              className="header__nav-link"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.1, color: "#8b5cf6" }}
              whileTap={{ scale: 0.95 }}
            >
              {item.name}
            </motion.a>
          ))}
        </nav>

        {/* Language selector: show flag for the OTHER language (click to switch) */}
        <div className="header__lang">
          <button
            type="button"
            className="header__lang-button"
            onClick={() => i18n.changeLanguage(otherLang)}
            aria-label={
              otherLang === "en" ? "Switch to English" : "Cambiar a español"
            }
            title={otherLang === "en" ? "English" : "Español"}
          >
            <img
              key={otherLang}
              src={otherLang === "en" ? usFlag : coFlag}
              alt={otherLang === "en" ? "English" : "Español"}
              className="flag-img"
            />
          </button>
        </div>

        {/* CTA Button */}
        <motion.div
          className="header__cta"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.a
            href="#booking"
            className="header__cta-button"
            whileHover={{
              scale: 1.05,
              boxShadow: "0 10px 30px rgba(139, 92, 246, 0.4)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            {t("header.bookNow")}
          </motion.a>
        </motion.div>

        {/* Mobile Menu Button */}
        <motion.button
          className={`header__menu-toggle ${
            isMenuOpen ? "header__menu-toggle--open" : ""
          }`}
          onClick={toggleMenu}
          whileTap={{ scale: 0.9 }}
        >
          <span></span>
          <span></span>
          <span></span>
        </motion.button>
      </div>

      {/* Mobile Navigation */}
      <motion.nav
        className={`header__nav header__nav--mobile ${
          isMenuOpen ? "header__nav--mobile-open" : ""
        }`}
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: isMenuOpen ? 1 : 0,
          height: isMenuOpen ? "auto" : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        {menuItems.map((item, index) => (
          <motion.a
            key={item.name}
            href={item.href}
            className="header__nav-link"
            onClick={() => setIsMenuOpen(false)}
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: isMenuOpen ? 1 : 0,
              x: isMenuOpen ? 0 : -20,
            }}
            transition={{ delay: index * 0.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {item.name}
          </motion.a>
        ))}
        <div className="header__lang header__lang--mobile">
          <button
            type="button"
            className="header__lang-button"
            onClick={() => {
              i18n.changeLanguage(otherLang);
              setIsMenuOpen(false);
            }}
            aria-label={
              otherLang === "en" ? "Switch to English" : "Cambiar a español"
            }
            title={otherLang === "en" ? "English" : "Español"}
          >
            <img
              key={otherLang}
              src={otherLang === "en" ? usFlag : coFlag}
              alt={otherLang === "en" ? "English" : "Español"}
              className="flag-img"
            />
          </button>
        </div>
        <motion.a
          href="#booking"
          className="header__nav-link header__nav-link--cta"
          onClick={() => setIsMenuOpen(false)}
          initial={{ opacity: 0, x: -20 }}
          animate={{
            opacity: isMenuOpen ? 1 : 0,
            x: isMenuOpen ? 0 : -20,
          }}
          transition={{ delay: menuItems.length * 0.1 }}
        >
          {t("header.bookNow")}
        </motion.a>
      </motion.nav>
    </motion.header>
  );
};

export default Header;
