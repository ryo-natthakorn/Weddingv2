import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, useInView } from "motion/react";

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

/* Hand-drawn imperfect divider — wavy line instead of straight.
   On first visibility both wavy lines draw simultaneously outward from the
   center diamond (pathLength 0→1), then the diamond fades in. The left line's
   path is authored right→left so its draw starts at the center too. */
export function HandDrawnDivider({ className = "" }: { className?: string }) {
  const { ref, inView } = useReveal("-40px");
  const lineTransition = { duration: 0.9, ease: "easeOut" } as const;

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 justify-center ${className}`}
      style={{ position: "relative" }}
    >
      <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
        <motion.path
          d="M58 4 Q45 6 30 4 Q15 2 2 4"
          stroke="#8A7030"
          strokeWidth="1"
          strokeOpacity="0.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={lineTransition}
        />
      </svg>
      <motion.svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3, delay: 0.85 }}
      >
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
      </motion.svg>
      <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
        <motion.path
          d="M2 4 Q15 6 30 4 T58 4"
          stroke="#8A7030"
          strokeWidth="1"
          strokeOpacity="0.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={lineTransition}
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
  midBrown: "#3A2C18",    // readable warm ink
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


/* ── FitLine — one sentence, one line, at the largest size that fits ──

   Every string on this card used to be set at a fixed px size, so Thai
   sentences that fit on a 430px phone wrapped on a 390px one. FitLine sets the
   text `white-space: nowrap` and scales the font-size to the container instead:

     fontSize = clamp(min, containerWidth / (measuredWidth / 100), max)

   The width is measured from a hidden copy of the same text rendered at 100px
   in the same family/weight/style/transform, so the ratio is exact and
   resolution-independent. The copy is observed by a ResizeObserver, which is
   what makes this safe where two earlier JS-measuring attempts failed (see the
   NAME_FONT_SIZE note in NameIntroWithCountdown.tsx): when `font-display: swap`
   replaces the fallback face with TT Interphases the hidden copy's width
   changes, the observer fires, and the size is recomputed. Observing the
   container — which does not change width on a font swap — is what went stale
   before.

   `min` (13px, the client's floor) is a hard floor. A sentence that would need
   to go below it breaks instead — but only at a break point authored in the
   copy: pass `lines={[...]}` and each entry is rendered as its own fitted line.
   The browser never picks the break itself, because the text is nowrap.

   Notes for callers:
   • `max` accepts any CSS length (px, rem, clamp(), var()) — it is resolved
     through a hidden probe, so media-query-driven `var(--fit-max)` works. Avoid
     `em`: it would resolve against the size this component is computing.
   • letter-spacing must be in `em` (or 0) — a px value does not scale with the
     font-size, so the measurement would not hold.
   • the container's width must not depend on this text (no width:fit-content /
     inline-flex ancestor sizing to content), or measurement and layout chase
     each other. Give such a parent an explicit width and this a flex basis of 0.

   The rendered line count is published as `data-lines`, plus `data-one-line` /
   `data-two-lines`, which specs/one-line-copy-check.mjs asserts against. */
const FIT_MEASURE_PX = 100;

const fitMeasurerBox: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  overflow: "hidden",
  visibility: "hidden",
  pointerEvents: "none",
};

const fitMeasurerText: CSSProperties = {
  display: "inline-block",
  whiteSpace: "nowrap",
  fontSize: `${FIT_MEASURE_PX}px`,
};

export function FitLine({
  as: Tag = "div",
  max,
  min = 13,
  lines,
  className,
  style,
  children,
  ...rest
}: {
  as?: any;
  max: number | string;
  min?: number;
  lines?: ReactNode[];
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  [key: string]: any;
}) {
  const hostRef = useRef<HTMLElement | null>(null);
  const probeRef = useRef<HTMLSpanElement | null>(null);
  const wholeRef = useRef<HTMLSpanElement | null>(null);
  const partRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const segments = lines && lines.length > 1 ? lines : null;
  const segCount = segments ? segments.length : 0;
  const [fit, setFit] = useState<{ stacked: boolean; sizes: number[] }>({ stacked: false, sizes: [] });
  const fitRef = useRef(fit);
  fitRef.current = fit;

  const measure = useCallback(() => {
    const host = hostRef.current;
    const probe = probeRef.current;
    const whole = wholeRef.current;
    if (!host || !probe || !whole) return;
    const cs = getComputedStyle(host);
    const avail = host.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0");
    if (!(avail > 0)) return;
    const maxPx = parseFloat(getComputedStyle(probe).fontSize) || 16;
    const floor = Math.min(min, maxPx);
    // 0.997 absorbs sub-pixel rounding: nowrap text cannot wrap, so a hair too
    // wide would overflow the card rather than fold.
    const sizeFor = (el: HTMLSpanElement | null) => {
      const width = el?.getBoundingClientRect().width ?? 0;
      if (!(width > 0)) return maxPx;
      return Math.round((avail / (width / FIT_MEASURE_PX)) * 0.997 * 100) / 100;
    };
    const clampSize = (value: number) => Math.min(maxPx, Math.max(floor, value));
    const onOneLine = sizeFor(whole);
    const next = segments && onOneLine < min
      ? { stacked: true, sizes: segments.map((_, i) => clampSize(sizeFor(partRefs.current[i]))) }
      : { stacked: false, sizes: [clampSize(onOneLine)] };
    const prev = fitRef.current;
    if (
      prev.stacked === next.stacked &&
      prev.sizes.length === next.sizes.length &&
      prev.sizes.every((value, i) => value === next.sizes[i])
    ) return;
    setFit(next);
  }, [max, min, segments]);

  // Every render: the text itself may have changed (language toggle).
  useLayoutEffect(measure);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => measure());
    if (hostRef.current) observer.observe(hostRef.current);
    if (wholeRef.current) observer.observe(wholeRef.current);
    partRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segCount, measure]);

  const rendered = fit.stacked && segments
    ? segments.map((segment, i) => (
        <span key={i} data-fit-text="" style={{ display: "block", whiteSpace: "nowrap", fontSize: fit.sizes[i] ?? min }}>
          {segment}
        </span>
      ))
    : (
        <span data-fit-text="" style={{ display: "block", whiteSpace: "nowrap", fontSize: fit.sizes[0] ?? undefined }}>
          {children}
        </span>
      );
  const lineCount = fit.stacked && segments ? segments.length : 1;

  return (
    <Tag
      ref={hostRef}
      className={className}
      style={style}
      data-fit-line=""
      data-lines={lineCount}
      {...(lineCount === 1 ? { "data-one-line": "" } : {})}
      {...(lineCount === 2 ? { "data-two-lines": "" } : {})}
      {...rest}
    >
      {rendered}
      <span aria-hidden data-fit-measure="" style={fitMeasurerBox}>
        {/* resolves `max` — any CSS length, including var() set by a media query */}
        <span ref={probeRef} style={{ fontSize: typeof max === "number" ? `${max}px` : max }} />
        <span ref={wholeRef} style={fitMeasurerText}>{children}</span>
        {segments?.map((segment, i) => (
          <span
            key={i}
            ref={(el) => { partRefs.current[i] = el; }}
            style={fitMeasurerText}
          >
            {segment}
          </span>
        ))}
      </span>
    </Tag>
  );
}

/* ── One music note, drawn once ──
   The corner trail around the player and the notes that come to rest on the
   staff in "Our Song" are the same object seen in two places, so they have to
   be the same drawing: a stem laid down first and a head lapped over its foot,
   the way a note is written by hand rather than set in a font.

   Coordinates are SVG user units, so the caller's viewBox decides the size;
   `scale` turns about the head. No shadow and no depth tier — the note is ink
   on paper, not an object floating above it. */
export function MusicNote({
  x = 0,
  y = 0,
  scale = 1,
  opacity = 1,
  color = COLORS.gold,
}: {
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  color?: string;
}) {
  return (
    <g
      data-music-note=""
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={opacity}
      style={{ transformOrigin: "0 0" }}
    >
      <path d="M7.2 -1 L7.6 -29" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <ellipse cx="0" cy="0" rx="8" ry="5.6" fill={color} transform="rotate(-22)" />
    </g>
  );
}
