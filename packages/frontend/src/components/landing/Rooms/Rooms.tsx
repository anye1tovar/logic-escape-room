import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { fetchRooms } from "../../../api/rooms";
import "./Rooms.scss";

const portalImg = "/rooms/portal.png";
const canibalImg = "/rooms/canibal.png";
const manicomioImg = "/rooms/manicomio.png";

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

type RoomCard = {
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
};

const fallbackImages: Record<string, string> = {
  portal: portalImg,
  jumanji: portalImg,
  canibal: canibalImg,
  manicomio: manicomioImg,
};

const normalizeCoverImage = (value: string | undefined, slug: string) => {
  if (!value) return fallbackImages[slug];
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  const filename = value.split("/").pop();
  return filename ? `/rooms/${filename}` : fallbackImages[slug];
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeRoom = (room: ApiRoom): RoomCard => {
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
      room.coverImage ||
        room.cover_image ||
        room.image ||
        room.image_url,
      slug
    ),
    badge: room.badge,
  };
};

const Rooms = () => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<RoomCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackRooms = useMemo<RoomCard[]>(
    () => [
      {
        id: "portal",
        name: "Portal",
        description: t(
          "rooms.fallback.portal",
          "Cruza universos, resuelve acertijos y vence al tiempo."
        ),
        theme: "Sci-Fi",
        minPlayers: 2,
        maxPlayers: 6,
        minAge: 12,
        durationMinutes: 60,
        difficulty: 3,
        status: "active",
        coverImage: portalImg,
        badge: t("rooms.badges.featured"),
      },
      {
        id: "canibal",
        name: "Canibal",
        description: t(
          "rooms.fallback.canibal",
          "Silencio, sigilo y nervios de acero para escapar."
        ),
        theme: "Horror",
        minPlayers: 2,
        maxPlayers: 6,
        minAge: 15,
        durationMinutes: 60,
        difficulty: 4,
        status: "active",
        coverImage: canibalImg,
      },
      {
        id: "manicomio",
        name: "Manicomio",
        description: t(
          "rooms.fallback.manicomio",
          "Un escape psicológico donde cada detalle cuenta."
        ),
        theme: "Thriller",
        minPlayers: 2,
        maxPlayers: 6,
        minAge: 14,
        durationMinutes: 60,
        difficulty: 3,
        status: "active",
        coverImage: manicomioImg,
      },
      {
        id: "coming-soon",
        name: t("rooms.comingSoonTitle", "Próximamente"),
        description: t(
          "rooms.comingSoonCopy",
          "Una nueva misión está en construcción, lista para ponerte a prueba."
        ),
        theme: t("rooms.comingSoonTagline", "Muy pronto"),
        minPlayers: 2,
        maxPlayers: 6,
        minAge: 13,
        durationMinutes: 60,
        difficulty: t("rooms.difficulty.unknown", "Secreto"),
        status: "comingSoon",
      },
    ],
    [t]
  );

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
            setError(t("rooms.emptyFallback", "Mostramos nuestras favoritas."));
            setRooms(fallbackRooms);
          } else {
            setRooms(normalized);
          }
        }
      } catch (err) {
        console.error("Failed to load rooms", err);
        if (mounted) {
          setError(t("rooms.loadError", "No pudimos cargar las salas."));
          setRooms(fallbackRooms);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRooms();
    return () => {
      mounted = false;
    };
  }, [fallbackRooms, t]);

  const difficultyLabel = (value?: number | string) => {
    if (!value && value !== 0) return t("rooms.difficulty.medium", "Media");
    if (typeof value === "string") return value;
    if (value === 1) return t("rooms.difficulty.low", "Baja");
    if (value === 2) return t("rooms.difficulty.medium", "Media");
    if (value === 3) return t("rooms.difficulty.high", "Alta");
    return t("rooms.difficulty.medium", "Media");
  };

  const playersLabel = (room: RoomCard) => {
    if (room.minPlayers && room.maxPlayers)
      return `${room.minPlayers}-${room.maxPlayers}`;
    if (room.minPlayers) return `${room.minPlayers}+`;
    return null;
  };

  const roomsToRender = rooms.length ? rooms : fallbackRooms;

  return (
    <section className="rooms" id="rooms">
      <div className="rooms__glow" />
      <div className="rooms__header">
        <motion.div
          className="rooms__title-block"
          initial={{ x: -20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="rooms__eyebrow">{t("rooms.eyebrow")}</p>
          <h2 className="rooms__title">
            <span>{t("rooms.title.line1")}</span>
            <span className="rooms__title-accent">
              {t("rooms.title.line2")}
            </span>
          </h2>
        </motion.div>

        <motion.div
          className="rooms__copy"
          initial={{ x: 20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p>{t("rooms.lead.primary")}</p>
          <p className="rooms__quote">{t("rooms.lead.secondary")}</p>
          {error && <p className="rooms__notice">{error}</p>}
        </motion.div>
      </div>

      <div className="rooms__grid">
        {roomsToRender.map((room, idx) => (
          <motion.article
            key={room.id}
            className={`room-card ${
              room.status === "comingSoon" ? "room-card--soon" : ""
            }`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.08 }}
          >
            <div className="room-card__poster">
              {room.coverImage ? (
                <img src={room.coverImage} alt={room.name} />
              ) : (
                <div className="room-card__placeholder">
                  <span>{room.name}</span>
                </div>
              )}
              <div className="room-card__overlay" />
              {room.badge && (
                <span className="room-card__badge">{room.badge}</span>
              )}
              {room.status === "comingSoon" && (
                <span className="room-card__status">
                  {t("rooms.badges.comingSoon")}
                </span>
              )}
            </div>
            <div className="room-card__body">
              <div className="room-card__title-row">
                <h3>{room.name}</h3>
                {room.theme && (
                  <span className="room-card__tag">{room.theme}</span>
                )}
              </div>
              {room.description && (
                <p className="room-card__description">{room.description}</p>
              )}
              <div className="room-card__stats">
                <div className="room-card__stat">
                  <span className="label">{t("rooms.labels.difficulty")}</span>
                  <span className="value">
                    {difficultyLabel(room.difficulty)}
                  </span>
                </div>
                <div className="room-card__stat">
                  <span className="label">{t("rooms.labels.duration")}</span>
                  <span className="value">
                    {room.durationMinutes || 60} {t("rooms.labels.minutes")}
                  </span>
                </div>
                <div className="room-card__stat">
                  <span className="label">{t("rooms.labels.players")}</span>
                  <span className="value">
                    {playersLabel(room) || t("rooms.labels.flex")}
                  </span>
                </div>
                <div className="room-card__stat">
                  <span className="label">{t("rooms.labels.age")}</span>
                  <span className="value">
                    {room.minAge ? `+${room.minAge}` : t("rooms.labels.anyAge")}
                  </span>
                </div>
              </div>
              <div className="room-card__footer">
                <div className="room-card__cta">
                  {room.status === "comingSoon" ? (
                    <span className="room-card__cta--disabled">
                      {t("rooms.badges.comingSoon")}
                    </span>
                  ) : (
                    <Link to="/reservar" className="room-card__cta-button">
                      {t("rooms.actions.book")}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.article>
        ))}
        {loading && (
          <div className="rooms__loading">
            {t("rooms.loading", "Cargando salas...")}
          </div>
        )}
      </div>
    </section>
  );
};

export default Rooms;
