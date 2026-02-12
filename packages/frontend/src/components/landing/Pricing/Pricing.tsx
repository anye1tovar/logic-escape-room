import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { fetchRates } from "../../../api/rates";
import type { ApiRate } from "../../../api/rates";
import "./Pricing.scss";

type RateItem = {
  players: number;
  price: number;
  currency: string;
  dayType: string;
  dayRange?: string;
  label?: string;
};

type RateGroup = {
  dayType: string;
  title: string;
  dayRange: string;
  note?: string;
  items: RateItem[];
};

const normalizeRate = (rate: ApiRate): RateItem => ({
  players:
    typeof rate.players === "number" ? rate.players : Number(rate.players) || 0,
  price:
    typeof rate.price_per_person === "number"
      ? rate.price_per_person
      : Number(rate.price_per_person) || 0,
  currency: rate.currency || "COP",
  dayType: rate.day_type || "weekday",
  dayRange: rate.day_range || "",
  label: rate.day_label || "",
});

const groupRatesFromApi = (
  items: RateItem[],
  fallbackMeta: RateGroup[]
): RateGroup[] => {
  const metaMap = new Map(
    fallbackMeta.map((group) => [
      group.dayType,
      { title: group.title, dayRange: group.dayRange, note: group.note },
    ])
  );

  const grouped: Record<string, RateGroup> = {};

  items.forEach((item) => {
    const key = item.dayType || "general";
    const meta = metaMap.get(key);

    if (!grouped[key]) {
      grouped[key] = {
        dayType: key,
        title: (item.label || "").trim() || meta?.title || key,
        dayRange: item.dayRange || meta?.dayRange || "",
        note: meta?.note,
        items: [],
      };
    }

    grouped[key].items.push(item);
  });

  const order = ["weekday", "weekend"];

  return Object.values(grouped)
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => b.players - a.players),
    }))
    .sort((a, b) => {
      const aIndex = order.indexOf(a.dayType);
      const bIndex = order.indexOf(b.dayType);

      if (aIndex === -1 && bIndex === -1)
        return a.dayType.localeCompare(b.dayType);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
};

const Pricing = () => {
  const { t, i18n } = useTranslation();
  const [groups, setGroups] = useState<RateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadRates() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRates();
        const normalized = Array.isArray(data)
          ? (data as ApiRate[]).map(normalizeRate)
          : [];

        if (!mounted) return;

        if (!normalized.length) {
          setError(t("pricing.error"));
          setGroups([]);
          return;
        }

        // We can pass an empty array as fallback since we don't want to use hardcoded fallbacks anymore
        setGroups(groupRatesFromApi(normalized, []));
      } catch (err) {
        console.error("Failed to load rates", err);
        if (mounted) {
          setError(t("pricing.error"));
          setGroups([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRates();
    return () => {
      mounted = false;
    };
  }, [t]);

  const leadLines = useMemo(() => {
    const lines = t("pricing.lead", { returnObjects: true }) as
      | string[]
      | string;
    if (Array.isArray(lines)) return lines;
    if (typeof lines === "string") return [lines];
    return [];
  }, [t]);

  const locale =
    i18n.language && i18n.language.startsWith("en") ? "en-US" : "es-CO";

  const formatPrice = (value: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(value);

  const groupsToRender = groups;

  return (
    <section className="pricing" id="pricing">
      <div className="pricing__halo" />
      <div className="pricing__header">
        <motion.div
          className="pricing__title-block"
          initial={{ x: -20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="pricing__title">
            <span>{t("pricing.title.line1")}</span>
            <span className="pricing__title-accent">
              {t("pricing.title.line2")}
            </span>
          </h2>
        </motion.div>

        <motion.div
          className="pricing__lead"
          initial={{ x: 20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {leadLines.map((line, idx) => (
            <p key={`${line}-${idx}`}>{line}</p>
          ))}
          {error && (
            <div className="pricing__error-container">
              <p className="pricing__notice">{error}</p>
              <a
                href={`https://wa.me/573181278688?text=${encodeURIComponent(
                  t(
                    "pricing.whatsappMessage",
                    "Hola, ocurrio un error al obtener los datos en la página web, me puedes dar la información sobre las salas de escape por este medio, por favor"
                  )
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pricing__whatsapp-link"
              >
                {t("pricing.whatsappCta", "Enviar mensaje al 3181278688")}
              </a>
            </div>
          )}
        </motion.div>
      </div>

      <div className="pricing__layout">
        <div className="pricing__cards">
          {groupsToRender.map((group, idx) => (
            <motion.article
              key={group.dayType}
              className="pricing__card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
            >
              <div className="pricing__card-header">
                <h2 className="pricing__card-label">{group.title}</h2>
                <p className="pricing__card-range">{group.dayRange}</p>
              </div>

              <div className="pricing__list">
                {group.items.map((item) => (
                  <div
                    key={`${group.dayType}-${item.players}`}
                    className="pricing__row"
                  >
                    <span className="pricing__players">
                      {item.players} {t("rooms.labels.players")}
                    </span>
                    <span className="pricing__price">
                      {formatPrice(item.price, item.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="pricing__card-note">
                {group.dayType === "weekday"
                  ? t("pricing.footer.weekday")
                  : t("pricing.footer.weekend")}
              </h3>
            </motion.article>
          ))}
          {loading && (
            <div className="pricing__loading">
              {t("pricing.loading", "Cargando tarifas...")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
