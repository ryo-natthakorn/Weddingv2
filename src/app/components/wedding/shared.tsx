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

/* ═══════════════════════════════════════════════════════════════
   WATERCOLOR TEXTURE HELPERS — homey, hand-painted feel
═══════════════════════════════════════════════════════════════ */

/* Paper grain texture — adds tactile "real paper" feel via SVG noise */
export function PaperTexture({ opacity = 0.35 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        mixBlendMode: "multiply",
        zIndex: 1,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.42 0 0 0 0 0.22 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    />
  );
}

/* Soft watercolor color washes — irregular blobs of color (peach, sage, gold) */
export function WatercolorWash({
  intensity = 1,
  variant = "warm",
}: {
  intensity?: number;
  variant?: "warm" | "sage" | "soft";
}) {
  const palettes = {
    warm: ["#E8C09A", "#D4A574", "#7A8A5A"],
    sage: ["#7A8A5A", "#B8956A", "#E8C09A"],
    soft: ["#F2D8B8", "#E8C09A", "#A8B080"],
  };
  const [c1, c2, c3] = palettes[variant];
  const o = intensity;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <filter id="wcblur1">
            <feGaussianBlur stdDeviation="50" />
          </filter>
          <filter id="wcblur2">
            <feGaussianBlur stdDeviation="35" />
          </filter>
        </defs>
        <ellipse cx="150" cy="120" rx="220" ry="160" fill={c1} opacity={0.18 * o} filter="url(#wcblur1)" />
        <ellipse cx="680" cy="180" rx="180" ry="140" fill={c2} opacity={0.14 * o} filter="url(#wcblur1)" />
        <ellipse cx="400" cy="440" rx="260" ry="180" fill={c1} opacity={0.12 * o} filter="url(#wcblur1)" />
        <ellipse cx="720" cy="480" rx="160" ry="120" fill={c3} opacity={0.1 * o} filter="url(#wcblur2)" />
        <ellipse cx="80" cy="420" rx="140" ry="100" fill={c3} opacity={0.09 * o} filter="url(#wcblur2)" />
      </svg>
    </div>
  );
}

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

/* Small watercolor flower — hand-painted style accent */
export function WatercolorFlower({
  size = 36,
  color = "#E8C09A",
  centerColor = "#8A7030",
  style,
}: {
  size?: number;
  color?: string;
  centerColor?: string;
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
      <g opacity="0.85">
        {/* 5 petals */}
        {[0, 72, 144, 216, 288].map((rot, i) => (
          <ellipse
            key={i}
            cx="20"
            cy="11"
            rx="5"
            ry="8"
            fill={color}
            opacity="0.55"
            transform={`rotate(${rot} 20 20)`}
          />
        ))}
        {/* Center */}
        <circle cx="20" cy="20" r="3" fill={centerColor} opacity="0.7" />
        <circle cx="20" cy="20" r="1.5" fill="#5A3E25" opacity="0.4" />
      </g>
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

/* Botanical leaf border — watercolor sage greens, more painted feel */
export function BotanicalBorder({ flip = false }: { flip?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        ...(flip ? { bottom: 0 } : { top: 0 }),
        height: 110,
        pointerEvents: "none",
        overflow: "hidden",
        transform: flip ? "scaleY(-1)" : undefined,
        zIndex: 1,
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 800 110"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%" }}
        fill="none"
      >
        <defs>
          <filter id="bb-blur">
            <feGaussianBlur stdDeviation="0.4" />
          </filter>
        </defs>

        {/* Left cluster — softer painted leaves */}
        <g filter="url(#bb-blur)">
          <path
            d="M0 110 Q20 70 12 45 Q32 60 28 78 Q48 50 38 28 Q58 44 48 65 Q68 38 58 18 Q78 32 68 55"
            stroke="#7A8A5A"
            strokeWidth="1.2"
            strokeOpacity="0.4"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M12 45 Q-3 28 8 12 Q22 30 12 45Z" fill="#7A8A5A" fillOpacity="0.28" />
          <path d="M28 78 Q10 60 18 42 Q33 58 28 78Z" fill="#8A9A6A" fillOpacity="0.25" />
          <path d="M48 65 Q30 52 34 32 Q50 46 48 65Z" fill="#7A8A5A" fillOpacity="0.22" />
          <path d="M68 55 Q52 42 54 22 Q70 36 68 55Z" fill="#8A9A6A" fillOpacity="0.2" />
          <path d="M38 28 Q56 20 50 5 Q38 16 38 28Z" fill="#7A8A5A" fillOpacity="0.18" />
          {/* Small gold buds */}
          <circle cx="22" cy="34" r="2.2" fill="#8A7030" fillOpacity="0.5" />
          <circle cx="56" cy="48" r="1.8" fill="#C4A840" fillOpacity="0.55" />
        </g>

        {/* Center sparse leaves */}
        <g filter="url(#bb-blur)">
          <path d="M340 110 Q352 82 342 62 Q360 75 358 92Z" fill="#7A8A5A" fillOpacity="0.16" />
          <path d="M420 105 Q438 78 428 58 Q448 70 442 88Z" fill="#8A9A6A" fillOpacity="0.14" />
          <path d="M380 95 Q392 72 384 55 Q400 66 396 82Z" fill="#7A8A5A" fillOpacity="0.13" />
          <circle cx="400" cy="80" r="1.6" fill="#C4A840" fillOpacity="0.5" />
        </g>

        {/* Right cluster (mirror) */}
        <g filter="url(#bb-blur)">
          <path
            d="M800 110 Q780 70 788 45 Q768 60 772 78 Q752 50 762 28 Q742 44 752 65 Q732 38 742 18 Q722 32 732 55"
            stroke="#7A8A5A"
            strokeWidth="1.2"
            strokeOpacity="0.4"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M788 45 Q803 28 792 12 Q778 30 788 45Z" fill="#7A8A5A" fillOpacity="0.28" />
          <path d="M772 78 Q790 60 782 42 Q767 58 772 78Z" fill="#8A9A6A" fillOpacity="0.25" />
          <path d="M752 65 Q770 52 766 32 Q750 46 752 65Z" fill="#7A8A5A" fillOpacity="0.22" />
          <path d="M732 55 Q748 42 746 22 Q730 36 732 55Z" fill="#8A9A6A" fillOpacity="0.2" />
          <path d="M762 28 Q744 20 750 5 Q762 16 762 28Z" fill="#7A8A5A" fillOpacity="0.18" />
          <circle cx="778" cy="34" r="2.2" fill="#8A7030" fillOpacity="0.5" />
          <circle cx="744" cy="48" r="1.8" fill="#C4A840" fillOpacity="0.55" />
        </g>
      </svg>
    </div>
  );
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
