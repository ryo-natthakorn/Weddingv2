import { useEffect, useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useLang } from "./wedding-context";
import { useReveal, Divider, COLORS } from "./shared";

/* ───────────────────────────────────────────────────────────────
   OUR SONG
   ----------------------------------------------------------------
   Sits after the gift envelope. The floating MusicPlayer already
   handles playback, so this section's job is not to be a second
   player — it is the dedication. It hands the tap off to the
   existing player via onPlay.

   While this section is on screen the floating corner player stands
   down and this button becomes the single control for the song —
   otherwise a guest is looking at two play buttons for the same
   track and has to guess which one is live.

   The staff is drawn in the same hand-inked language as
   HandDrawnDivider (wavy strokes revealed by pathLength) rather
   than a stock waveform or album-art card, so it reads as part of
   this invitation and not a music widget dropped into it.
─────────────────────────────────────────────────────────────── */

const STAFF_LINES = [20, 33, 46, 59, 72];

/* A rising-then-settling contour — a shape someone chose, not five
   random heights. */
const NOTES = [
  { x: 58, y: 59 },
  { x: 104, y: 46 },
  { x: 150, y: 33 },
  { x: 196, y: 46 },
  { x: 242, y: 40 },
];

function StaffOfNotes({ inView }: { inView: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 300 96"
      width="100%"
      style={{ display: "block", maxWidth: 300, margin: "0 auto", overflow: "visible" }}
      aria-hidden
    >
      {STAFF_LINES.map((y, i) => (
        <motion.path
          key={y}
          d={`M12 ${y} Q 85 ${y - 1.6}, 152 ${y} T 288 ${y}`}
          stroke={COLORS.gold}
          strokeWidth="1"
          strokeOpacity="0.32"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 0.9, delay: i * 0.08, ease: "easeOut" }}
        />
      ))}

      {NOTES.map((n, i) => (
        <motion.g
          key={n.x}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={
            inView
              ? reduceMotion
                ? { opacity: 1, scale: 1 }
                : { opacity: 1, scale: 1, y: [0, -3.5, 0] }
              : { opacity: 0, scale: 0.6 }
          }
          transition={{
            opacity: { duration: 0.4, delay: 0.6 + i * 0.11 },
            scale: { duration: 0.5, delay: 0.6 + i * 0.11, ease: [0.22, 1, 0.36, 1] },
            y: reduceMotion
              ? undefined
              : { repeat: Infinity, duration: 3.6 + i * 0.25, delay: 1.1 + i * 0.15, ease: "easeInOut" },
          }}
          style={{ transformOrigin: `${n.x}px ${n.y}px` }}
        >
          {/* stem first so the head laps over its foot, like a drawn note */}
          <path
            d={`M${n.x + 7.2} ${n.y - 1} L${n.x + 7.6} ${n.y - 29}`}
            stroke={COLORS.gold}
            strokeWidth="1.5"
            strokeOpacity="0.75"
            strokeLinecap="round"
          />
          <ellipse
            cx={n.x}
            cy={n.y}
            rx="8"
            ry="5.6"
            fill={COLORS.gold}
            fillOpacity="0.8"
            transform={`rotate(-22 ${n.x} ${n.y})`}
          />
        </motion.g>
      ))}
    </svg>
  );
}

export function SongSection({
  onPlay,
  playing = false,
  onDockChange,
}: {
  onPlay: () => void;
  playing?: boolean;
  onDockChange?: (docked: boolean) => void;
}) {
  const { t } = useLang();
  const { ref, inView } = useReveal("-80px");

  /* Deliberately NOT useReveal: that one is once-only, and the corner button
     has to come back when the guest scrolls away again. amount 0.4 means the
     hand-off happens when the section is properly on screen, not the instant
     its top edge appears. */
  const dockRef = useRef<HTMLDivElement>(null);
  const docked = useInView(dockRef, { amount: 0.4 });
  useEffect(() => { onDockChange?.(docked); }, [docked, onDockChange]);
  // Release the corner button again if this section unmounts mid-scroll.
  useEffect(() => () => { onDockChange?.(false); }, [onDockChange]);

  return (
    <section
      ref={dockRef}
      style={{
        padding: "44px 24px 56px",
        background: "transparent",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ position: "relative", zIndex: 2, maxWidth: 520, margin: "0 auto" }}
      >
        <p style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "1.1rem", letterSpacing: "0.28em", marginRight: "-0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 12 }}>
          {t.music_label}
        </p>
        <Divider className="mb-10" />

        <StaffOfNotes inView={inView} />

        <h3 style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "clamp(1.8rem, 6vw, 2.6rem)", fontWeight: 600, color: COLORS.navy, letterSpacing: "0.01em", lineHeight: 1.2, marginTop: 26 }}>
          {t.song_title}
        </h3>
        <p style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "clamp(0.85rem, 2.2vw, 1rem)", fontStyle: "italic", fontWeight: 300, color: COLORS.midBrown, lineHeight: 1.8, marginTop: 10, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
          {t.song_dedication}
        </p>

        <motion.button
          type="button"
          onClick={onPlay}
          aria-label={playing ? "Pause the song" : "Play the song"}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          /* Lifts as it takes over from the corner button, so the swap reads
             as the control moving here rather than one thing vanishing and an
             unrelated thing appearing. */
          animate={docked ? { scale: 1, y: 0 } : { scale: 0.97, y: 4 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginTop: 28,
            background: `linear-gradient(135deg, ${COLORS.gold}, #6B5520)`,
            border: "none",
            borderRadius: 100,
            padding: "14px 32px",
            fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#FFF8EE",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(138,112,48,0.3)",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {playing ? (
            <svg width="13" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <rect x="2.5" y="1.5" width="3.5" height="11" rx="1.5" fill="#FFF8EE" />
              <rect x="8" y="1.5" width="3.5" height="11" rx="1.5" fill="#FFF8EE" />
            </svg>
          ) : (
            <svg width="13" height="14" viewBox="0 0 13 14" fill="none" aria-hidden>
              <path d="M1.5 1.6C1.5 1.1 2 0.8 2.4 1.05L11.4 6.45C11.8 6.7 11.8 7.3 11.4 7.55L2.4 12.95C2 13.2 1.5 12.9 1.5 12.4V1.6Z" fill="#FFF8EE" />
            </svg>
          )}
          {t.song_play}
        </motion.button>
      </motion.div>
    </section>
  );
}
