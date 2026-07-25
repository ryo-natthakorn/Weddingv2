import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import type { PanInfo, MotionValue } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
} from "./shared";

/* ───────────────────────────────────────────────────────────────
   GALLERY — PRE-WEDDING CAROUSEL
   ----------------------------------------------------------------
   A single center-focused, drag-to-swipe carousel of the
   pre-wedding shoot. The active card sits large and centered with
   the next/previous cards peeking at the edges; dragging (or the
   arrow buttons / dot indicators) glides to the neighbouring card
   with a spring. Reads straight from src/imports/pre-wedding/ — drop
   image files in and they appear automatically, no code changes
   needed. Sorted by filename, so prefix with 01-, 02-, etc. if the
   order matters.
─────────────────────────────────────────────────────────────── */

const PRE_WEDDING_MODULES = import.meta.glob(
  "../../../imports/pre-wedding/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const PRE_WEDDING_IMAGES = Object.keys(PRE_WEDDING_MODULES)
  .sort()
  .map((key) => PRE_WEDDING_MODULES[key]);

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const CARD_W = "min(300px, 76vw)"; // notably bigger than the old 150px film frames
const CARD_ASPECT = "4 / 5";
const CARD_GAP = 18;

function ArrowButton({
  direction,
  onClick,
  disabled,
  label,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "1px solid rgba(138,112,48,0.35)",
        background: "rgba(255,248,240,0.9)",
        boxShadow: "0 6px 16px rgba(138,112,48,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <svg width="16" height="14" viewBox="0 0 14 12" fill="none" style={{ transform: direction === "prev" ? "scaleX(-1)" : "none" }}>
        <path d="M1 6H12M12 6L8 2M12 6L8 10" stroke={COLORS.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* Each card owns its own scale/opacity transform derived from the shared
   drag position — keeps the "active card pops, neighbours recede" effect
   without re-rendering every card on every drag frame. */
function CarouselCard({ src, i, x, step }: { src: string; i: number; x: MotionValue<number>; step: number }) {
  const scale = useTransform(x, (xv) => {
    if (!step) return 1;
    const dist = Math.abs(xv + i * step) / step;
    return clamp(1 - dist * 0.14, 0.86, 1);
  });
  const opacity = useTransform(x, (xv) => {
    if (!step) return 1;
    const dist = Math.abs(xv + i * step) / step;
    return clamp(1 - dist * 0.5, 0.5, 1);
  });

  return (
    <motion.div
      data-card
      style={{
        scale,
        opacity,
        flex: `0 0 ${CARD_W}`,
        aspectRatio: CARD_ASPECT,
        borderRadius: 20,
        overflow: "hidden",
        background: COLORS.ivory,
        boxShadow: "0 18px 44px rgba(61,34,21,0.24)",
        border: "1px solid rgba(138,112,48,0.22)",
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </motion.div>
  );
}

function Carousel({ images, emptyText }: { images: string[]; emptyText: string }) {
  const { lang } = useLang();
  const trackRef = useRef<HTMLDivElement>(null);
  const [cardPx, setCardPx] = useState(0);
  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);

  const maxIndex = Math.max(0, images.length - 1);
  const step = cardPx + CARD_GAP;

  useEffect(() => {
    const measure = () => {
      const first = trackRef.current?.querySelector<HTMLDivElement>("[data-card]");
      if (first) setCardPx(first.getBoundingClientRect().width);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [images.length]);

  useEffect(() => {
    animate(x, -index * step, { type: "spring", stiffness: 340, damping: 36 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const goTo = (next: number) => {
    const clamped = clamp(next, 0, maxIndex);
    setIndex(clamped);
    animate(x, -clamped * step, { type: "spring", stiffness: 340, damping: 36 });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dragged = info.offset.x;
    const fast = Math.abs(info.velocity.x) > 500;
    let delta = 0;
    if (Math.abs(dragged) > step * 0.22 || fast) {
      delta = dragged < 0 ? 1 : -1;
    }
    goTo(index + delta);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
  };

  if (images.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: CARD_ASPECT,
          maxWidth: 300,
          margin: "0 auto",
          borderRadius: 20,
          background: COLORS.ivory,
          border: "1px dashed rgba(138,112,48,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 28px",
          color: COLORS.lightBrown,
          fontFamily: "'TT Interphases', sans-serif",
          fontSize: "0.85rem",
          letterSpacing: "0.04em",
          lineHeight: 1.5,
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={lang === "TH" ? "รูปพรีเวดดิ้ง" : "Pre-wedding photos"}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{ width: "100%", overflow: "hidden", paddingBlock: 8, outline: "none" }}
      >
        <motion.div
          ref={trackRef}
          drag={images.length > 1 ? "x" : false}
          dragConstraints={{ left: -maxIndex * step, right: 0 }}
          dragElastic={0.06}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          style={{
            x,
            display: "flex",
            gap: CARD_GAP,
            width: "max-content",
            paddingLeft: `calc(50% - ${CARD_W} / 2)`,
            paddingRight: `calc(50% - ${CARD_W} / 2)`,
            cursor: images.length > 1 ? "grab" : "default",
            touchAction: "pan-y",
          }}
          whileTap={images.length > 1 ? { cursor: "grabbing" } : undefined}
        >
          {images.map((src, i) => (
            <CarouselCard key={src} src={src} i={i} x={x} step={step} />
          ))}
        </motion.div>
      </div>

      {images.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 22 }}>
          <ArrowButton
            direction="prev"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            label={lang === "TH" ? "รูปก่อนหน้า" : "Previous photo"}
          />
          <div style={{ display: "flex", gap: 7 }}>
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={lang === "TH" ? `ไปที่รูปที่ ${i + 1}` : `Go to photo ${i + 1}`}
                aria-current={i === index}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  background: i === index ? COLORS.gold : "rgba(138,112,48,0.3)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  transform: i === index ? "scaleX(2.85)" : "scaleX(1)",
                  transformOrigin: "center",
                  transition: "transform 0.3s ease, background 0.3s ease",
                }}
              />
            ))}
          </div>
          <ArrowButton
            direction="next"
            onClick={() => goTo(index + 1)}
            disabled={index === maxIndex}
            label={lang === "TH" ? "รูปถัดไป" : "Next photo"}
          />
        </div>
      )}
    </div>
  );
}

export function GallerySection() {
  const { lang, t } = useLang();
  const { ref, inView } = useReveal("-80px");

  const preWeddingLabel = lang === "TH" ? "พรีเวดดิ้ง" : "Pre-Wedding";
  const preWeddingEmptyText =
    lang === "TH" ? "ภาพพรีเวดดิ้งกำลังจะมาเร็ว ๆ นี้" : "Pre-wedding photos coming soon";

  return (
    <section
      style={{
        padding: "48px 14px 56px",
        position: "relative",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ position: "relative", zIndex: 2, maxWidth: 560, margin: "0 auto" }}
      >
        <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "1.1rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 4, textAlign: "center" }}>{t.gallery_label}</p>
        <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.7rem", letterSpacing: "0.26em", color: COLORS.midBrown, textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>{preWeddingLabel}</p>
        <Divider className="mb-10" />

        <Carousel images={PRE_WEDDING_IMAGES} emptyText={preWeddingEmptyText} />
      </motion.div>
    </section>
  );
}
