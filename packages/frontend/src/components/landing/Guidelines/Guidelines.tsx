import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "./Guidelines.scss";

type Rule = {
  title: string;
  lines: string[];
};

const Guidelines = () => {
  const { t } = useTranslation();

  const rules =
    (t("guidelines.rules", { returnObjects: true }) as Rule[]) || [];
  const fact = t("guidelines.fact.copy");

  return (
    <section className="guidelines" id="guidelines">
      <div className="guidelines__halo" />
      <div className="guidelines__content">
        <div className="guidelines__header">
          <h2>{t("guidelines.title")}</h2>
          <p className="guidelines__subtitle">{t("guidelines.subtitle")}</p>
        </div>

        <div className="guidelines__rules">
          {rules.map((rule, idx) => (
            <motion.div
              key={rule.title}
              className="guidelines__rule"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
            >
              <div className="guidelines__icon">!</div>
              <div className="guidelines__rule-text">
                <h3 className="guidelines__rule-line">
                  {[rule.title, ...(rule.lines || [])]
                    .map((part) => part.trim())
                    .filter(Boolean)
                    .join(" ")}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="guidelines__footer">
          <div className="guidelines__fact">
            <p className="guidelines__fact-label">
              {t("guidelines.fact.label")}
            </p>
            <p className="guidelines__fact-copy">{fact}</p>
          </div>
          <div className="guidelines__cta">
            <p>{t("guidelines.cta")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Guidelines;
