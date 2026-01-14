import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import "./PinnedZoomOverlay.scss";

type PinZoomOverlayProps = {
  imageUrl: string;
  overlay: React.ReactNode;
};

export default function PinZoomOverlay({
  imageUrl,
  overlay,
}: PinZoomOverlayProps) {
  // Este spacer controla el zoom. El overlay NO necesita animación: sube por el scroll natural.
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [shouldLoadImage, setShouldLoadImage] = useState(false);

  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return undefined;

    if (!("IntersectionObserver" in window)) {
      setShouldLoadImage(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setShouldLoadImage(true);
        observer.disconnect();
      },
      { rootMargin: "220px 0px" }
    );

    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const sectionEl = sectionRef.current;
    const headerEl = document.querySelector("header.header") as HTMLElement | null;
    if (!sectionEl || !headerEl) return;

    const updateHeaderHeight = () => {
      const height = headerEl.getBoundingClientRect().height;
      sectionEl.style.setProperty("--pzo-header-h", `${height}px`);
    };

    updateHeaderHeight();

    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(headerEl);

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateHeaderHeight();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  /**
   * Queremos:
   * - progress = 0 cuando el spacer apenas empieza a entrar (su top toca el bottom del viewport)
   * - progress = 1 cuando el spacer termina de pasar (su bottom toca el top del viewport)
   *
   * Mientras eso ocurre, la imagen está sticky, así que el zoom se siente “pinned”.
   */
  const { scrollYProgress } = useScroll({
    target: spacerRef,
    offset: ["start end", "end start"],
  });

  // Zoom: al inicio se ve más cerca (1.2) y al final queda en 1.0 (imagen completa)
  const scaleRaw = useTransform(scrollYProgress, [0, 1], [1.2, 1.0]);
  const scale = useSpring(scaleRaw, { stiffness: 260, damping: 35 });

  // Parallax MUY leve (opcional pero ayuda a que se sienta premium)
  const yRaw = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);
  const y = useSpring(yRaw, { stiffness: 260, damping: 35 });

  // Oscurecer un poco la imagen cuando se acerca el overlay (opcional)
  const dimRaw = useTransform(scrollYProgress, [0.6, 1], [0.05, 0.35]);
  const dim = useSpring(dimRaw, { stiffness: 260, damping: 35 });

  return (
    <section ref={sectionRef} className="pzo">
      {/* Sticky layer (la imagen queda fija mientras el wrapper tiene contenido debajo) */}
      <div className="pzo__sticky">
        <motion.div
          className="pzo__image"
          style={{
            scale,
            y,
            backgroundImage: shouldLoadImage ? `url(${imageUrl})` : "none",
          }}
          aria-hidden="true"
        />
        <motion.div
          className="pzo__dim"
          style={{ opacity: dim }}
          aria-hidden="true"
        />
      </div>

      {/* Spacer que genera el “recorrido” de scroll para que el zoom suceda */}
      <div ref={spacerRef} className="pzo__spacer" />

      {/* Overlay: ocupa toda la pantalla y sube encima de la imagen por scroll natural */}
      <div className="pzo__overlay">{overlay}</div>
    </section>
  );
}
