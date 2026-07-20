import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "motion/react";
import type { PanInfo } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
} from "./shared";

/* ───────────────────────────────────────────────────────────────
   GALLERY — FILM ROLL MECHANIC (growing strip)
   ----------------------------------------------------------------
   Two film rolls stacked vertically. A Kodak-style canister is fixed
   at one edge; a "Pull me" tab sits immediately beside its mouth. At
   rest only the canister + tab show against the dark unexposed film.
   Dragging the tab away from the canister GROWS the exposed photo
   strip — its width equals how far the tab has travelled — so frames
   emerge from the canister one at a time. The dark film backdrop to
   the leading side reads as film still inside the roll. When the tab
   reaches the far edge the roll snaps fully open and the strip becomes
   a horizontally-scrollable filmstrip to browse the rest.

   Roll 1 — Our Memories : canister LEFT,  grows RIGHTWARD
   Roll 2 — Pre-Wedding  : canister RIGHT, grows LEFTWARD (mirror)
─────────────────────────────────────────────────────────────── */

/* Personal photos — Roll 1 */
const STORY_IMAGES = [
  "https://images.unsplash.com/photo-1502389498275-fe50566c4c5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwb3J0cmFpdCUyMHN1bnNldCUyMGdvbGRlbiUyMGhvdXIlMjBsb3ZlfGVufDF8fHx8MTc3ODQ2OTIxMHww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1776957389179-b2388f2653ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjB3YWxraW5nJTIwaGFuZCUyMGluJTIwaGFuZCUyMG5hdHVyZSUyMHBhdGh8ZW58MXx8fHwxNzc4NDY5MjExfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1768561715378-2de6d0fe4fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwcm9wb3NhbCUyMHJpbmclMjByb21hbnRpYyUyMG91dGRvb3J8ZW58MXx8fHwxNzc4NDY5MjExfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1775441522523-317359de673f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBsYXVnaGluZyUyMGhhcHB5JTIwcGljbmljJTIwb3V0ZG9vcnxlbnwxfHx8fDE3Nzg0NjkyMTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
];

/* Pre-Wedding shoot — Roll 2.
   ►► CLIENT: replace these with the real pre-wedding photos.
      The mechanic adapts to however many images you provide.
      Leave the array empty ([]) to show a gentle placeholder. */
const PRE_WEDDING_IMAGES = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1525258946800-98cfd641d0de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
];

const CANISTER_W = 46; // fixed canister width at the roll edge
const TAB_W = 14; // pull-tab film-leader width
const SPROCKET = 16; // perforated edge band height (top & bottom)
const STRIP_H = 168; // photo frame height
const TOTAL_H = STRIP_H + SPROCKET * 2;
const FRAME_W = 150; // each photo frame width
const FRAME_GAP = 5; // dark border between frames
const FILM_BG = "#3A1A00"; // dark brown film base

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/* Perforated sprocket band — runs along top or bottom of the strip */
function SprocketBand({ edge }: { edge: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [edge]: 0,
        height: SPROCKET,
        background: FILM_BG,
        backgroundImage:
          "repeating-linear-gradient(to right, transparent 0 11px, rgba(250,244,232,0.92) 11px 21px, transparent 21px 32px)",
        backgroundSize: "32px 8px",
        backgroundPosition: "center",
        backgroundRepeat: "repeat-x",
        zIndex: 4,
        pointerEvents: "none",
      }}
    />
  );
}

/* Kodak-style film canister fixed at the roll edge */
function Canister({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        height: TOTAL_H,
        [side]: 0,
        width: CANISTER_W,
        zIndex: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: isLeft ? "flex-end" : "flex-start",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: CANISTER_W - 4,
          height: "100%",
          borderRadius: isLeft ? "8px 0 0 8px" : "0 8px 8px 0",  // flat edge faces the strip
          background: "linear-gradient(180deg, #F0AE54 0%, #C9791F 52%, #9C5712 100%)",
          // only shadow casts away from the strip — strip-facing edge stays flush
          boxShadow: isLeft
            ? "-4px 0 12px rgba(0,0,0,0.3)"
            : "4px 0 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* spool hole */}
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: FILM_BG,
            boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.32)",
          }}
        />
      </div>
    </div>
  );
}

function FilmRoll({
  images,
  label,
  swipeHint,
  emptyText,
  side,
}: {
  images: string[];
  label: string;
  swipeHint: string;
  emptyText: string;
  side: "left" | "right";
}) {
  const isLeft = side === "left";
  const reduceMotion = useReducedMotion();

  const wrapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [W, setW] = useState(0); // measured strip width
  const [done, setDone] = useState(false); // fully unrolled → browse mode
  const [hintGone, setHintGone] = useState(false);
  const [pct, setPct] = useState(0); // coarse openness (aria + keyboard), not per-frame

  // Drag position of the tab (transform x relative to its anchored edge).
  const x = useMotionValue(0);
  // travel mirrored as a motion value so the cover transform recomputes once
  // the measured width arrives (x alone may not have changed by then).
  const travelMV = useMotionValue(0);

  // travel = how far the tab can move before hitting the far edge
  const travel = Math.max(0, W - CANISTER_W - TAB_W);

  // The exposed strip grows from the canister: its width equals how far the
  // tab has been pulled away from the canister mouth.
  const stripW = useTransform([x, travelMV], ([xv, t]: number[]) =>
    clamp(isLeft ? xv : -xv, 0, t),
  );

  const hasImages = images.length > 0;

  /* Measure the strip width and keep it current on resize/rotate. */
  useLayoutEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      setW(w);
      travelMV.set(Math.max(0, w - CANISTER_W - TAB_W));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [travelMV]);

  /* Right-side roll browses from the canister (right) leftward. While growing
     the row is right-anchored (no scroll), but the moment `done` flips the row
     enters normal flow — anchor the view to the canister end (image[0] lives at
     the far right), otherwise the browse view jumps to the wrong end. */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || isLeft) return;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [isLeft, done, W, images.length]);

  /* Retire the swipe hint after a moment once unrolled. */
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setHintGone(true), 4200);
    return () => clearTimeout(id);
  }, [done]);

  const openTo = isLeft ? travel : -travel;

  const settle = (open: boolean) => {
    animate(x, open ? openTo : 0, {
      type: "spring",
      stiffness: 360,
      damping: 34,
      onComplete: () => {
        if (open) setDone(true);
      },
    });
  };

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    const p = clamp(isLeft ? x.get() : -x.get(), 0, travel);
    const fast = isLeft ? info.velocity.x > 380 : info.velocity.x < -380;
    const open = p > travel * 0.4 || fast;
    settle(open);
    setPct(open ? 100 : 0);
  };

  /* Keyboard operation of the pull tab — value = openness (0–100). */
  const nudgeOpen = (delta: number) => {
    const cur = clamp(isLeft ? x.get() : -x.get(), 0, travel);
    const next = clamp(cur + delta * travel, 0, travel);
    if (travel > 0 && next >= travel - 1) {
      settle(true);
      setPct(100);
      return;
    }
    animate(x, isLeft ? next : -next, { type: "spring", stiffness: 360, damping: 34 });
    setPct(travel > 0 ? Math.round((next / travel) * 100) : 0);
  };

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        nudgeOpen(0.15);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        nudgeOpen(-0.15);
        break;
      case "End":
      case "Enter":
      case " ":
        e.preventDefault();
        settle(true);
        setPct(100);
        break;
      case "Home":
        e.preventDefault();
        settle(false);
        setPct(0);
        break;
    }
  };

  // Keep a normal `row` flex (predictable scrollLeft). For the right roll we
  // reverse the images and swap the canister spacer to the trailing side, so
  // image[0] ends up next to the right canister and is revealed first.
  const frameList = isLeft ? images : [...images].reverse();

  return (
    <div style={{ width: "100%" }}>
      {/* Section label above the roll */}
      <p
        style={{
          fontFamily: "'TT Interphases', sans-serif",
          fontSize: "0.7rem",
          letterSpacing: "0.26em",
          color: COLORS.lightBrown,
          textTransform: "uppercase",
          textAlign: isLeft ? "left" : "right",
          marginBottom: 12,
          paddingInline: 4,
        }}
      >
        {label}
      </p>

      {/* The strip — transparent wrapper; the dark film is the growing strip */}
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          width: "100%",
          height: TOTAL_H,
          overflow: "visible",
          background: "transparent",
          userSelect: "none",
        }}
      >
        {/* Growing film strip — the dark film base grows from the canister as
            the tab is pulled, holding the sprockets + photo window. clip-path
            clips its whole subtree (iOS-safe) so photos reveal as it grows. */}
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            [isLeft ? "left" : "right"]: CANISTER_W,
            width: done ? Math.max(0, W - CANISTER_W) : stripW,
            background: FILM_BG,
            boxShadow: "0 16px 42px rgba(61,34,21,0.28)",
            overflow: "hidden",
            clipPath: "inset(0)",
          }}
        >
          {/* Photo window — fills the growing strip; reveals frames as it
              grows, becomes a horizontal filmstrip once fully unrolled. */}
          {hasImages && (
            <motion.div
              ref={viewportRef}
              style={{
                position: "absolute",
                inset: 0,
                overflowX: done ? "auto" : "hidden",
                overflowY: "hidden",
                touchAction: done ? "auto" : "pan-y",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                zIndex: 1,
              }}
            >
            {/* Photo row — fixed layout anchored to the canister side, so the
                growing window reveals one frame at a time. */}
            <div
              style={{
                position: done ? "relative" : "absolute",
                top: 0,
                [isLeft ? "left" : "right"]: 0,
                height: "100%",
                width: "max-content",
                display: "flex",
                alignItems: "center",
              }}
            >
              {frameList.map((src) => (
                <div
                  key={src}
                  style={{
                    flex: "0 0 auto",
                    width: FRAME_W,
                    height: STRIP_H,
                    marginInline: FRAME_GAP / 2,
                    borderRadius: 2,
                    overflow: "hidden",
                    background: "#000",
                    boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.55)",
                  }}
                >
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      filter: "sepia(26%) saturate(0.94) contrast(0.98)",
                    }}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

          {/* Sprocket bands — run along the growing film strip */}
          <SprocketBand edge="top" />
          <SprocketBand edge="bottom" />
        </motion.div>

        {/* Empty-state placeholder (e.g. pre-wedding photos not yet provided) */}
        {!hasImages && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 40px",
              color: "rgba(250,244,232,0.62)",
              fontFamily: "'TT Interphases', sans-serif",
              fontSize: "0.74rem",
              letterSpacing: "0.08em",
              lineHeight: 1.5,
              zIndex: 1,
            }}
          >
            {emptyText}
          </div>
        )}

        {/* Draggable "Pull me" tab — rides the leading edge of the growing strip */}
        {hasImages && !done && W > 0 && (
          <motion.div
            drag="x"
            dragConstraints={isLeft ? { left: 0, right: travel } : { left: -travel, right: 0 }}
            dragElastic={0.05}
            dragMomentum={false}
            onDragEnd={onDragEnd}
            style={{
              x,
              position: "absolute",
              top: 0,
              bottom: 0,
              [isLeft ? "left" : "right"]: CANISTER_W,
              width: TAB_W,
              background: "transparent",
              zIndex: 5,
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "none",
            }}
            whileTap={{ cursor: "grabbing" }}
            role="slider"
            aria-label="Pull to reveal photos"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            tabIndex={0}
            onKeyDown={onTabKeyDown}
          >
            {/* thin dark film-leader strip with a bobbing chevron */}
            <div
              style={{
                width: 14,
                height: "90%",
                background: FILM_BG,
                borderRadius: isLeft ? "0 3px 3px 0" : "3px 0 0 3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <motion.span
                animate={reduceMotion ? undefined : { x: isLeft ? [0, 3, 0] : [0, -3, 0] }}
                transition={reduceMotion ? undefined : { repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}
              >
                {isLeft ? "›› " : " ‹‹"}
              </motion.span>
            </div>
          </motion.div>
        )}

        {/* Canister fixed at the edge */}
        {hasImages && <Canister side={side} />}

        {/* Swipe-to-browse hint once unrolled */}
        {hasImages && done && !hintGone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              bottom: SPROCKET + 8,
              [isLeft ? "right" : "left"]: 12,
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 100,
              background: "rgba(27,14,4,0.55)",
              backdropFilter: "blur(3px)",
              pointerEvents: "none",
            }}
          >
            <motion.span
              animate={reduceMotion ? undefined : { x: isLeft ? [0, 5, 0] : [0, -5, 0] }}
              transition={reduceMotion ? undefined : { repeat: Infinity, duration: 1.3, ease: "easeInOut" }}
              style={{ display: "flex", color: "rgba(255,248,238,0.95)" }}
            >
              <svg width="14" height="12" viewBox="0 0 14 12" fill="none" style={{ transform: isLeft ? "none" : "scaleX(-1)" }}>
                <path d="M1 6H12M12 6L8 2M12 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.span>
            <span
              style={{
                fontFamily: "'TT Interphases', sans-serif",
                fontSize: "0.58rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,248,238,0.95)",
              }}
            >
              {swipeHint}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function GallerySection() {
  const { lang } = useLang();
  const { ref, inView } = useReveal("-80px");

  const memoriesLabel = lang === "TH" ? "ความทรงจำของเรา" : "Our Memories";
  const preWeddingLabel = lang === "TH" ? "พรีเวดดิ้ง" : "Pre-Wedding";
  const swipeHint = lang === "TH" ? "ปัดเพื่อชม" : "Swipe to browse";
  const emptyText =
    lang === "TH" ? "ภาพพรีเวดดิ้งกำลังจะมาเร็ว ๆ นี้" : "Pre-wedding photos coming soon";

  return (
    <section
      style={{
        padding: "76px 14px 88px",
        position: "relative",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ position: "relative", zIndex: 2, maxWidth: 560, margin: "0 auto" }}
      >
        <Divider className="mb-10" />

        {/* Roll 1 — Our Memories (canister left, drag rightward) */}
        <FilmRoll
          images={STORY_IMAGES}
          label={memoriesLabel}
          swipeHint={swipeHint}
          emptyText={emptyText}
          side="left"
        />

        <div style={{ height: 40 }} />

        {/* Roll 2 — Pre-Wedding (canister right, drag leftward) */}
        <FilmRoll
          images={PRE_WEDDING_IMAGES}
          label={preWeddingLabel}
          swipeHint={swipeHint}
          emptyText={emptyText}
          side="right"
        />
      </motion.div>
    </section>
  );
}
