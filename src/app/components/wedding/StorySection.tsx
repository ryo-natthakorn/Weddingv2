import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
  PaperTexture,
  WatercolorWash,
  WatercolorFlower,
} from "./shared";

const STORY_IMAGES = [
  "https://images.unsplash.com/photo-1502389498275-fe50566c4c5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwb3J0cmFpdCUyMHN1bnNldCUyMGdvbGRlbiUyMGhvdXIlMjBsb3ZlfGVufDF8fHx8MTc3ODQ2OTIxMHww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1776957389179-b2388f2653ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjB3YWxraW5nJTIwaGFuZCUyMGluJTIwaGFuZCUyMG5hdHVyZSUyMHBhdGh8ZW58MXx8fHwxNzc4NDY5MjExfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1768561715378-2de6d0fe4fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwcm9wb3NhbCUyMHJpbmclMjByb21hbnRpYyUyMG91dGRvb3J8ZW58MXx8fHwxNzc4NDY5MjExfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1775441522523-317359de673f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBsYXVnaGluZyUyMGhhcHB5JTIwcGljbmljJTIwb3V0ZG9vcnxlbnwxfHx8fDE3Nzg0NjkyMTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
];

/* ── Watercolor Polaroid Camera SVG (hand-painted feel) ── */
function WatercolorCamera({ shaking }: { shaking: boolean }) {
  return (
    <motion.div
      animate={
        shaking
          ? { x: [0, -4, 5, -3, 2, 0], y: [0, -2, 1, -1, 0], rotate: [0, -1.5, 1.5, -0.8, 0] }
          : { x: 0, y: 0, rotate: 0 }
      }
      transition={{ duration: 0.5 }}
      style={{ position: "relative", display: "inline-block" }}
    >
      <svg width="220" height="240" viewBox="0 0 220 240" fill="none" style={{ display: "block" }}>
        <defs>
          <filter id="cam-blur">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
          <radialGradient id="lens-grad" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#5A6B70" />
            <stop offset="0.5" stopColor="#2A3540" />
            <stop offset="1" stopColor="#0F1820" />
          </radialGradient>
          <linearGradient id="body-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F2D8B8" />
            <stop offset="0.4" stopColor="#E8C09A" />
            <stop offset="1" stopColor="#D4A574" />
          </linearGradient>
        </defs>

        {/* Strap — hangs from top */}
        <path
          d="M40 12 Q60 22 110 28 Q160 22 180 12"
          stroke="#5A3E25"
          strokeWidth="3"
          strokeOpacity="0.55"
          fill="none"
          strokeLinecap="round"
        />

        {/* Camera body — main shape with rounded corners */}
        <g filter="url(#cam-blur)">
          <rect
            x="22"
            y="28"
            width="176"
            height="170"
            rx="14"
            fill="url(#body-grad)"
            stroke="#7A5A38"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />

          {/* Top strip (different color band) */}
          <rect x="22" y="28" width="176" height="36" rx="14" fill="#C4A574" opacity="0.45" />
          <rect x="22" y="58" width="176" height="6" fill="#8A7030" opacity="0.3" />

          {/* Viewfinder window */}
          <rect x="40" y="38" width="34" height="18" rx="3" fill="#3A2C18" opacity="0.85" />
          <rect x="42" y="40" width="30" height="14" rx="2" fill="#5A6B70" opacity="0.7" />

          {/* Flash bulb */}
          <circle cx="170" cy="48" r="9" fill="#FFF8F0" stroke="#8A7030" strokeWidth="1.2" />
          <circle cx="170" cy="48" r="5" fill="#FFE9A8" opacity="0.85" />
          <circle cx="168" cy="46" r="1.8" fill="#FFFFFF" opacity="0.9" />

          {/* Lens — large central circle */}
          <circle cx="110" cy="120" r="46" fill="#3A2C18" stroke="#7A5A38" strokeWidth="2" />
          <circle cx="110" cy="120" r="40" fill="url(#lens-grad)" />
          <circle cx="110" cy="120" r="28" fill="#0F1820" />
          <circle cx="110" cy="120" r="22" fill="url(#lens-grad)" opacity="0.85" />
          {/* Lens highlight */}
          <ellipse cx="98" cy="108" rx="7" ry="5" fill="#FFFFFF" opacity="0.35" />
          <circle cx="120" cy="128" r="2.5" fill="#FFFFFF" opacity="0.25" />

          {/* Shutter button */}
          <rect x="42" y="180" width="22" height="10" rx="5" fill="#C0392B" opacity="0.8" />
          <rect x="44" y="181" width="18" height="3" rx="1.5" fill="#FF6B5B" opacity="0.6" />

          {/* Brand label area */}
          <rect x="146" y="178" width="44" height="14" rx="2" fill="#5A3E25" opacity="0.25" />
          <text
            x="168"
            y="188"
            textAnchor="middle"
            fontSize="7"
            fill="#3A2C18"
            opacity="0.6"
            fontFamily="serif"
            fontStyle="italic"
          >
            polaroid
          </text>
        </g>

        {/* Photo slot at bottom (where photos eject) */}
        <rect x="50" y="198" width="120" height="6" rx="2" fill="#2A1A0A" opacity="0.7" />
        <rect x="52" y="200" width="116" height="2" fill="#0F0A05" opacity="0.6" />

        {/* Watercolor splashes for organic feel */}
        <ellipse cx="40" cy="60" rx="20" ry="14" fill="#E8C09A" opacity="0.18" />
        <ellipse cx="190" cy="180" rx="18" ry="12" fill="#D4A574" opacity="0.2" />
      </svg>
    </motion.div>
  );
}

/* ── Polaroid Card (the photo that ejects) ── */
function PolaroidPhoto({
  src,
  caption,
  year,
  onClick,
}: {
  src: string;
  caption: string;
  year: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.06, y: -8, rotate: 0, zIndex: 50 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      style={{
        background: "#FDFAF5",
        padding: "10px 10px 38px",
        boxShadow:
          "0 12px 32px rgba(61,34,21,0.22), 0 4px 12px rgba(61,34,21,0.12), inset 0 0 0 1px rgba(0,0,0,0.04)",
        borderRadius: 2,
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
        width: "min(170px, 38vw)",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          overflow: "hidden",
          background: "#E8DCC8",
          position: "relative",
        }}
      >
        <img
          src={src}
          alt={caption}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        {/* Vintage vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(61,34,21,0.18) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Handwritten caption */}
      <div style={{ paddingTop: 8, textAlign: "center" }}>
        <p
          style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: "0.92rem",
            color: COLORS.midBrown,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {caption.length > 28 ? caption.slice(0, 28) + "…" : caption}
        </p>
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "0.5rem",
            letterSpacing: "0.16em",
            color: COLORS.lightBrown,
            opacity: 0.55,
            textTransform: "uppercase",
            marginTop: 1,
          }}
        >
          {year}
        </p>
      </div>
    </motion.div>
  );
}

export function StorySection() {
  const { t } = useLang();
  const { ref, inView } = useReveal();
  const [emergedCount, setEmergedCount] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  /* Detect mobile for layout */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* Auto-play ejection when section in view */
  useEffect(() => {
    if (!inView) return;
    if (emergedCount >= STORY_IMAGES.length) return;

    const t1 = setTimeout(() => {
      setShaking(true);
      const t2 = setTimeout(() => {
        setShaking(false);
        setEmergedCount((c) => c + 1);
      }, 350);
      return () => clearTimeout(t2);
    }, emergedCount === 0 ? 600 : 950);

    return () => clearTimeout(t1);
  }, [inView, emergedCount]);

  /* Photo final positions — fan out (desktop) or vertical stack (mobile) */
  const photoPositionsDesktop = [
    { x: -200, y: 70, rotate: -10 },
    { x: -65, y: 130, rotate: 5 },
    { x: 70, y: 110, rotate: -4 },
    { x: 210, y: 150, rotate: 9 },
  ];
  const photoPositionsMobile = [
    { x: -60, y: 250, rotate: -6 },
    { x: 55, y: 280, rotate: 4 },
    { x: -50, y: 470, rotate: -3 },
    { x: 60, y: 500, rotate: 6 },
  ];
  const positions = isMobile ? photoPositionsMobile : photoPositionsDesktop;

  return (
    <section
      ref={ref}
      style={{
        padding: "96px 24px 120px",
        background: `linear-gradient(180deg, ${COLORS.cream} 0%, #EDE4D5 100%)`,
        textAlign: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Watercolor texture layers */}
      <WatercolorWash variant="warm" intensity={0.7} />
      <PaperTexture opacity={0.3} />

      {/* Decorative flowers */}
      <WatercolorFlower
        size={42}
        style={{ position: "absolute", top: 60, left: 24, opacity: 0.6, zIndex: 1 }}
      />
      <WatercolorFlower
        size={32}
        color="#A8B080"
        centerColor="#7A8A5A"
        style={{ position: "absolute", top: 110, right: 40, opacity: 0.55, zIndex: 1 }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ position: "relative", zIndex: 2 }}
      >
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "0.7rem",
            letterSpacing: "0.28em",
            color: COLORS.lightBrown,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          {t.story_label}
        </p>
        <Divider className="mb-6" />
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 400,
            fontStyle: "italic",
            color: COLORS.warmBrown,
            marginBottom: 24,
          }}
        >
          {t.story_subtitle}
        </h2>
      </motion.div>

      {/* Camera + ejected photos container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
          height: isMobile ? 760 : 460,
          zIndex: 2,
        }}
      >
        {/* The Camera — centered at top */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.85 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <WatercolorCamera shaking={shaking} />

          {/* Flash effect when shaking (taking a photo) */}
          <AnimatePresence>
            {shaking && (
              <motion.div
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: "absolute",
                  top: 40,
                  left: 165,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255,250,220,0.95) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Photos — emerge from camera bottom slot one by one */}
        {STORY_IMAGES.map((src, i) => {
          const pos = positions[i];
          const emerged = i < emergedCount;
          return (
            <motion.div
              key={i}
              initial={{
                x: 0,
                y: 175,
                rotate: 0,
                opacity: 0,
                scale: 0.4,
              }}
              animate={
                emerged
                  ? {
                      x: pos.x,
                      y: pos.y,
                      rotate: pos.rotate,
                      opacity: 1,
                      scale: 1,
                    }
                  : { y: 175, opacity: 0, scale: 0.4 }
              }
              transition={{
                type: "spring",
                stiffness: 90,
                damping: 13,
                mass: 0.8,
              }}
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transformOrigin: "center center",
                zIndex: 5 + i,
              }}
            >
              <div style={{ transform: "translateX(-50%)" }}>
                <PolaroidPhoto
                  src={src}
                  caption={t.story_items[i].caption}
                  year={t.story_items[i].year}
                  onClick={() => setLightbox(i)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Story text shown after all photos emerge */}
      <AnimatePresence>
        {emergedCount >= STORY_IMAGES.length && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              maxWidth: 520,
              margin: "0 auto",
              marginTop: 24,
              position: "relative",
              zIndex: 2,
            }}
          >
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.05rem",
                fontStyle: "italic",
                color: COLORS.midBrown,
                lineHeight: 1.8,
                opacity: 0.8,
              }}
            >
              Tap any photo to see the story behind it ♥
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10,8,4,0.93)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              cursor: "pointer",
            }}
          >
            <motion.div
              initial={{ scale: 0.88, rotate: -4, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.88, rotate: 4, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#FDFAF5",
                padding: "16px 16px 60px",
                maxWidth: 640,
                width: "100%",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
                position: "relative",
              }}
            >
              <img
                src={STORY_IMAGES[lightbox]}
                alt=""
                style={{
                  width: "100%",
                  display: "block",
                  maxHeight: "65vh",
                  objectFit: "contain",
                }}
              />
              <div style={{ textAlign: "center", paddingTop: 14 }}>
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "1.2rem",
                    fontWeight: 500,
                    color: COLORS.warmBrown,
                    marginBottom: 6,
                  }}
                >
                  {t.story_items[lightbox].title}
                </p>
                <p
                  style={{
                    fontFamily: "'Great Vibes', cursive",
                    fontSize: "1.4rem",
                    color: COLORS.midBrown,
                  }}
                >
                  {t.story_items[lightbox].caption}
                </p>
                <p
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "0.6rem",
                    letterSpacing: "0.18em",
                    color: COLORS.lightBrown,
                    textTransform: "uppercase",
                    marginTop: 8,
                    opacity: 0.7,
                  }}
                >
                  {t.story_items[lightbox].year}
                </p>
              </div>
              <button
                onClick={() => setLightbox(null)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(61,34,21,0.12)",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: COLORS.warmBrown,
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
              {lightbox > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(lightbox - 1);
                  }}
                  style={{
                    position: "absolute",
                    left: 8,
                    top: "45%",
                    transform: "translateY(-50%)",
                    background: "rgba(61,34,21,0.1)",
                    border: "none",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    cursor: "pointer",
                    color: COLORS.warmBrown,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                  }}
                >
                  ‹
                </button>
              )}
              {lightbox < STORY_IMAGES.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(lightbox + 1);
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "45%",
                    transform: "translateY(-50%)",
                    background: "rgba(61,34,21,0.1)",
                    border: "none",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    cursor: "pointer",
                    color: COLORS.warmBrown,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                  }}
                >
                  ›
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
