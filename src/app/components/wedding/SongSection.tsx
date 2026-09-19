import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLang } from "./wedding-context";
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

/* The staff exposes measured landing points. MusicPlayer owns one persistent
   set of notes in viewport space, so changing the ring's portal never replaces
   the notes or restarts their journey. */

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

function StaffOfNotes({ inView }: { inView: boolean }) {
  const reduceMotion = useReducedMotion();

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
            transition={{ duration: reduceMotion ? 0 : 0.9, delay: reduceMotion ? 0 : i * 0.08, ease: "easeOut" }}
          />
        ))}

        {NOTES.map((note, i) => (
          <circle key={note.x} data-music-note-target={i} cx={note.x} cy={note.y} r="1" fill="transparent" />
        ))}
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
          style={{ minHeight: 72, marginTop: 30, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center" }}
        />

      </motion.div>
    </section>
  );
}
