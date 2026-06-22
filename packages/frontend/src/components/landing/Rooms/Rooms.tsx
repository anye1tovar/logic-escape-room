import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { fetchRooms } from "../../../api/rooms";
import "./Rooms.scss";
import Button from "../../common/Button";

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
      room.coverImage || room.cover_image || room.image || room.image_url,
      slug,
    ),
    badge: room.badge,
  };
};

const Rooms = () => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<RoomCard[]>([]);
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

  const playersLabel = (room: RoomCard) => {
    if (room.minPlayers && room.maxPlayers)
      return `${room.minPlayers}-${room.maxPlayers}`;
    if (room.minPlayers) return `${room.minPlayers}+`;
    return null;
  };

  const roomsToRender = rooms;

  return (
    <section className="rooms">
      <div className="rooms__glow" />

      <motion.header
        className="rooms__section-header"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        id="rooms"
      >
        <div className="rooms__title-block">
          <p className="rooms__eyebrow">Descubre experiencias únicas</p>
          <h2 className="rooms__main-title">
            <span className="rooms__main-title--white">SALAS DE</span>
            <span className="rooms__main-title--purple">ESCAPE</span>
          </h2>
        </div>

        <div className="rooms__copy">
          <p className="rooms__subtitle">
            <span>{roomsToRender.length}</span> experiencias para elegir según
            tu equipo, edad y nivel de susto.
            <Button
              className="rooms__pricing-link"
              href="#pricing"
              variant="ghost"
              size="sm"
            >
              Ver precios
            </Button>
          </p>
        </div>
      </motion.header>

      {error && (
        <div className="rooms__error-container">
          <p className="rooms__notice">{error}</p>
          <Button
            href={`https://wa.me/573181278688?text=${encodeURIComponent(
              t(
                "rooms.whatsappMessage",
                "Hola, ocurrio un error al obtener los datos en la página web, me puedes dar la información sobre las salas de escape por este medio, por favor",
              ),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rooms__whatsapp-link"
            variant="interactive"
            size="sm"
            pill
          >
            {t("rooms.whatsappCta", "Enviar mensaje al 3181278688")}
          </Button>
        </div>
      )}

      <div className="rooms__cards-grid">
        {roomsToRender.map((room, idx) => (
          <motion.article
            key={room.id}
            className={`room-card-compact ${
              room.status === "comingSoon" ? "room-card-compact--soon" : ""
            }`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.08 }}
          >
            <div className="room-card-compact__image-wrapper">
              {room.coverImage ? (
                <img
                  src={room.coverImage}
                  alt={room.name}
                  loading="lazy"
                  decoding="async"
                  className="room-card-compact__image"
                />
              ) : (
                <div className="room-card-compact__placeholder">
                  {room.name}
                </div>
              )}
              {room.status === "comingSoon" && (
                <div className="room-card-compact__coming-soon">
                  {t("rooms.badges.comingSoon")}
                </div>
              )}
            </div>

            <div className="room-card-compact__content">
              <h3 className="room-card-compact__title">{room.name}</h3>

              <div className="room-card-compact__meta">
                {room.theme && (
                  <span className="room-card-compact__meta-item room-card-compact__meta-item--theme">
                    {room.theme}
                  </span>
                )}

                {playersLabel(room) && (
                  <span className="room-card-compact__meta-item">
                    {playersLabel(room)}
                  </span>
                )}

                {room.minAge && (
                  <span className="room-card-compact__meta-item">
                    +{room.minAge}
                  </span>
                )}
              </div>

              <div className="room-card-compact__actions">
                {room.status === "comingSoon" ? (
                  <span className="room-card-compact__cta-disabled">
                    {t("rooms.badges.comingSoon")}
                  </span>
                ) : (
                  <>
                    <Button
                      to={`/salas#${room.name
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]+/g, "")}`}
                      className="room-card-compact__btn room-card-compact__btn--secondary"
                      size="sm"
                    >
                      Ver sala
                    </Button>
                    <Button
                      to="/reservar"
                      className="room-card-compact__btn room-card-compact__btn--primary"
                      size="sm"
                    >
                      {t("rooms.actions.book")}
                    </Button>
                  </>
                )}
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
