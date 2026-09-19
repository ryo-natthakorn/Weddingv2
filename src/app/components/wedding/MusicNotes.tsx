import { useRef } from "react";

/* Notes drifting up from behind the ring while the song plays.

   This replaces the pulse ring that used to circle the player. A halo says
   "this control is active"; notes say the ring is singing, which is what the
   ring is for on this card.

   Four shapes rather than one repeated — a quarter, an eighth, a beamed pair,
   a sixteenth — so a glance reads music rather than a glyph on a loop. They are
   drawn as paths, not typed: a musical character depends on whatever font the
   phone decides to fall back to, and half of them render as a box.

   Driven by a CSS keyframe rather than by motion, for the same reason the pulse
   ring it replaces was: the player re-renders on every progress tick, twice a
   second, and a JS loop restarted by that churn leaves the notes stuck at the
   end of their first cycle. CSS animations are owned by the compositor and do
   not care how often React runs. */

const INK = "#8A7030";
const INK_LIGHT = "#C6A34E";

/* Each shape is drawn in a 0..18 x 0..26 box, stem up, notehead at the bottom
   left, so they all hang from the same point when placed. */
const SHAPES = [
  // Quarter — filled head, plain stem
  "M 4.4 22.4 a 3.6 2.7 -22 1 0 0.1 0.1 M 8 21.2 L 8 3",
  // Eighth — quarter with one flag
  "M 4.4 22.4 a 3.6 2.7 -22 1 0 0.1 0.1 M 8 21.2 L 8 3 C 12.5 5.2 14.6 8 14 12",
  // Beamed pair — two heads under one beam
  "M 3.4 21.6 a 3.2 2.4 -22 1 0 0.1 0.1 M 13.4 19.6 a 3.2 2.4 -22 1 0 0.1 0.1 M 6.6 20.6 L 6.6 4 M 16.6 18.6 L 16.6 2 M 6.6 4 L 16.6 2",
  // Sixteenth — two flags
  "M 4.4 22.4 a 3.6 2.7 -22 1 0 0.1 0.1 M 8 21.2 L 8 3 C 12.5 5.2 14.6 8 14 12 M 8 8.4 C 12.5 10.6 14.6 13.4 14 17.4",
];

const KEYFRAMES = `
@keyframes music-note-rise {
  0%   { opacity: 0; transform: translate3d(0, 0, 0) scale(0.7) rotate(var(--tilt)); }
  18%  { opacity: 0.75; }
  70%  { opacity: 0.7; }
  100% { opacity: 0; transform: translate3d(var(--sway), calc(var(--rise) * -1), 0) scale(0.95) rotate(calc(var(--tilt) * -0.4)); }
}`;

export function MusicNotes() {
  /* Built once. Re-rolling these on every render would restart the notes each
     time the player's state changes, which is twice a second while playing. */
  const notes = useRef(
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      shape: SHAPES[i % SHAPES.length],
      left: 28 + Math.random() * 42,        // % across the ring's box
      /* Kept short on purpose: between the names the ring sits directly under
         the bride's line, and notes that climb much further start crossing it. */
      rise: 34 + Math.random() * 22,        // px travelled upward
      sway: (i % 2 ? 1 : -1) * (7 + Math.random() * 12),
      size: 13 + Math.random() * 6,
      dur: 2.6 + Math.random() * 0.9,
      /* Spread across the longest cycle so at most three or four are ever in
         the air together — a song, not confetti. */
      delay: i * 0.78 + Math.random() * 0.3,
      tilt: (Math.random() - 0.5) * 26,
      light: i % 3 === 0,
    })),
  ).current;

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      <style>{KEYFRAMES}</style>
      {notes.map((n) => (
        <div
          key={n.id}
          style={{
            position: "absolute",
            left: `${n.left}%`,
            top: "34%",
            width: n.size,
            height: n.size * 1.44,
            opacity: 0,
            ["--rise" as string]: `${n.rise}px`,
            ["--sway" as string]: `${n.sway}px`,
            ["--tilt" as string]: `${n.tilt}deg`,
            animation: `music-note-rise ${n.dur}s ease-out ${n.delay}s infinite`,
          }}
        >
          <svg
            viewBox="0 0 18 26"
            width="100%"
            height="100%"
            fill="none"
            stroke={n.light ? INK_LIGHT : INK}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "block", overflow: "visible" }}
          >
            <path d={n.shape} />
          </svg>
        </div>
      ))}
    </div>
  );
}
