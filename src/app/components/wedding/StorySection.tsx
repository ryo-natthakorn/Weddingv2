import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "./wedding-context";
import { useReveal, Divider, COLORS } from "./shared";

const STORY_IMAGES = [
  "https://images.unsplash.com/photo-1502389498275-fe50566c4c5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwb3J0cmFpdCUyMHN1bnNldCUyMGdvbGRlbiUyMGhvdXIlMjBsb3ZlfGVufDF8fHx8MTc3ODQ2OTIxMHww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1776957389179-b2388f2653ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjB3YWxraW5nJTIwaGFuZCUyMGluJTIwaGFuZCUyMG5hdHVyZSUyMHBhdGh8ZW58MXx8fHwxNzc4NDY5MjExfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1768561715378-2de6d0fe4fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwcm9wb3NhbCUyMHJpbmclMjByb21hbnRpYyUyMG91dGRvb3J8ZW58MXx8fHwxNzc4NDY5MjExfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1775441522523-317359de673f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBsYXVnaGluZyUyMGhhcHB5JTIwcGljbmljJTIwb3V0ZG9vcnxlbnwxfHx8fDE3Nzg0NjkyMTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
];

/* ── Polaroid rotation offsets for a natural look ── */
const ROTATIONS = [-3.5, 2.8, -2.2, 4.1];

/* ── Camera shutter flash overlay ── */
function ShutterFlash({ trigger }: { trigger: number }) {
  return (
    <AnimatePresence>
      {trigger > 0 && (
        <motion.div
          key={trigger}
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ position: "fixed", inset: 0, background: "#FFFDF8", zIndex: 3000, pointerEvents: "none" }}
        />
      )}
    </AnimatePresence>
  );
}

/* ── Polaroid card ── */
function PolaroidCard({
  src,
  caption,
  year,
  rotation,
  onClick,
}: {
  src: string;
  caption: string;
  year: string;
  rotation: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, rotate: rotation * 0.3, y: -6 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      style={{
        background: "#FDFAF5",
        padding: "14px 14px 52px",
        boxShadow: "0 8px 32px rgba(61,34,21,0.18), 0 2px 8px rgba(61,34,21,0.1)",
        borderRadius: 2,
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
        display: "inline-block",
      }}
    >
      {/* Photo area */}
      <div style={{ width: "min(320px, 70vw)", height: "min(320px, 70vw)", overflow: "hidden", background: "#E8DCC8", position: "relative" }}>
        <img
          src={src}
          alt={caption}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
        />
        {/* Film grain texture overlay */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 60%, rgba(61,34,21,0.08) 100%)", pointerEvents: "none" }} />
      </div>

      {/* Caption area (polaroid bottom white strip) */}
      <div style={{ paddingTop: 12, textAlign: "center" }}>
        <p style={{
          fontFamily: "'Great Vibes', cursive",
          fontSize: "1.25rem",
          color: COLORS.midBrown,
          lineHeight: 1.3,
          marginBottom: 2,
        }}>
          {caption}
        </p>
        <p style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: "0.58rem",
          letterSpacing: "0.18em",
          color: COLORS.lightBrown,
          opacity: 0.65,
          textTransform: "uppercase",
        }}>
          {year}
        </p>
      </div>

      {/* Tape strip decoration at top */}
      <div style={{
        position: "absolute",
        top: -10,
        left: "50%",
        transform: "translateX(-50%)",
        width: 60,
        height: 18,
        background: "rgba(232,192,154,0.45)",
        borderRadius: 2,
        backdropFilter: "blur(2px)",
        border: "1px solid rgba(184,144,64,0.15)",
      }} />
    </motion.div>
  );
}

/* ── Stack peek polaroids (behind the main one) ── */
function StackPeek({ offset, rotation, src }: { offset: number; rotation: number; src: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "#FDFAF5",
        padding: "14px 14px 52px",
        boxShadow: "0 4px 16px rgba(61,34,21,0.1)",
        borderRadius: 2,
        transform: `rotate(${rotation}deg) translate(${offset}px, ${Math.abs(offset) * 0.3}px)`,
        transformOrigin: "center bottom",
        overflow: "hidden",
        zIndex: offset < 0 ? 0 : 1,
      }}
    >
      <img src={src} alt="" style={{ width: "100%", height: "calc(100% - 38px)", objectFit: "cover", objectPosition: "center", display: "block", opacity: 0.7 }} />
    </div>
  );
}

export function StorySection() {
  const { t } = useLang();
  const { ref, inView } = useReveal();
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const goTo = (newIdx: number) => {
    if (newIdx === activeIdx) return;
    setDirection(newIdx > activeIdx ? 1 : -1);
    setFlashTrigger((n) => n + 1);
    setActiveIdx(newIdx);
  };

  const prevIdx = (activeIdx - 1 + STORY_IMAGES.length) % STORY_IMAGES.length;
  const nextIdx = (activeIdx + 1) % STORY_IMAGES.length;

  const polaroidVariants = {
    initial: (dir: number) => ({
      rotate: dir > 0 ? 14 : -14,
      x: dir > 0 ? 280 : -280,
      y: -60,
      opacity: 0,
      scale: 0.9,
    }),
    animate: {
      rotate: 0,
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        rotate: { type: "spring" as const, stiffness: 55, damping: 9, mass: 0.8 },
        x: { type: "spring" as const, stiffness: 200, damping: 28 },
        y: { type: "spring" as const, stiffness: 200, damping: 28 },
        opacity: { duration: 0.25 },
        scale: { type: "spring" as const, stiffness: 200, damping: 28 },
      },
    },
    exit: (dir: number) => ({
      rotate: dir > 0 ? -18 : 18,
      x: dir > 0 ? -260 : 260,
      y: 20,
      opacity: 0,
      scale: 0.88,
      transition: { duration: 0.45, ease: [0.55, 0, 1, 0.45] as const },
    }),
  };

  return (
    <section
      ref={ref}
      style={{
        padding: "96px 24px",
        background: `linear-gradient(180deg, ${COLORS.cream} 0%, #EDE4D5 100%)`,
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Shutter flash effect */}
      <ShutterFlash trigger={flashTrigger} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
      >
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.7rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 12 }}>
          {t.story_label}
        </p>
        <Divider className="mb-6" />
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 400, fontStyle: "italic", color: COLORS.warmBrown, marginBottom: 16 }}>
          {t.story_subtitle}
        </h2>

        {/* Camera icon */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}
        >
          <svg width="36" height="30" viewBox="0 0 36 30" fill="none" opacity="0.45">
            <rect x="1" y="6" width="34" height="23" rx="3" stroke={COLORS.warmBrown} strokeWidth="1.3" fill="none"/>
            <circle cx="18" cy="18" r="7" stroke={COLORS.warmBrown} strokeWidth="1.3" fill="none"/>
            <circle cx="18" cy="18" r="3.5" fill={COLORS.warmBrown} fillOpacity="0.3"/>
            <path d="M11 6V4C11 2.9 11.9 2 13 2H23C24.1 2 25 2.9 25 4V6" stroke={COLORS.warmBrown} strokeWidth="1.3" fill="none"/>
            <circle cx="30" cy="11" r="1.5" fill={COLORS.warmBrown} fillOpacity="0.4"/>
          </svg>
        </motion.div>
      </motion.div>

      {/* Polaroid carousel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.4, duration: 0.8 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 56, flexWrap: "wrap" }}
      >
        {/* Prev arrow */}
        <motion.button
          whileHover={{ scale: 1.1, x: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => goTo(prevIdx)}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,250,245,0.9)",
            border: `1px solid rgba(138,107,75,0.2)`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(61,34,21,0.1)",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke={COLORS.warmBrown} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        {/* Polaroid stack container */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Back polaroids (stack peeks) */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
            <StackPeek offset={-18} rotation={-6.5} src={STORY_IMAGES[prevIdx]} />
            <StackPeek offset={18} rotation={7} src={STORY_IMAGES[nextIdx]} />
          </div>

          {/* Active polaroid */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeIdx}
                custom={direction}
                variants={polaroidVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{ rotate: ROTATIONS[activeIdx] }}
              >
                <PolaroidCard
                  src={STORY_IMAGES[activeIdx]}
                  caption={t.story_items[activeIdx].caption}
                  year={t.story_items[activeIdx].year}
                  rotation={ROTATIONS[activeIdx]}
                  onClick={() => setLightbox(activeIdx)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Next arrow */}
        <motion.button
          whileHover={{ scale: 1.1, x: 3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => goTo(nextIdx)}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,250,245,0.9)",
            border: `1px solid rgba(138,107,75,0.2)`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(61,34,21,0.1)",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2L10 7L5 12" stroke={COLORS.warmBrown} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </motion.div>

      {/* Story text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`text-${activeIdx}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4 }}
          style={{ maxWidth: 520, margin: "0 auto 40px" }}
        >
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.4rem, 3.5vw, 1.8rem)", fontWeight: 500, color: COLORS.warmBrown, marginBottom: 10, lineHeight: 1.2 }}>
            {t.story_items[activeIdx].title}
          </p>
          <div style={{ width: 36, height: 1, background: COLORS.gold, margin: "0 auto 16px", opacity: 0.7 }} />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontStyle: "italic", color: COLORS.midBrown, lineHeight: 1.85 }}>
            {t.story_items[activeIdx].caption}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Dot navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.6, duration: 0.8 }}
        style={{ display: "flex", justifyContent: "center", gap: 10 }}
      >
        {STORY_IMAGES.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => goTo(i)}
            whileHover={{ scale: 1.3 }}
            style={{
              width: i === activeIdx ? 22 : 8,
              height: 8,
              borderRadius: 4,
              background: i === activeIdx ? COLORS.gold : "rgba(138,107,75,0.25)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "width 0.3s, background 0.3s",
            }}
          />
        ))}
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(10,8,4,0.93)",
              zIndex: 2000,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24, cursor: "pointer",
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
                maxWidth: 640, width: "100%",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
                position: "relative",
              }}
            >
              <img
                src={STORY_IMAGES[lightbox]}
                alt=""
                style={{ width: "100%", display: "block", maxHeight: "65vh", objectFit: "contain" }}
              />
              <div style={{ textAlign: "center", paddingTop: 12 }}>
                <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: "1.4rem", color: COLORS.midBrown }}>
                  {t.story_items[lightbox].caption}
                </p>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.6rem", letterSpacing: "0.18em", color: COLORS.lightBrown, textTransform: "uppercase", marginTop: 4, opacity: 0.7 }}>
                  {t.story_items[lightbox].year}
                </p>
              </div>
              <button
                onClick={() => setLightbox(null)}
                style={{ position: "absolute", top: 12, right: 12, background: "rgba(61,34,21,0.12)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: COLORS.warmBrown, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ×
              </button>
              {/* Prev */}
              {lightbox > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); setActiveIdx(lightbox - 1); }}
                  style={{ position: "absolute", left: 8, top: "45%", transform: "translateY(-50%)", background: "rgba(61,34,21,0.1)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", color: COLORS.warmBrown, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}
                >
                  ‹
                </button>
              )}
              {/* Next */}
              {lightbox < STORY_IMAGES.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); setActiveIdx(lightbox + 1); }}
                  style={{ position: "absolute", right: 8, top: "45%", transform: "translateY(-50%)", background: "rgba(61,34,21,0.1)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", color: COLORS.warmBrown, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}
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
