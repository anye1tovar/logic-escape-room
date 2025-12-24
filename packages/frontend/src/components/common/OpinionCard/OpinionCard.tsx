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
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";

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
          {avatar ? (
            <img src={avatar} alt={`Foto de ${name}`} loading="lazy" />
          ) : (
            <span className="opinion-card__initial">{initial}</span>
          )}
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
