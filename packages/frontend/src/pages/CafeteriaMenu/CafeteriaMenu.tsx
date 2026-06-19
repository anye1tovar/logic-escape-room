import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchCafeteriaProducts,
  type CafeteriaProduct,
} from "../../api/cafeteria";
import { buildLogicWhatsAppUrl } from "../../utils/support";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<CafeteriaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const menuBodyRef = useRef<HTMLDivElement | null>(null);
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
        console.error("Failed to load cafeteria menu", err);
        setError(
          t(
            "cafeteria.error",
            "No pudimos cargar la cafeteria. Intenta de nuevo en unos minutos o escribenos a WhatsApp y te compartimos el menu.",
          ),
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const currency = "COP";
  const featuredImageSrc = "/img/cafeteria.webp";
  const logoSrc = "/img/logo-logic-horizontal.webp";
  const whatsappUrl = buildLogicWhatsAppUrl(
    t(
      "cafeteria.whatsappMessage",
      "Hola, ocurrio un error al cargar la cafeteria en la pagina web. Me compartes el menu disponible por este medio, por favor",
    ),
  );

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
      label: label || t("cafeteria.uncategorized", "Otros"),
      items,
    }));
  }, [products, t]);

  const visibleCategories = useMemo<CafeteriaCategory[]>(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return categories;

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const searchable = [item.name, item.description, item.category]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return searchable.includes(query);
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, searchTerm]);

  const availableCount = useMemo(
    () => products.filter((product) => product.available !== false).length,
    [products],
  );

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
    if (!visibleCategories.length) {
      setActiveCategory("");
      return;
    }
    if (
      !activeCategory ||
      !visibleCategories.some((category) => category.key === activeCategory)
    ) {
      setActiveCategory(visibleCategories[0].key);
    }
  }, [activeCategory, visibleCategories]);

  useEffect(() => {
    if (!visibleCategories.length) return;
    const scrollRoot = menuBodyRef.current;

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
        root: scrollRoot,
        rootMargin: "-8% 0px -78% 0px",
        threshold: [0, 0.15, 0.4, 0.75],
      },
    );

    visibleCategories.forEach((category) => {
      const node = sectionRefs.current.get(category.key);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [visibleCategories]);

  useEffect(() => {
    if (!activeCategory) return;
    const activeButton = filterRefs.current.get(activeCategory);
    activeButton?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeCategory]);

  const scrollToCategory = (key: string) => {
    const scrollRoot = menuBodyRef.current;
    const node = sectionRefs.current.get(key);
    if (!scrollRoot || !node) return;
    const scrollRootTop = scrollRoot.getBoundingClientRect().top;
    const sectionTop = node.getBoundingClientRect().top;
    const top = sectionTop - scrollRootTop + scrollRoot.scrollTop - 12;
    scrollRoot.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    setActiveCategory(key);
  };

  const statusText = useMemo(() => {
    if (loading) return t("cafeteria.loading", "Cargando menu...");
    if (error) return error;
    if (!products.length)
      return t("cafeteria.empty", "No hay productos disponibles.");
    if (searchTerm && !visibleCategories.length)
      return t(
        "cafeteria.search.empty",
        "No encontramos productos con esa busqueda.",
      );
    return null;
  }, [
    error,
    loading,
    products.length,
    searchTerm,
    t,
    visibleCategories.length,
  ]);

  return (
    <div className="cafeteria-menu">
      <main className="cafeteria-menu__main">
        <div className="cafeteria-menu__container">
          <header className="cafeteria-menu__hero">
            <div className="cafeteria-menu__hero-media">
              <img
                className="cafeteria-menu__hero-image"
                src={featuredImageSrc}
                alt=""
                loading="eager"
                decoding="async"
              />
              <a className="cafeteria-menu__home-chip" href="/">
                {t("cafeteria.homeChip", "Ir a pagina principal")}
              </a>
            </div>
            <div className="cafeteria-menu__brand">
              <img src={logoSrc} alt={t("header.logo")} />
              <p>
                {t(
                  "cafeteria.shortSubtitle",
                  "Algo rico para acompañar tu experiencia",
                )}
              </p>
            </div>
          </header>

          <div
            className="cafeteria-menu__filters-wrapper"
            aria-label={t("cafeteria.filters.label")}
          >
            <label className="cafeteria-menu__search">
              <span
                className="cafeteria-menu__search-icon"
                aria-hidden="true"
              />
              <span className="cafeteria-menu__sr-only">
                {t("cafeteria.search.label", "Buscar producto")}
              </span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("cafeteria.search.placeholder", "Buscar")}
              />
            </label>
            <div className="cafeteria-menu__filters" ref={filtersRef}>
              {visibleCategories.map((category) => (
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
          </div>

          <div className="cafeteria-menu__body" ref={menuBodyRef}>
            <div className="cafeteria-menu__grid">
              {statusText && (
                <section className="cafeteria-menu__section" aria-live="polite">
                  <div className="cafeteria-menu__section-paper">
                    <p>{statusText}</p>
                    {error ? (
                      <p>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("cafeteria.whatsappCta", "Escribir por WhatsApp")}
                        </a>
                      </p>
                    ) : null}
                  </div>
                </section>
              )}
              {visibleCategories.map((section) => {
                const sectionTitle =
                  section.label.trim() || t("cafeteria.uncategorized", "Otros");
                const sectionImage =
                  section.items.find((item) => item.categoryImage)
                    ?.categoryImage || featuredImageSrc;

                return (
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
                      <div className="cafeteria-menu__section-cover">
                        <img src={sectionImage} alt="" loading="lazy" />
                      </div>
                      <div className="cafeteria-menu__section-heading">
                        <h2 className="cafeteria-menu__section-title">
                          {sectionTitle}
                        </h2>
                        <p className="cafeteria-menu__section-subtitle">
                          {t("cafeteria.itemsCount", {
                            count: section.items.length,
                          })}
                        </p>
                      </div>
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
                          <div
                            className="cafeteria-menu__thumb"
                            aria-hidden="true"
                          >
                            {item.image ? (
                              <img src={item.image} alt="" loading="lazy" />
                            ) : (
                              <span>{item.name.slice(0, 1)}</span>
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
                );
              })}
            </div>

            <div className="cafeteria-menu__footer-note">
              <p>{t("cafeteria.availabilityNote")}</p>
              <span>
                {categories.length} {t("cafeteria.highlights.categories")} -{" "}
                {availableCount || products.length || "0"}{" "}
                {t("cafeteria.highlights.available")}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
