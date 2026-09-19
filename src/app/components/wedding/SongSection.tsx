import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLang, useMusicState } from "./wedding-context";
import { useReveal, Divider, FitLine, MusicNote, COLORS } from "./shared";

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

   The staff starts EMPTY. Its notes are the ones that have been
   turning around the floating player all the way down the page:
   when the orb docks into the slot below, they come up off it and
   settle on the lines; when it leaves, they go with it. The five
   notes that used to be printed here from the start are gone, along
   with the depth they were given (three size tiers, per-note
   shadows, scroll parallax) — that was decoration standing in for
   the story this now tells.
─────────────────────────────────────────────────────────────── */

const STAFF_LINES = [20, 33, 46, 59, 72];

/* A rising-then-settling contour — a shape someone chose, not five
   random heights. These are where the notes come to rest. */
const NOTES = [
  { x: 58, y: 59 },
  { x: 104, y: 46 },
  { x: 150, y: 33 },
  { x: 196, y: 46 },
  { x: 242, y: 40 },
];

/* The notes arrive from below the middle of the staff, which is where the dock
   slot — and so the orb — is standing. They are drawn fresh here rather than
   flown across from the corner: that trail lives in a `position: fixed` layer
   and the staff is an SVG viewBox, and the page is scrolling throughout the
   handover, so a true shared-element flight between the two is the one thing
   here that could come apart on a phone. It reads the same and cannot drift. */
const ENTRY_X = 150;
const ENTRY_Y = 132;
const LAND_EASE = [0.22, 1, 0.36, 1] as const;

function Note({ note, index, landed, reduceMotion }: {
  note: { x: number; y: number };
  index: number;
  landed: boolean;
  reduceMotion: boolean | null;
}) {
  const dx = ENTRY_X - note.x;
  const dy = ENTRY_Y - note.y;

  if (reduceMotion) {
    return (
      <g opacity={landed ? 1 : 0} style={{ transition: "opacity 0.3s ease" }}>
        <MusicNote x={note.x} y={note.y} />
      </g>
    );
  }

  return (
    <motion.g
      initial={{ x: dx, y: dy, opacity: 0 }}
      animate={landed
        /* The 3px overshoot at 82% is the note settling onto the line, not a
           bounce off it: one small movement, no scale and no shadow. */
        ? { x: 0, y: [dy, -3, 0], opacity: 1 }
        : { x: dx, y: dy, opacity: 0 }}
      transition={landed
        ? {
            duration: 0.7,
            delay: index * 0.11,
            ease: LAND_EASE,
            y: { duration: 0.7, delay: index * 0.11, ease: LAND_EASE, times: [0, 0.82, 1] },
          }
        /* Leaving, the outermost notes lift first, so the staff empties from
           its edges inward — the mirror of the way it filled. */
        : { duration: 0.55, delay: (4 - index) * 0.07, ease: "easeIn" }}
    >
      <MusicNote x={note.x} y={note.y} />
    </motion.g>
  );
}

function StaffOfNotes({ inView }: { inView: boolean }) {
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
    /* A shallow tilt, so the notes sit on the staff the way a card lies on a
       table. Static — it is depth of field, not motion. */
    <div style={{ perspective: 620, maxWidth: 300, margin: "0 auto" }}>
      <svg
        id="song-staff"
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
            landed={music.docked}
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
              <MusicNote x={spark.x} y={100} scale={0.6} />
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
  return (
    <section
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

        <StaffOfNotes inView={inView} />

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
          /* Column, not row: the orb and the card are never both here at once
             any more, but stacking them keeps the orb's horizontal centre fixed
             regardless — a row would re-centre it around whatever else is in
             the slot, and that lateral snap is what the flight used to inherit. */
          style={{ minHeight: 56, marginTop: 30, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center" }}
        />

      </motion.div>
    </section>
  );
}
