import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import menuData from "../../assets/data/cafeteria-menu.json";
import "./CafeteriaMenu.scss";

type CafeteriaMenuItem = {
  name: string;
  price: number;
  description?: string;
  available?: boolean;
  category?: string;
  image?: string;
};

type CafeteriaCategory = {
  key: string;
  label: string;
  items: CafeteriaMenuItem[];
};

type CafeteriaMenuData = {
  source?: string;
  currency: string;
  categories: CafeteriaCategory[];
};

function formatCurrency(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function isImageUrl(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

export default function CafeteriaMenu() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const data = menuData as CafeteriaMenuData;
  const currency = data.currency || "COP";

  const locale = i18n.language && i18n.language.startsWith("en") ? "en-US" : "es-CO";

  const categories = useMemo(() => data.categories || [], [data.categories]);

  const visibleCategories = useMemo(() => {
    if (selectedCategory === "all") return categories;
    return categories.filter((c) => c.key === selectedCategory);
  }, [categories, selectedCategory]);

  return (
    <div className="cafeteria-menu">
      <Header />
      <main className="cafeteria-menu__main">
        <div className="cafeteria-menu__container">
          <div className="cafeteria-menu__header">
            <div>
              <p className="cafeteria-menu__eyebrow">
                {t("cafeteria.eyebrow")}
              </p>
              <h1 className="cafeteria-menu__title">{t("cafeteria.title")}</h1>
              <p className="cafeteria-menu__subtitle">
                {t("cafeteria.subtitle")}
              </p>
              <p className="cafeteria-menu__meta">
                {t("cafeteria.pricesNote")} {currency}.
              </p>
            </div>
            <button
              type="button"
              className="cafeteria-menu__back"
              onClick={() => navigate("/")}
            >
              {t("cafeteria.backHome")}
            </button>
          </div>

          <div className="cafeteria-menu__filters" aria-label={t("cafeteria.filters.label")}>
            <button
              type="button"
              className={`cafeteria-menu__filter ${
                selectedCategory === "all" ? "cafeteria-menu__filter--active" : ""
              }`}
              aria-pressed={selectedCategory === "all"}
              onClick={() => setSelectedCategory("all")}
            >
              {t("cafeteria.filters.all")}
            </button>
            {categories.map((category) => (
              <button
                key={category.key}
                type="button"
                className={`cafeteria-menu__filter ${
                  selectedCategory === category.key
                    ? "cafeteria-menu__filter--active"
                    : ""
                }`}
                aria-pressed={selectedCategory === category.key}
                onClick={() => setSelectedCategory(category.key)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="cafeteria-menu__grid">
            {visibleCategories.map((section) => (
              <section key={section.key} className="cafeteria-menu__section">
                <h2 className="cafeteria-menu__section-title">
                  {section.label}
                </h2>
                <div className="cafeteria-menu__cards">
                  {section.items.map((item) => (
                    <article
                      key={item.name}
                      className={`cafeteria-menu__card ${
                        item.available === false ? "cafeteria-menu__card--disabled" : ""
                      }`}
                    >
                      <div className="cafeteria-menu__media">
                        {item.image && isImageUrl(item.image) ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div
                            className="cafeteria-menu__media-placeholder"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="cafeteria-menu__content">
                        <div className="cafeteria-menu__card-top">
                          <h3 className="cafeteria-menu__item-name">
                            {item.name}
                          </h3>
                          <div className="cafeteria-menu__item-right">
                            {item.available === false && (
                              <span className="cafeteria-menu__badge">
                                {t("cafeteria.labels.unavailable")}
                              </span>
                            )}
                            <span className="cafeteria-menu__item-price">
                              {formatCurrency(item.price, currency, locale)}
                            </span>
                          </div>
                        </div>
                        {item.description && (
                          <p className="cafeteria-menu__item-desc">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="cafeteria-menu__footer-note">
            <p>{t("cafeteria.availabilityNote")}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
