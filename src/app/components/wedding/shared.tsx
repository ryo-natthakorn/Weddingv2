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

export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 justify-center ${className}`}>
      <div style={{ width: 48, height: 1, background: "rgba(138,112,48,0.35)" }} />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 0C7 0 7.6 3.5 10.5 3.5C7.6 3.5 7 7 7 7C7 7 6.4 3.5 3.5 3.5C6.4 3.5 7 0 7 0Z" fill="#8A7030" fillOpacity="0.6"/>
        <path d="M7 7C7 7 7.6 10.5 10.5 10.5C7.6 10.5 7 14 7 14C7 14 6.4 10.5 3.5 10.5C6.4 10.5 7 7 7 7Z" fill="#8A7030" fillOpacity="0.6"/>
      </svg>
      <div style={{ width: 48, height: 1, background: "rgba(138,112,48,0.35)" }} />
    </div>
  );
}

/* Watercolor-style botanical border — top or bottom */
export function BotanicalBorder({ flip = false }: { flip?: boolean }) {
  return (
    <div style={{
      position: "absolute",
      left: 0, right: 0,
      ...(flip ? { bottom: 0 } : { top: 0 }),
      height: 90,
      pointerEvents: "none",
      overflow: "hidden",
      transform: flip ? "scaleY(-1)" : undefined,
      zIndex: 1,
    }}>
      <svg viewBox="0 0 800 90" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%" }} fill="none">
        {/* Left cluster */}
        <path d="M0 90 Q20 60 10 40 Q30 55 25 70 Q45 45 35 25 Q55 40 45 60 Q65 35 55 15 Q75 30 65 50 Q80 20 90 0" stroke="#7A8A5A" strokeWidth="1" strokeOpacity="0.35" fill="none" strokeLinecap="round"/>
        <path d="M10 40 Q-5 25 5 10 Q20 28 10 40Z" fill="#7A8A5A" fillOpacity="0.2"/>
        <path d="M25 70 Q8 55 15 38 Q30 54 25 70Z" fill="#7A8A5A" fillOpacity="0.18"/>
        <path d="M45 60 Q28 48 32 30 Q48 44 45 60Z" fill="#8A9A6A" fillOpacity="0.15"/>
        <path d="M65 50 Q50 38 52 20 Q67 34 65 50Z" fill="#7A8A5A" fillOpacity="0.18"/>
        <path d="M10 40 Q28 30 25 12 Q12 24 10 40Z" fill="#8A9A6A" fillOpacity="0.12"/>
        <path d="M35 25 Q52 18 48 4 Q36 14 35 25Z" fill="#7A8A5A" fillOpacity="0.12"/>
        {/* Center sparse leaves */}
        <path d="M360 90 Q368 70 360 55 Q375 65 372 78Z" fill="#7A8A5A" fillOpacity="0.1"/>
        <path d="M420 85 Q435 65 428 50 Q442 60 438 74Z" fill="#8A9A6A" fillOpacity="0.08"/>
        {/* Right cluster (mirror) */}
        <path d="M800 90 Q780 60 790 40 Q770 55 775 70 Q755 45 765 25 Q745 40 755 60 Q735 35 745 15 Q725 30 735 50 Q720 20 710 0" stroke="#7A8A5A" strokeWidth="1" strokeOpacity="0.35" fill="none" strokeLinecap="round"/>
        <path d="M790 40 Q805 25 795 10 Q780 28 790 40Z" fill="#7A8A5A" fillOpacity="0.2"/>
        <path d="M775 70 Q792 55 785 38 Q770 54 775 70Z" fill="#7A8A5A" fillOpacity="0.18"/>
        <path d="M755 60 Q772 48 768 30 Q752 44 755 60Z" fill="#8A9A6A" fillOpacity="0.15"/>
        <path d="M735 50 Q750 38 748 20 Q733 34 735 50Z" fill="#7A8A5A" fillOpacity="0.18"/>
        <path d="M790 40 Q772 30 775 12 Q788 24 790 40Z" fill="#8A9A6A" fillOpacity="0.12"/>
        <path d="M765 25 Q748 18 752 4 Q764 14 765 25Z" fill="#7A8A5A" fillOpacity="0.12"/>
      </svg>
    </div>
  );
}

export function LeafSvg({ style }: { style?: CSSProperties }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" style={style}>
      <path d="M45 8 C33 22, 10 34, 8 58 C22 64, 40 52, 45 34 C50 52, 68 64, 82 58 C80 34, 57 22, 45 8Z" fill="#7A8A5A" fillOpacity="0.2"/>
      <path d="M45 8 C45 28, 45 52, 45 82" stroke="#7A8A5A" strokeOpacity="0.25" strokeWidth="1"/>
    </svg>
  );
}

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
};
