import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import opinionsData from "../../../assets/data/opinions.json";
import OpinionCard from "../../common/OpinionCard";
import type { Opinion } from "../../common/OpinionCard";
import "./Opinions.scss";

const GOOGLE_REVIEWS_URL = "https://maps.app.goo.gl/XC3GgNicYAaekga16";

const getPerView = () => {
  if (typeof window === "undefined") return 3;
  const width = window.innerWidth;
  if (width <= 768) return 1;
  if (width <= 1100) return 2;
  return 3;
};

const Opinions = () => {
  const { t } = useTranslation();
  const opinions = useMemo(
    () =>
      (opinionsData as Opinion[]).filter(
        (opinion) => opinion && opinion.name && opinion.text
      ),
    []
  );

  const [current, setCurrent] = useState(0);
  const [perView, setPerView] = useState(getPerView);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    const handleResize = () => setPerView(getPerView());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showNext = () => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % opinions.length);
  };

  const showPrev = () => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + opinions.length) % opinions.length);
  };

  const visibleOpinions = useMemo(() => {
    const result: Opinion[] = [];
    for (let i = 0; i < Math.min(perView, opinions.length); i += 1) {
      result.push(opinions[(current + i) % opinions.length]);
    }
    return result;
  }, [current, opinions, perView]);

  return (
    <section className="opinions" id="opinions">
      <div className="opinions__halo" />
      <div className="opinions__content">
        <header className="opinions__header">
          <p className="opinions__eyebrow">
            {t("opinions.eyebrow", "Testimonios")}
          </p>
          <h2>{t("opinions.title", "Opiniones de nuestros usuarios")}</h2>
          <p className="opinions__lead">
            {t(
              "opinions.lead",
              "Historias reales de grupos que ya vivieron la experiencia Logic."
            )}
          </p>
          <div className="opinions__actions">
            <a
              className="opinions__reviews-link"
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noreferrer"
            >
              {t(
                "opinions.actions.viewAll",
                "Ver todas en Google Reviews \u2197"
              )}
            </a>
          </div>
        </header>

        <div className="opinions__carousel">
          <button
            type="button"
            className="opinions__arrow opinions__arrow--prev"
            onClick={showPrev}
            aria-label={t(
              "opinions.actions.prevAria",
              "Opiniones anteriores"
            )}
          >
            {t("opinions.actions.prev", "\u2039")}
          </button>
          <div className="opinions__viewport">
            <AnimatePresence
              initial={false}
              custom={direction}
              mode="popLayout"
            >
              <motion.div
                key={`${current}-${perView}`}
                className="opinions__track"
                custom={direction}
                initial="enter"
                animate="center"
                exit="exit"
                variants={{
                  enter: (dir: 1 | -1) => ({
                    x: dir === 1 ? 40 : -40,
                    opacity: 0,
                  }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: 1 | -1) => ({
                    x: dir === 1 ? -40 : 40,
                    opacity: 0,
                  }),
                }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                {visibleOpinions.map((opinion, idx) => (
                  <OpinionCard
                    opinion={opinion}
                    index={current + idx}
                    key={`${opinion.name}-${current + idx}`}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          <button
            type="button"
            className="opinions__arrow opinions__arrow--next"
            onClick={showNext}
            aria-label={t("opinions.actions.nextAria", "Opiniones siguientes")}
          >
            {t("opinions.actions.next", "\u203a")}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Opinions;
