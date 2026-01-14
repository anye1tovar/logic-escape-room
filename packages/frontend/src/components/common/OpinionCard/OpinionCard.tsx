import { motion } from "framer-motion";
import "./OpinionCard.scss";

export type Opinion = {
  name: string;
  role?: string;
  rating?: number;
  text: string;
  avatar?: string;
};

type OpinionCardProps = {
  opinion: Opinion;
  index?: number;
};

const DEFAULT_AVATAR = "/icons/nox-icon.webp";

const normalizeAvatar = (value?: string) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return DEFAULT_AVATAR;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/"))
    return trimmed.replace(/\.(png|jpe?g)$/i, ".webp");
  return DEFAULT_AVATAR;
};

const renderStars = (rating: number) => {
  const maxStars = 5;
  const safeRating = Math.max(0, Math.min(maxStars, Math.round(rating)));

  return Array.from({ length: maxStars }).map((_, idx) => (
    <span
      key={`star-${idx}`}
      className={`opinion-card__star${
        idx < safeRating ? "" : " opinion-card__star--muted"
      }`}
    >
      ★
    </span>
  ));
};

const OpinionCard = ({ opinion, index = 0 }: OpinionCardProps) => {
  const { name, role = "Usuario", rating = 5, text, avatar } = opinion;
  const avatarSrc = normalizeAvatar(avatar);

  return (
    <motion.article
      className="opinion-card"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
    >
      <div className="opinion-card__stars" aria-label={`Calificacion ${rating} de 5`}>
        {renderStars(rating)}
      </div>

      <p className="opinion-card__text">“{text}”</p>

      <div className="opinion-card__footer">
        <div className="opinion-card__avatar" aria-hidden={!avatar}>
          <img
            src={avatarSrc}
            alt={`Foto de ${name}`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src.endsWith(DEFAULT_AVATAR)) return;
              target.src = DEFAULT_AVATAR;
            }}
          />
        </div>

        <div className="opinion-card__meta">
          <p className="opinion-card__name">{name}</p>
          <p className="opinion-card__role">{role}</p>
        </div>
      </div>
    </motion.article>
  );
};

export default OpinionCard;
