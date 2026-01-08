import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import {
  fetchCafeteriaProducts,
  type CafeteriaProduct,
} from "../../api/cafeteria";
import "./CafeteriaMenu.scss";

type CafeteriaCategory = {
  key: string;
  label: string;
  items: CafeteriaProduct[];
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

function joinUrl(base: string, path: string) {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
}

function buildCategoryKey(label: string) {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "category"
  );
}

export default function CafeteriaMenu() {
  const { t, i18n } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [products, setProducts] = useState<CafeteriaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCafeteriaProducts()
      .then((rows) => {
        if (cancelled) return;
        setProducts(Array.isArray(rows) ? rows : []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load menu");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currency = "COP";
  const imagesBaseUrl = (import.meta.env.VITE_IMAGES_BASE_URL || "").trim();

  const locale =
    i18n.language && i18n.language.startsWith("en") ? "en-US" : "es-CO";

  const categories = useMemo<CafeteriaCategory[]>(() => {
    const byLabel = new Map<string, CafeteriaProduct[]>();

    for (const product of products) {
      const label =
        (product.category || "").trim() ||
        t("cafeteria.uncategorized", "Otros");
      const list = byLabel.get(label) || [];
      list.push(product);
      byLabel.set(label, list);
    }

    return Array.from(byLabel.entries()).map(([label, items]) => ({
      key: buildCategoryKey(label),
      label,
      items,
    }));
  }, [products, t]);

  const titleLines = useMemo(() => {
    const maybeLines = t("cafeteria.titleLines", {
      returnObjects: true,
      defaultValue: null,
    }) as unknown;

    if (
      Array.isArray(maybeLines) &&
      maybeLines.every((value) => typeof value === "string")
    ) {
      return maybeLines as string[];
    }

    const title = t("cafeteria.title");
    const separators = [" & ", " - ", " | ", ": "];
    for (const separator of separators) {
      const idx = title.indexOf(separator);
      if (idx > 0) {
        const left = title.slice(0, idx).trim();
        const right = title.slice(idx + separator.length).trim();
        if (left && right) return [left, right];
      }
    }

    return [title];
  }, [t]);

  const visibleCategories = useMemo(() => {
    if (selectedCategory === "all") return categories;
    return categories.filter((c) => c.key === selectedCategory);
  }, [categories, selectedCategory]);

  const statusText = useMemo(() => {
    if (loading) return t("cafeteria.loading", "Cargando menú...");
    if (error) return error;
    if (!products.length)
      return t("cafeteria.empty", "No hay productos disponibles.");
    return null;
  }, [error, loading, products.length, t]);

  return (
    <div className="cafeteria-menu">
      <Header />
      <main className="cafeteria-menu__main">
        <div className="cafeteria-menu__container">
          <div className="cafeteria-menu__header">
            <div className="cafeteria-menu__title-block">
              <p className="cafeteria-menu__eyebrow">
                {t("cafeteria.eyebrow")}
              </p>
              <h1 className="cafeteria-menu__title">
                {titleLines.map((line, idx) => (
                  <span
                    key={`${idx}-${line}`}
                    className={
                      idx === titleLines.length - 1
                        ? "cafeteria-menu__title-accent"
                        : undefined
                    }
                  >
                    {line}
                  </span>
                ))}
              </h1>
            </div>

            <div className="cafeteria-menu__copy">
              <p className="cafeteria-menu__subtitle">
                {t("cafeteria.subtitle")}
              </p>

              <div className="cafeteria-menu__banner" role="region">
                <div className="cafeteria-menu__banner-text">
                  <h3 className="cafeteria-menu__banner-title">
                    {t("cafeteria.banner.title")}
                  </h3>
                </div>
                <a
                  className="cafeteria-menu__banner-cta"
                  href={t("cafeteria.banner.playlistUrl", "#")}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("cafeteria.banner.cta")}
                </a>
              </div>
            </div>
          </div>

          <div
            className="cafeteria-menu__filters"
            aria-label={t("cafeteria.filters.label")}
          >
            <button
              type="button"
              className={`cafeteria-menu__filter ${
                selectedCategory === "all"
                  ? "cafeteria-menu__filter--active"
                  : ""
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
            {statusText && (
              <section className="cafeteria-menu__section" aria-live="polite">
                <p>{statusText}</p>
              </section>
            )}
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
                        item.available === false
                          ? "cafeteria-menu__card--disabled"
                          : ""
                      }`}
                    >
                      <div className="cafeteria-menu__media">
                        {item.image &&
                        (isImageUrl(item.image) || imagesBaseUrl) ? (
                          <img
                            src={
                              isImageUrl(item.image)
                                ? item.image
                                : joinUrl(imagesBaseUrl, item.image)
                            }
                            alt={item.name}
                            loading="lazy"
                            onError={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
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
