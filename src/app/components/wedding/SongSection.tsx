import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useLang, useMusicState } from "./wedding-context";
import { useReveal, Divider, FitLine, COLORS } from "./shared";

/* The dedication is two authored lines on a phone and one on a tablet upward.
   That is a layout choice, not a size one, so it is read in JS rather than
   rendering both and hiding one — a hidden copy would measure at zero width. */
function useMinWidth(px: number) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${px}px)`).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${px}px)`);
    const sync = () => setMatches(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [px]);
  return matches;
}

/* ───────────────────────────────────────────────────────────────
   OUR SONG
   ----------------------------------------------------------------
   Sits after the gift envelope. The floating MusicPlayer already
   handles playback, so this section's job is not to be a second
   player — it is the dedication. It hands the tap off to the
   existing player via onPlay.

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

/* Three depth tiers across the five notes, deepest in the middle. Scale,
   fill opacity, shadow and parallax all read off the same tier, so a note
   that looks nearer also moves more — which is what makes the staff read as
   a shallow space rather than five flat stickers. */
const TIERS = [
  { scale: 0.85, fill: 0.55, shadow: 0.1, drift: 6 },
  { scale: 1, fill: 0.7, shadow: 0.14, drift: 11 },
  { scale: 1.15, fill: 0.9, shadow: 0.18, drift: 17 },
];
const NOTE_TIER = [0, 1, 2, 1, 0];

function Note({
  note,
  index,
  inView,
  progress,
  landedAt,
  reduceMotion,
}: {
  note: { x: number; y: number };
  index: number;
  inView: boolean;
  progress: MotionValue<number>;
  landedAt: number;
  reduceMotion: boolean | null;
}) {
  const tier = TIERS[NOTE_TIER[index]];
  // Parallax: the nearer the note, the further it drifts as the section
  // travels through the viewport. Scroll-driven, so it works on a phone
  // without asking for motion permissions.
  const drift = useTransform(progress, [0, 1], [tier.drift, -tier.drift]);
  const reaction = useAnimationControls();
  const [ripples, setRipples] = useState<number[]>([]);
  const origin = { transformOrigin: `${note.x}px ${note.y}px` } as const;

  // The orb landing in the slot below sends a wave out through the staff,
  // from the middle (where the slot is) outward.
  useEffect(() => {
    if (!landedAt || reduceMotion) return;
    reaction.start({
      y: [0, -10, 0],
      transition: { duration: 0.6, delay: Math.abs(index - 2) * 0.09, ease: [0.22, 1, 0.36, 1] },
    });
  }, [landedAt, index, reaction, reduceMotion]);

  const pluck = () => {
    if (reduceMotion) return;
    const id = Date.now();
    setRipples((list) => [...list, id]);
    setTimeout(() => setRipples((list) => list.filter((value) => value !== id)), 700);
    reaction.start({
      scale: [1, 1.3, 1],
      rotate: [0, index % 2 === 0 ? -9 : 9, 0],
      transition: { type: "spring", stiffness: 260, damping: 12 },
    });
  };

  return (
    <motion.g style={{ y: drift }}>
      {/* the note's own shadow on the paper below it */}
      <ellipse
        cx={note.x}
        cy={note.y + 13}
        rx={9 * tier.scale}
        ry={2.4}
        fill={COLORS.gold}
        opacity={inView ? tier.shadow : 0}
        style={{ transition: "opacity 0.6s ease" }}
      />
      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        animate={
          inView
            ? reduceMotion
              ? { opacity: 1, scale: tier.scale }
              : { opacity: 1, scale: tier.scale, y: [0, -3.5, 0] }
            : { opacity: 0, scale: 0.6 }
        }
        transition={{
          opacity: { duration: 0.4, delay: 0.6 + index * 0.11 },
          scale: { duration: 0.5, delay: 0.6 + index * 0.11, ease: [0.22, 1, 0.36, 1] },
          y: reduceMotion
            ? undefined
            : { repeat: Infinity, duration: 3.6 + index * 0.25, delay: 1.1 + index * 0.15, ease: "easeInOut" },
        }}
        style={origin}
      >
        <motion.g
          animate={reaction}
          style={{ ...origin, pointerEvents: "auto", cursor: "pointer" }}
          onPointerDown={pluck}
          onHoverStart={pluck}
        >
          {ripples.map((id) => (
            <motion.circle
              key={id}
              cx={note.x}
              cy={note.y}
              r={10}
              fill="none"
              stroke={COLORS.gold}
              strokeWidth="1"
              initial={{ opacity: 0.55, scale: 0.7 }}
              animate={{ opacity: 0, scale: 2.1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={origin}
            />
          ))}
          {/* stem first so the head laps over its foot, like a drawn note */}
          <path
            d={`M${note.x + 7.2} ${note.y - 1} L${note.x + 7.6} ${note.y - 29}`}
            stroke={COLORS.gold}
            strokeWidth="1.5"
            strokeOpacity={tier.fill}
            strokeLinecap="round"
          />
          <ellipse
            cx={note.x}
            cy={note.y}
            rx="8"
            ry="5.6"
            fill={COLORS.gold}
            fillOpacity={tier.fill}
            transform={`rotate(-22 ${note.x} ${note.y})`}
          />
        </motion.g>
      </motion.g>
    </motion.g>
  );
}

function StaffOfNotes({ inView, progress }: { inView: boolean; progress: MotionValue<number> }) {
  const reduceMotion = useReducedMotion();
  const { music } = useMusicState();
  /* One small note leaves the docked player on every lyric line and floats up
     through the staff — the section's only sign that the song is running. */
  const [sparks, setSparks] = useState<{ id: number; x: number }[]>([]);

  useEffect(() => {
    if (reduceMotion || !music.playing || !music.docked || music.cueAt < 0) return;
    const id = Date.now();
    setSparks((list) => [...list, { id, x: 124 + Math.random() * 52 }]);
    const timer = setTimeout(() => setSparks((list) => list.filter((spark) => spark.id !== id)), 1800);
    return () => clearTimeout(timer);
  }, [music.cueAt, music.playing, music.docked, reduceMotion]);

  return (
    /* A shallow tilt, so the notes hover over the staff instead of being
       printed on it. Static — it is depth, not motion. */
    <div style={{ perspective: 620, maxWidth: 300, margin: "0 auto" }}>
      <svg
        viewBox="0 0 300 108"
        width="100%"
        style={{ display: "block", overflow: "visible", transform: "rotateX(8deg)", pointerEvents: "none" }}
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

        {NOTES.map((note, i) => (
          <Note
            key={note.x}
            note={note}
            index={i}
            inView={inView}
            progress={progress}
            landedAt={music.landedAt}
            reduceMotion={reduceMotion}
          />
        ))}

        <AnimatePresence>
          {sparks.map((spark) => (
            <motion.g
              key={spark.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.85, 0], y: -74, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.7, ease: "easeOut" }}
              style={{ transformOrigin: `${spark.x}px 100px` }}
            >
              <ellipse cx={spark.x} cy={100} rx="4.6" ry="3.2" fill={COLORS.gold} transform={`rotate(-22 ${spark.x} 100)`} />
              <path d={`M${spark.x + 4.2} 99 L${spark.x + 4.4} 85`} stroke={COLORS.gold} strokeWidth="1.2" strokeLinecap="round" />
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}

const dedicationStyle = {
  fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif",
  fontWeight: 400,
  color: COLORS.midBrown,
  lineHeight: 1.8,
} as const;

export function SongSection({ onDockSlot }: { onDockSlot: (node: HTMLDivElement | null) => void }) {
  const { t } = useLang();
  const { ref, inView } = useReveal("-80px");
  const wide = useMinWidth(768);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });

  return (
    <section
      ref={sectionRef}
      style={{
        padding: "20px 24px 56px",
        background: "transparent",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.9 }}
        style={{ position: "relative", zIndex: 2, maxWidth: 760, margin: "0 auto" }}
      >
        <FitLine as="p" max={30} style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontWeight: 600, letterSpacing: 0, color: COLORS.navy, textTransform: "uppercase", marginBottom: 12 }}>
          {t.music_label}
        </FitLine>
        <Divider className="mb-10" />

        <StaffOfNotes inView={inView} progress={scrollYProgress} />

        <div data-song-dedication style={{ marginTop: 10, maxWidth: 760, marginLeft: "auto", marginRight: "auto" }}>
          {wide ? (
            <FitLine as="p" max={16} style={dedicationStyle}>{t.song_dedication_lines.join(" ")}</FitLine>
          ) : (
            t.song_dedication_lines.map((line: string) => (
              <FitLine key={line} as="p" max={16} style={dedicationStyle}>{line}</FitLine>
            ))
          )}
        </div>

        {/* The dock slot. It starts empty: the floating player flies in here
            and becomes this section's player, so the section never holds a
            second control of its own. min-height keeps the layout steady while
            the orb is still in the corner, and the slot grows when the card
            opens inside it. */}
        <div
          ref={onDockSlot}
          data-music-dock-slot
          style={{ minHeight: 56, marginTop: 30, display: "flex", justifyContent: "center", alignItems: "flex-start" }}
        />

      </motion.div>
    </section>
  );
}
