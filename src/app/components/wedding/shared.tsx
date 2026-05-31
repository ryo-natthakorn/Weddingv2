import { useRef } from "react";
import type { CSSProperties } from "react";
import { useInView } from "motion/react";

export function useReveal(margin = "-60px") {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: margin as any });
  return { ref, inView };
}

export const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.1, ease: "easeOut" } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* Hand-drawn ink splotch — small irregular accent (like a paint splash) */
export function InkSplotch({
  color = "#8A7030",
  size = 40,
  style,
}: {
  color?: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      style={{ pointerEvents: "none", ...style }}
      aria-hidden
    >
      <defs>
        <filter id={`splotch-blur-${color.slice(1)}`}>
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      <path
        d="M20 4 Q28 6 30 14 Q34 18 32 26 Q30 34 22 35 Q14 36 9 30 Q4 24 6 16 Q9 8 20 4Z"
        fill={color}
        opacity="0.18"
        filter={`url(#splotch-blur-${color.slice(1)})`}
      />
    </svg>
  );
}

/* Hand-drawn imperfect divider — wavy line instead of straight */
export function HandDrawnDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 justify-center ${className}`}
      style={{ position: "relative" }}
    >
      <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
        <path
          d="M2 4 Q15 2 30 4 T58 4"
          stroke="#8A7030"
          strokeWidth="1"
          strokeOpacity="0.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 0C7 0 7.6 3.5 10.5 3.5C7.6 3.5 7 7 7 7C7 7 6.4 3.5 3.5 3.5C6.4 3.5 7 0 7 0Z"
          fill="#8A7030"
          fillOpacity="0.6"
        />
        <path
          d="M7 7C7 7 7.6 10.5 10.5 10.5C7.6 10.5 7 14 7 14C7 14 6.4 10.5 3.5 10.5C6.4 10.5 7 7 7 7Z"
          fill="#8A7030"
          fillOpacity="0.6"
        />
      </svg>
      <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
        <path
          d="M2 4 Q15 6 30 4 T58 4"
          stroke="#8A7030"
          strokeWidth="1"
          strokeOpacity="0.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <HandDrawnDivider className={className} />;
}

export function LeafSvg({ style }: { style?: CSSProperties }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" style={style}>
      <defs>
        <filter id="leaf-blur">
          <feGaussianBlur stdDeviation="0.3" />
        </filter>
      </defs>
      <g filter="url(#leaf-blur)">
        <path
          d="M45 8 C33 22, 10 34, 8 58 C22 64, 40 52, 45 34 C50 52, 68 64, 82 58 C80 34, 57 22, 45 8Z"
          fill="#7A8A5A"
          fillOpacity="0.25"
        />
        <path
          d="M45 8 C45 28, 45 52, 45 82"
          stroke="#7A8A5A"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
        <circle cx="38" cy="38" r="1.5" fill="#8A7030" fillOpacity="0.4" />
        <circle cx="55" cy="48" r="1.2" fill="#C4A840" fillOpacity="0.4" />
      </g>
    </svg>
  );
}

/* Helper style for transparent PNG logos/rings on light backgrounds
   — removes white background via multiply blend mode */
export const transparentImg: CSSProperties = {
  mixBlendMode: "multiply",
};

/* ── Color palette — matches physical invitation card exactly ──
   Primary dark: teal #1B4A5C (card name text)
   Accent: olive gold #8A7030 (PN monogram)
   Background: warm peach-cream (card sky)
*/
export const COLORS = {
  cream: "#F8F1E6",       // warm peach-cream (card background)
  ivory: "#F2E8D2",       // deeper warm ivory
  warmBrown: "#2A1A0A",   // very dark warm (body text)
  midBrown: "#5A3E25",    // warm mid brown
  lightBrown: "#7A5A38",  // warm light brown
  gold: "#8A7030",        // olive gold (PN monogram)
  goldLight: "#C4A840",   // lighter gold
  sage: "#6B8A5A",        // earthy sage green
  blush: "#E8C09A",       // warm peach/apricot
  navy: "#1B4A5C",        // dark teal (primary accent, matches card)
  navyLight: "#2A6A80",   // lighter teal
  tealDark: "#0F3040",    // very dark teal (deep backgrounds)
  white: "#FFF8F0",       // warm white
  paperShadow: "#D4B896", // paper shadow tone
};
