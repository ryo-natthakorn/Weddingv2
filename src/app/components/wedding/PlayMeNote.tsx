import { motion, useReducedMotion } from "motion/react";

/* A note pinned beside the floating ring: "ลองกดฉันสิ" / "Play me", with a
   hand-drawn arrow pointing down at it.

   The English is drawn, not typeset — monoline stroked paths, the way a pen
   actually lays a letter down, one continuous line with a round cap. CLAUDE.md
   requires TT Interphases for every piece of text on the invitation and the
   project carries no handwriting face, so a note that has to look hand-written
   has to be artwork.

   The Thai is NOT drawn, deliberately. Thai letterforms turn on details — where
   the หัว sits on each stem, which stem carries the tail — that have to be right
   or the word stops being the word, and hand-authored beziers were not getting
   them right. An almost-Thai squiggle in front of Thai-reading guests is worse
   than honest type, so the Thai note is set in the invitation's own italic and
   keeps the same hand-drawn arrow. Swapping it for real lettering later means
   dropping a `THAI` glyph table beside `LATIN` below and nothing else. */

const INK = "#8A7030";
const STROKE = 2.1;
/* The note floats over whatever the page happens to be showing — often the
   venue photograph — and gold on a photograph is unreadable. A soft cream
   halo around the strokes lifts them off any background without putting a
   panel behind them, which would look like chrome rather than a note. */
const HALO = "drop-shadow(0 0 5px rgba(255,251,242,0.95)) drop-shadow(0 0 2px rgba(255,251,242,0.9))";

type Glyph = { d: string[]; w: number; tilt?: number };

/* "Play me", joined the way a hand joins it. Each glyph is drawn in its own
   local box on a 0..48 grid with the baseline at y=40, placed with a translate,
   and tilted a degree or two so the line reads as written rather than set. */
const LATIN: Glyph[] = [
  // P
  { w: 22, tilt: -2, d: ["M 6 40 C 6 30 7 18 9 10 C 16 8 23 11 22 18 C 21 24 14 26 9 25"] },
  // l
  { w: 12, tilt: 1, d: ["M 6 8 C 4 18 4 30 6 36 C 7 39 10 39 12 36"] },
  // a
  { w: 20, tilt: -1, d: ["M 17 22 C 12 18 5 21 5 29 C 5 36 12 38 16 33 L 17 22 C 16 29 16 34 18 37"] },
  // y
  { w: 21, tilt: 1, d: ["M 4 22 C 5 29 8 34 12 35 C 15 34 17 28 18 22", "M 18 22 C 17 33 16 43 12 46 C 9 48 6 47 5 44"] },
  // (word gap)
  { w: 10, d: [] },
  // m
  { w: 28, tilt: -1, d: ["M 4 36 C 4 30 5 24 6 22 C 7 27 7 32 7 36 C 8 28 10 22 13 22 C 15 23 15 30 15 36 C 16 28 18 22 21 22 C 24 23 23 31 24 36"] },
  // e
  { w: 20, tilt: 1, d: ["M 5 30 C 9 29 14 28 17 26 C 18 22 14 20 11 22 C 6 25 5 33 9 36 C 12 38 16 36 18 33"] },
];

const LATIN_W = LATIN.reduce((total, g) => total + g.w, 0) + 10;

/* A short curve leaving the note and dropping to the ring below, with a
   two-stroke head. Hand-drawn arrows are rarely straight; this one is not
   either. */
function Arrow() {
  return (
    <svg
      viewBox="0 0 26 34"
      width="26"
      height="34"
      fill="none"
      stroke={INK}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.85"
      style={{ display: "block", overflow: "visible", filter: HALO }}
      aria-hidden
    >
      <path d="M 2 3 C 11 9 17 18 18 27" />
      <path d="M 12 22 L 18 28 L 21 20" />
    </svg>
  );
}

export function PlayMeNote({ label, lang }: { label: string; lang: string }) {
  const reduceMotion = useReducedMotion();
  const thai = lang === "TH";

  return (
    <motion.div
      role="img"
      aria-label={label}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      /* Late enough that it arrives after the ring has settled in the corner,
         rather than racing it there. */
      transition={{ delay: reduceMotion ? 0 : 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        bottom: "104%",
        right: 4,
        /* The ring is only 84px wide and is this note's containing block, so
           without max-content the note would be squeezed into it. */
        width: "max-content",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        pointerEvents: "none",
        transformOrigin: "bottom right",
      }}
    >
      {/* A little paper tag under the words. The note floats over whatever the
          page is showing — usually the venue photograph and its caption — and
          gold strokes alone, halo or no halo, end up tangled in the text
          behind them. A cream scrap, tilted a couple of degrees, reads as
          something pinned next to the ring rather than as app chrome. */}
      <span
        style={{
          display: "block",
          background: "rgba(255,252,246,0.94)",
          borderRadius: "14px 12px 15px 11px",
          padding: thai ? "5px 11px 6px" : "2px 10px 0",
          boxShadow: "0 4px 14px rgba(61,34,21,0.16)",
          transform: "rotate(-2.5deg)",
        }}
      >
      {thai ? (
        <span
          style={{
            fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif",
            fontStyle: "italic",
            fontSize: "0.82rem",
            fontWeight: 400,
            color: INK,
            opacity: 0.85,
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
            textShadow: "0 0 5px rgba(255,251,242,0.95), 0 0 2px rgba(255,251,242,0.9)",
          }}
        >
          {label}
        </span>
      ) : (
        <svg
          viewBox={`0 0 ${LATIN_W} 50`}
          width="122"
          height="auto"
          fill="none"
          stroke={INK}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
          style={{ display: "block", overflow: "visible", filter: HALO }}
        >
          {LATIN.map((g, i) => {
            const at = LATIN.slice(0, i).reduce((total, prev) => total + prev.w, 0);
            if (!g.d.length) return null;
            return (
              <g key={i} transform={`translate(${at} 0) rotate(${g.tilt ?? 0} 14 26)`}>
                {g.d.map((d, j) => (
                  <path key={j} d={d} />
                ))}
              </g>
            );
          })}
        </svg>
      )}
      </span>
      {/* Tucked under the note's right end, aimed at the ring. */}
      <span style={{ marginRight: 10, marginTop: thai ? 2 : -2 }}>
        <Arrow />
      </span>
    </motion.div>
  );
}
