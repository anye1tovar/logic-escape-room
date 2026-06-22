import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { fetchRooms } from "../../api/rooms";
import "./RoomsDetail.scss";
import Button from "../../components/common/Button";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

const portalImg = "/rooms/portal.webp";
const canibalImg = "/rooms/canibal.webp";
const manicomioImg = "/rooms/manicomio.webp";

type ApiRoom = {
  id?: string | number;
  name?: string;
  description?: string;
  theme?: string;
  min_players?: number;
  max_players?: number;
  min_age?: number;
  duration_minutes?: number;
  difficulty?: number | string;
  image?: string;
  image_url?: string;
  coverImage?: string;
  cover_image?: string;
  status?: string;
  badge?: string;
  active?: number;
};

type RoomDetail = {
  id: string;
  name: string;
  description?: string;
  theme?: string;
  minPlayers?: number;
  maxPlayers?: number;
  minAge?: number;
  durationMinutes?: number;
  difficulty?: number | string;
  status?: "active" | "comingSoon";
  coverImage?: string;
  badge?: string;
  slug: string;
};

const fallbackImages: Record<string, string> = {
  portal: portalImg,
  jumanji: portalImg,
  canibal: canibalImg,
  manicomio: manicomioImg,
};

const toWebpIfLocal = (value: string) =>
  value.replace(/\.(png|jpe?g)$/i, ".webp");

const normalizeCoverImage = (value: string | undefined, slug: string) => {
  if (!value) return fallbackImages[slug];
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return toWebpIfLocal(value);
  const filename = value.split("/").pop();
  return filename ? toWebpIfLocal(`/rooms/${filename}`) : fallbackImages[slug];
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "");

const normalizeRoom = (room: ApiRoom): RoomDetail => {
  const safeName = room.name || "Sala misteriosa";
  const slug = normalizeName(safeName);
  const minPlayers = room.min_players ?? (room as any).minPlayers;
  const maxPlayers = room.max_players ?? (room as any).maxPlayers;
  const minAge = room.min_age ?? (room as any).minAge;
  const durationMinutes =
    room.duration_minutes ?? (room as any).durationMinutes;
  const statusFromActive = room.active === 0 ? "comingSoon" : "active";
  const status =
    room.status === "coming_soon" || room.status === "comingSoon"
      ? "comingSoon"
      : statusFromActive;

  return {
    id: (room.id ?? slug).toString(),
    name: safeName,
    description: room.description,
    theme: room.theme,
    minPlayers: minPlayers || undefined,
    maxPlayers: maxPlayers || undefined,
    minAge: minAge || undefined,
    durationMinutes: durationMinutes || undefined,
    difficulty: room.difficulty,
    status,
    coverImage: normalizeCoverImage(
      room.coverImage || room.cover_image || room.image || room.image_url,
      slug,
    ),
    badge: room.badge,
    slug,
  };
};

export default function RoomsDetail() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<RoomDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadRooms() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRooms();
        const normalized = Array.isArray(data)
          ? (data as ApiRoom[]).map(normalizeRoom)
          : [];
        if (mounted) {
          if (normalized.length === 0) {
            setError(
              t("rooms.empty", "No hay salas disponibles por el momento."),
            );
            setRooms([]);
          } else {
            setRooms(normalized);
          }
        }
      } catch (err) {
        console.error("Failed to load rooms", err);
        if (mounted) {
          setError(t("rooms.loadError", "No pudimos cargar las salas."));
          setRooms([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRooms();
    return () => {
      mounted = false;
    };
  }, [t]);

  const difficultyLabel = (value?: number | string) => {
    if (!value && value !== 0) return t("rooms.difficulty.medium", "Media");
    if (typeof value === "string") return value;
    if (value === 1) return t("rooms.difficulty.low", "Baja");
    if (value === 2) return t("rooms.difficulty.medium", "Media");
    if (value === 3) return t("rooms.difficulty.high", "Alta");
    return t("rooms.difficulty.medium", "Media");
  };

  const playersLabel = (room: RoomDetail) => {
    if (room.minPlayers && room.maxPlayers)
      return `${room.minPlayers}-${room.maxPlayers}`;
    if (room.minPlayers) return `${room.minPlayers}+`;
    return null;
  };

  return (
    <div>
      <Header />
      <main className="rooms-detail-page">
        <section className="rooms-detail" id="rooms">
          <div className="rooms-detail__glow" />
          <div className="rooms-detail__header">
            <motion.div
              className="rooms-detail__title-block"
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="rooms-detail__eyebrow">{t("rooms.eyebrow")}</p>
              <h1 className="rooms-detail__title">
                <span>{t("rooms.title.line1")}</span>
                <span className="rooms-detail__title-accent">
                  {t("rooms.title.line2")}
                </span>
              </h1>
            </motion.div>

            <motion.div
              className="rooms-detail__copy"
              initial={{ x: 20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <p>{t("rooms.lead.primary")}</p>
              <p className="rooms-detail__quote">{t("rooms.lead.secondary")}</p>
            </motion.div>
          </div>

          {error && (
            <div className="rooms-detail__error-container">
              <p className="rooms-detail__notice">{error}</p>
              <Button
                href={`https://wa.me/573181278688?text=${encodeURIComponent(
                  t(
                    "rooms.whatsappMessage",
                    "Hola, ocurrio un error al obtener los datos en la página web, me puedes dar la información sobre las salas de escape por este medio, por favor",
                  ),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rooms-detail__whatsapp-link"
                variant="interactive"
                size="sm"
                pill
              >
                {t("rooms.whatsappCta", "Enviar mensaje al 3181278688")}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="rooms-detail__loading">
              {t("rooms.loading", "Cargando salas...")}
            </div>
          ) : (
            <div className="rooms-detail__list">
              {rooms.map((room, idx) => (
                <motion.article
                  key={room.id}
                  id={room.slug}
                  className={`room-detail-card ${
                    room.status === "comingSoon" ? "room-detail-card--soon" : ""
                  }`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <div className="room-detail-card__wrapper">
                    <div className="room-detail-card__image-container">
                      {room.coverImage ? (
                        <img
                          src={room.coverImage}
                          alt={room.name}
                          loading="lazy"
                          decoding="async"
                          className="room-detail-card__image"
                        />
                      ) : (
                        <div className="room-detail-card__placeholder">
                          <span>{room.name}</span>
                        </div>
                      )}
                      {room.badge && (
                        <span className="room-detail-card__badge">
                          {room.badge}
                        </span>
                      )}
                      {room.status === "comingSoon" && (
                        <span className="room-detail-card__status">
                          {t("rooms.badges.comingSoon")}
                        </span>
                      )}
                    </div>

                    <div className="room-detail-card__content">
                      <div className="room-detail-card__header">
                        <h2 className="room-detail-card__title">{room.name}</h2>
                        {room.theme && (
                          <span className="room-detail-card__theme">
                            {room.theme}
                          </span>
                        )}
                      </div>

                      {room.description && (
                        <p className="room-detail-card__description">
                          {room.description}
                        </p>
                      )}

                      <div className="room-detail-card__features">
                        <div className="room-detail-card__feature">
                          <span className="room-detail-card__feature-label">
                            {t("rooms.labels.difficulty")}
                          </span>
                          <span className="room-detail-card__feature-value">
                            {difficultyLabel(room.difficulty)}
                          </span>
                        </div>

                        <div className="room-detail-card__feature">
                          <span className="room-detail-card__feature-label">
                            {t("rooms.labels.duration")}
                          </span>
                          <span className="room-detail-card__feature-value">
                            {room.durationMinutes || 60}{" "}
                            {t("rooms.labels.minutes")}
                          </span>
                        </div>

                        <div className="room-detail-card__feature">
                          <span className="room-detail-card__feature-label">
                            {t("rooms.labels.players")}
                          </span>
                          <span className="room-detail-card__feature-value">
                            {playersLabel(room) || t("rooms.labels.flex")}
                          </span>
                        </div>

                        <div className="room-detail-card__feature">
                          <span className="room-detail-card__feature-label">
                            {t("rooms.labels.age")}
                          </span>
                          <span className="room-detail-card__feature-value">
                            {room.minAge
                              ? `+${room.minAge}`
                              : t("rooms.labels.anyAge")}
                          </span>
                        </div>
                      </div>

                      <div className="room-detail-card__footer">
                        {room.status === "comingSoon" ? (
                          <span className="room-detail-card__cta-disabled">
                            {t("rooms.badges.comingSoon")}
                          </span>
                        ) : (
                          <Button
                            to="/reservar"
                            className="room-detail-card__cta-button"
                            size="md"
                          >
                            {t("rooms.actions.book")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
