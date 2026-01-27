import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function toWebpIfLocal(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return value.replace(/\.(png|jpe?g)$/i, ".webp");
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
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [products, setProducts] = useState<CafeteriaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const filterRefs = useRef(new Map<string, HTMLButtonElement>());

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

  const registerSectionRef = useCallback(
    (key: string) => (node: HTMLElement | null) => {
      if (!node) {
        sectionRefs.current.delete(key);
        return;
      }
      sectionRefs.current.set(key, node);
    },
    [],
  );

  const registerFilterRef = useCallback(
    (key: string) => (node: HTMLButtonElement | null) => {
      if (!node) {
        filterRefs.current.delete(key);
        return;
      }
      filterRefs.current.set(key, node);
    },
    [],
  );

  useEffect(() => {
    if (!categories.length) {
      setActiveCategory("");
      return;
    }
    if (!activeCategory || !categories.some((c) => c.key === activeCategory)) {
      setActiveCategory(categories[0].key);
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    if (!categories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (!visible.length) return;
        const key = visible[0].target.getAttribute("data-category-key");
        if (key) setActiveCategory(key);
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: [0, 0.15, 0.4, 0.75],
      },
    );

    categories.forEach((category) => {
      const node = sectionRefs.current.get(category.key);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    const container = filtersRef.current;
    if (!container) return;

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    };

    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [categories.length]);

  useEffect(() => {
    if (!activeCategory) return;
    const activeButton = filterRefs.current.get(activeCategory);
    activeButton?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeCategory]);

  const scrollFiltersBy = (delta: number) => {
    const container = filtersRef.current;
    if (!container) return;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  const scrollToCategory = (key: string) => {
    const node = sectionRefs.current.get(key);
    if (!node) return;
    const filtersHeight = filtersRef.current?.offsetHeight ?? 0;
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize || "16",
    );
    const offset = filtersHeight + rootFontSize + 110;
    const top =
      node.getBoundingClientRect().top + window.scrollY - Math.max(offset, 0);
    window.scrollTo({ top, behavior: "smooth" });
    setActiveCategory(key);
  };

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
            </div>
          </div>

          <div
            className="cafeteria-menu__filters-wrapper"
            aria-label={t("cafeteria.filters.label")}
          >
            <button
              type="button"
              className="cafeteria-menu__filters-nav cafeteria-menu__filters-nav--left"
              aria-label={t("cafeteria.filters.scrollLeft", "Ver anteriores")}
              onClick={() => scrollFiltersBy(-220)}
              disabled={!canScrollLeft}
            >
              {"‹"}
            </button>
            <div className="cafeteria-menu__filters" ref={filtersRef}>
              {categories.map((category) => (
                <button
                  key={category.key}
                  ref={registerFilterRef(category.key)}
                  type="button"
                  className={`cafeteria-menu__filter ${
                    activeCategory === category.key
                      ? "cafeteria-menu__filter--active"
                      : ""
                  }`}
                  aria-pressed={activeCategory === category.key}
                  onClick={() => scrollToCategory(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="cafeteria-menu__filters-nav cafeteria-menu__filters-nav--right"
              aria-label={t("cafeteria.filters.scrollRight", "Ver siguientes")}
              onClick={() => scrollFiltersBy(220)}
              disabled={!canScrollRight}
            >
              {"›"}
            </button>
          </div>

          <div className="cafeteria-menu__grid">
            {statusText && (
              <section className="cafeteria-menu__section" aria-live="polite">
                <p>{statusText}</p>
              </section>
            )}
            {categories.map((section) => (
              <section
                key={section.key}
                className={`cafeteria-menu__section ${
                  activeCategory === section.key
                    ? "cafeteria-menu__section--active"
                    : ""
                }`}
                data-category-key={section.key}
                ref={registerSectionRef(section.key)}
              >
                <div className="cafeteria-menu__section-paper">
                  <header className="cafeteria-menu__section-header">
                    <h2 className="cafeteria-menu__section-title">
                      {section.label}
                    </h2>
                  </header>
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
                                  ? toWebpIfLocal(item.image)
                                  : toWebpIfLocal(
                                      joinUrl(imagesBaseUrl, item.image),
                                    )
                              }
                              alt={item.name}
                              loading="lazy"
                              decoding="async"
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
