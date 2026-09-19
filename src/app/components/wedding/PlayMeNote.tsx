import { motion, useReducedMotion } from "motion/react";

/* A small hand-written note beside the floating ring: "ลองกดฉันสิ" / "Play me",
   with a hand-drawn arrow pointing down at it.

   Set in Sriracha — the one agreed exception to CLAUDE.md's TT Interphases
   rule, see the note in src/styles/fonts.css. One family carries both Thai and
   Latin, so the note is in the same hand whichever language the guest is
   reading, which hand-drawn letterforms could not manage for Thai.

   There is deliberately no panel behind it. It is a note someone left, not a
   tooltip, and it stays small enough to sit beside the ring without covering
   the page underneath. What keeps it legible over the venue photograph is a
   cream glow on the strokes themselves. */

const INK = "#8A7030";
/* Layered soft cream shadows rather than one hard outline: tight ones to build
   an edge against a dark photograph, wide ones to fade into a light page. It
   has to do the whole job of separating the note from what is behind it, since
   there is no panel any more — and the corner regularly sits over the venue
   picture's caption band, which is the worst case. */
const GLOW = [
  "0 0 2px rgba(255,251,242,1)",
  "0 0 4px rgba(255,251,242,1)",
  "0 0 7px rgba(255,251,242,0.95)",
  "0 0 12px rgba(255,251,242,0.75)",
].join(", ");
const GLOW_FILTER =
  "drop-shadow(0 0 2px rgba(255,251,242,1)) drop-shadow(0 0 4px rgba(255,251,242,0.95)) drop-shadow(0 0 9px rgba(255,251,242,0.8))";

/* A short curve leaving the note and dropping to the ring below, with a
   two-stroke head. Hand-drawn arrows are rarely straight; this one is not
   either. */
function Arrow() {
  return (
    <svg
      viewBox="0 0 26 34"
      width="17"
      height="22"
      fill="none"
      stroke={INK}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
      style={{ display: "block", overflow: "visible", filter: GLOW_FILTER }}
      aria-hidden
    >
      <path d="M 2 3 C 11 9 17 18 18 27" />
      <path d="M 12 22 L 18 28 L 21 20" />
    </svg>
  );
}

export function PlayMeNote({ label }: { label: string; lang?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      /* Late enough that it arrives after the ring has settled in the corner,
         rather than racing it there. */
      transition={{ delay: reduceMotion ? 0 : 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        bottom: "100%",
        right: 2,
        /* The ring is this note's containing block and is narrower than the
           note, so without max-content the words would be squeezed into it. */
        width: "max-content",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        pointerEvents: "none",
        transformOrigin: "bottom right",
      }}
    >
      <span
        style={{
          fontFamily: "'Sriracha', 'TT Interphases', 'Noto Sans Thai', sans-serif",
          fontSize: "0.72rem",
          lineHeight: 1.3,
          color: INK,
          opacity: 0.9,
          whiteSpace: "nowrap",
          textShadow: GLOW,
          transform: "rotate(-3deg)",
        }}
      >
        {label}
      </span>
      {/* Tucked under the note's right end, aimed at the ring. */}
      <span style={{ marginRight: 8, marginTop: 1 }}>
        <Arrow />
      </span>
    </motion.div>
  );
}
