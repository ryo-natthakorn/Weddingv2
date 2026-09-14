import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Grid2X2, GalleryHorizontal, X } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { PanInfo } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
} from "./shared";

/* Stamp album: unfolds into an elliptical ring on entry. Guests control
   navigation; the grouped overview and full-size viewer share the same order. */

const PRE_WEDDING_MODULES = import.meta.glob(
  "../../../imports/pre-wedding/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const PHOTO_GROUPS = [
  ["01-ring-box.jpg"],
  ["11-suan-ben.jpg", "10-suan-ben.jpg", "09-suan-ben.jpg", "08-suan-ben.jpg", "02-rings.jpg", "07-suan-ben.jpg"],
  ["03-saphan-phut.jpg", "04-saphan-phut.jpg", "05-saphan-phut.jpg", "06-saphan-phut.jpg"],
];
const photosByName = new Map(Object.entries(PRE_WEDDING_MODULES).map(([path, src]) => [path.split("/").pop()!, src]));
const assignedNames = new Set(PHOTO_GROUPS.flat());
const PRE_WEDDING_GROUPS = [
  ...PHOTO_GROUPS.map(names => names.flatMap(name => photosByName.has(name) ? [photosByName.get(name)!] : [])),
  [...photosByName.entries()].filter(([name]) => !assignedNames.has(name)).sort(([a], [b]) => a.localeCompare(b)).map(([, src]) => src),
];
const PRE_WEDDING_IMAGES = PRE_WEDDING_GROUPS.flat();

/* Row-major grids keep the requested photo order consistent across widths,
   keyboard navigation and the lightbox. Each group begins on its own row. */
const MOSAIC_CSS = `
.pw-orbit { position: relative; height: 460px; touch-action: pan-y; }
.pw-orbit-card { position: absolute; top: 155px; left: calc(50% - 110px); width: 220px; padding: 0; border: 0; background: none; cursor: pointer; }
.pw-orbit-card img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; }
.pw-controls { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 18px 0 28px; }
.pw-view-toggle { display: grid; place-items: center; width: 44px; height: 44px; background: #FFFDF7; color: #1B4A5C; border: 1px solid #C8BDA1; border-radius: 50%; cursor: pointer; }
@media (min-width: 640px) {
  .pw-orbit { height: 520px; }
  .pw-orbit-card { width: 260px; left: calc(50% - 130px); top: 160px; }
}
.pw-mosaic { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@media (min-width: 640px) { .pw-mosaic { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; } }
.pw-opening { max-width: 280px; margin-inline: auto; }
.pw-gallery > div + div { margin-top: 28px; }
.pw-mosaic > *, .pw-opening > * {
  display: block;
  width: 100%;
  min-width: 0;
  margin: 0;
}

/* Postage-stamp edge, matching the couple's reference: an off-white mat with
   semicircular notches punched along all four sides.

   Four radial-gradient mask layers, one per edge. Each tiles ALONG its own edge
   only -- pitch-wide and full-height for top/bottom, full-width and pitch-tall
   for left/right -- with the hole centred on the edge line, and the four are
   combined with mask-composite so a pixel survives only where every layer keeps
   it. "round" rather than "repeat" so the browser fits a whole number of
   notches per side and no half-notch lands in a corner.

   The mask is on this inner element and never on the button, because a mask
   clips box-shadow: the paper shadow lives on the button as a drop-shadow
   filter instead, which follows the scalloped alpha outline the way the
   reference's does rather than drawing a rectangle behind it. */
.pw-stamp {
  --stamp-pitch: 12px;
  --stamp-notch: 3.4px;
  --stamp-edge: calc(var(--stamp-notch) + 0.35px);
  display: block;
  padding: 11px;
  background: #FFFDF7;
  -webkit-mask-image:
    radial-gradient(circle at 50% 0,    rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 50% 100%, rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 0 50%,    rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 100% 50%, rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge));
  -webkit-mask-size: var(--stamp-pitch) 100%, var(--stamp-pitch) 100%, 100% var(--stamp-pitch), 100% var(--stamp-pitch);
  -webkit-mask-position: 0 0, 0 100%, 0 0, 100% 0;
  -webkit-mask-repeat: round no-repeat, round no-repeat, no-repeat round, no-repeat round;
  -webkit-mask-composite: source-in;
  mask-image:
    radial-gradient(circle at 50% 0,    rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 50% 100%, rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 0 50%,    rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 100% 50%, rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge));
  mask-size: var(--stamp-pitch) 100%, var(--stamp-pitch) 100%, 100% var(--stamp-pitch), 100% var(--stamp-pitch);
  mask-position: 0 0, 0 100%, 0 0, 100% 0;
  mask-repeat: round no-repeat, round no-repeat, no-repeat round, no-repeat round;
  mask-composite: intersect;
}
.pw-stamp img {
  border: 0;
}
@media (min-width: 640px) { .pw-stamp { --stamp-pitch: 14px; --stamp-notch: 4px; padding: 13px; } }
`;

/* A degree or so either way, deterministic per position so the layout is
   stable across re-renders. Every fourth print sits straight, which stops the
   alternation from reading as a zigzag pattern of its own. */
const tiltFor = (i: number) => [-1.2, 1.4, -0.7, 0][i % 4];

function ArrowButton({
  direction,
  onClick,
  disabled,
  label,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "1px solid rgba(138,112,48,0.35)",
        background: "rgba(255,248,240,0.9)",
        boxShadow: "0 6px 16px rgba(138,112,48,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {direction === "prev" ? <ArrowLeft size={18} color={COLORS.gold} /> : <ArrowRight size={18} color={COLORS.gold} />}
    </button>
  );
}

/* Full-screen viewer. Portaled to document.body so its `position: fixed`
   always covers the real viewport — nesting it under the section's own reveal
   animation would otherwise put it inside a transformed ancestor (Framer
   Motion's animated `y` becomes an inline transform), which turns "fixed" into
   "fixed to that ancestor". */
function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const last = images.length - 1;
  const go = useCallback(
    (next: number) => onIndex(Math.max(0, Math.min(last, next))),
    [last, onIndex],
  );

  /* The body scroll lock runs once for the life of the viewer. Keeping it out
     of the key handler's effect matters — that one re-subscribes whenever the
     index changes, and locking/unlocking on every arrow press would let the
     page jump behind the overlay. */
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(index + 1);
    else if (info.offset.x > 60) go(index - 1);
  };

  return createPortal(
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={lang === "TH" ? "ดูรูปขนาดเต็ม" : "Photo viewer"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(42,26,10,0.94)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "24px 16px",
      }}
    >
      {/* Only the photo swaps between steps — the overlay itself is not keyed
          on the image, so paging never re-fades the backdrop. */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 0 }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={images[index]}
            src={images[index]}
            alt=""
            drag={images.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            draggable={false}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92vw",
              maxHeight: "74vh",
              objectFit: "contain",
              borderRadius: 10,
              boxShadow: "0 24px 60px rgba(42,26,10,0.55)",
              display: "block",
              cursor: images.length > 1 ? "grab" : "default",
              touchAction: "pan-y",
            }}
          />
        </AnimatePresence>
      </div>

      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, paddingTop: 18, paddingBottom: "max(4px, env(safe-area-inset-bottom))" }}
        >
          <ArrowButton
            direction="prev"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            label={lang === "TH" ? "รูปก่อนหน้า" : "Previous photo"}
          />
          <span
            aria-live="polite"
            style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.72rem", letterSpacing: "0.16em", color: "rgba(255,248,240,0.75)", minWidth: 62, textAlign: "center" }}
          >
            {index + 1} / {images.length}
          </span>
          <ArrowButton
            direction="next"
            onClick={() => go(index + 1)}
            disabled={index === last}
            label={lang === "TH" ? "รูปถัดไป" : "Next photo"}
          />
        </div>
      )}

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={lang === "TH" ? "ปิด" : "Close"}
        style={{
          position: "absolute",
          top: "max(16px, env(safe-area-inset-top))",
          right: 16,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "1px solid rgba(255,248,240,0.4)",
          background: "rgba(255,248,240,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <X size={18} color="#FFF8F0" />
      </button>
    </motion.div>,
    document.body,
  );
}

/* One matted print in the mosaic. A real button rather than a tap-handling
   div, so it is reachable by keyboard and announces itself. */
function Print({
  src,
  i,
  inView,
  onOpen,
  label,
}: {
  src: string;
  i: number;
  inView: boolean;
  onOpen: () => void;
  label: string;
}) {
  const tilt = tiltFor(i);
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={label}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 26, rotate: tilt }}
      animate={inView ? { opacity: 1, y: 0, rotate: tilt } : {}}
      // The stagger tails off so the eleventh print is not still arriving a
      // full second after the first.
      transition={{ delay: Math.min(i * 0.06, 0.55), duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { rotate: 0, scale: 1.02, zIndex: 2 }}
      whileTap={reduceMotion ? undefined : { rotate: 0, scale: 0.985 }}
      style={{
        padding: 0,
        background: "none",
        border: "none",
        /* drop-shadow, not box-shadow: the mat is masked into a scalloped
           outline and a box-shadow would draw a rectangle behind it. */
        filter: "drop-shadow(0 2px 3px rgba(61,34,21,0.16))",
        cursor: "zoom-in",
        WebkitTapHighlightColor: "transparent",
        position: "relative",
      }}
    >
      <span className="pw-stamp">
        <img
          src={src}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          /* Stable thumbnail geometry prevents lazy-loaded photos from moving
             other columns. The lightbox still shows the complete original. */
          style={{ width: "100%", height: "auto", aspectRatio: "3 / 4", objectFit: "cover", display: "block" }}
        />
      </span>
    </motion.button>
  );
}

export function GallerySection() {
  const { lang, t } = useLang();
  const { ref, inView } = useReveal("-80px");
  const [zoom, setZoom] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [grid, setGrid] = useState(false);
  const reduceMotion = useReducedMotion();
  const orbitRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const [radius, setRadius] = useState(180);
  const count = PRE_WEDDING_IMAGES.length;
  const step = (direction: number) => setActive(i => (i + direction + count) % count);

  useEffect(() => {
    if (grid || !orbitRef.current) return;
    const observer = new ResizeObserver(([entry]) => setRadius(Math.min(290, entry.contentRect.width * 0.53)));
    observer.observe(orbitRef.current);
    return () => observer.disconnect();
  }, [grid]);

  const preWeddingLabel = lang === "TH" ? "พรีเวดดิ้ง" : "Pre-Wedding";
  const preWeddingEmptyText =
    lang === "TH" ? "ภาพพรีเวดดิ้งกำลังจะมาเร็ว ๆ นี้" : "Pre-wedding photos coming soon";

  return (
    <section
      style={{
        padding: "48px 14px 56px",
        position: "relative",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <style>{MOSAIC_CSS}</style>

      <motion.div
        ref={ref}
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: reduceMotion ? 0 : 0.9 }}
        style={{ position: "relative", zIndex: 2, maxWidth: 680, margin: "0 auto" }}
      >
        <p style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "1.375rem", fontWeight: 600, letterSpacing: 0, color: COLORS.navy, textTransform: "uppercase", marginBottom: 4, textAlign: "center" }}>{t.gallery_label}</p>
        <p style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.7rem", letterSpacing: "0.26em", color: COLORS.midBrown, textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>{preWeddingLabel}</p>
        <Divider className="mb-10" />

        {PRE_WEDDING_IMAGES.length === 0 ? (
          <div
            style={{
              width: "100%",
              aspectRatio: "4 / 5",
              maxWidth: 300,
              margin: "0 auto",
              borderRadius: 20,
              background: COLORS.ivory,
              border: "1px dashed rgba(138,112,48,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 28px",
              color: COLORS.lightBrown,
              fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif",
              fontSize: "0.85rem",
              letterSpacing: "0.04em",
              lineHeight: 1.5,
            }}
          >
            {preWeddingEmptyText}
          </div>
        ) : (
          <>
          {!grid && <div
            ref={orbitRef}
            className="pw-orbit"
            role="region"
            aria-roledescription="carousel"
            aria-label={preWeddingLabel}
            onKeyDown={e => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1);
              }
            }}
            onPointerDown={e => { pointer.current = { x: e.clientX, y: e.clientY }; swiped.current = false; }}
            onPointerUp={e => {
              if (!pointer.current) return;
              const dx = e.clientX - pointer.current.x;
              const dy = e.clientY - pointer.current.y;
              if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped.current = true; step(dx < 0 ? 1 : -1); }
              pointer.current = null;
            }}
            onPointerCancel={() => { pointer.current = null; }}
          >
            {PRE_WEDDING_IMAGES.map((src, i) => {
              const angle = (i - active) * Math.PI * 2 / count;
              const depth = (Math.cos(angle) + 1) / 2;
              const selected = i === active;
              return <motion.button
                type="button"
                key={src}
                className="pw-orbit-card"
                aria-label={lang === "TH" ? `เปิดรูปที่ ${i + 1} จาก ${count}` : `Open photo ${i + 1} of ${count}`}
                aria-current={selected ? "true" : undefined}
                tabIndex={selected ? 0 : -1}
                initial={reduceMotion ? false : { x: 0, y: 0, scale: 0.94, rotate: tiltFor(i) }}
                animate={inView || reduceMotion ? { x: Math.sin(angle) * radius, y: -145 * (1 - depth), scale: 0.4 + depth * 0.6, rotate: Math.sin(angle) * 8 } : {}}
                transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{ zIndex: Math.round(depth * 100), filter: "drop-shadow(0 6px 7px rgba(61,34,21,0.18))" }}
                onClick={() => { if (!swiped.current) { if (selected) setZoom(i); else setActive(i); } }}
              >
                <span className="pw-stamp"><img src={src} alt="" draggable={false} loading="lazy" decoding="async" /></span>
              </motion.button>;
            })}
          </div>}
          <div className="pw-controls">
            {!grid && <>
              <ArrowButton direction="prev" onClick={() => step(-1)} disabled={count < 2} label={lang === "TH" ? "รูปก่อนหน้า" : "Previous photo"} />
              <span aria-live="polite" style={{ minWidth: 64, textAlign: "center", color: COLORS.navy }}>{active + 1} / {count}</span>
              <ArrowButton direction="next" onClick={() => step(1)} disabled={count < 2} label={lang === "TH" ? "รูปถัดไป" : "Next photo"} />
            </>}
            <button type="button" className="pw-view-toggle" onClick={() => setGrid(!grid)} aria-label={grid ? (lang === "TH" ? "ดูรูปแบบวง" : "Ring view") : (lang === "TH" ? "ดูรูปทั้งหมด" : "All photos")} title={grid ? (lang === "TH" ? "ดูรูปแบบวง" : "Ring view") : (lang === "TH" ? "ดูรูปทั้งหมด" : "All photos")}>
              {grid ? <GalleryHorizontal size={20} /> : <Grid2X2 size={20} />}
            </button>
          </div>
          {grid &&
          <div className="pw-gallery" aria-label={lang === "TH" ? "รูปพรีเวดดิ้ง" : "Pre-wedding photos"}>
            {PRE_WEDDING_GROUPS.map((photos, groupIndex) => photos.length > 0 && (
              <div key={groupIndex} className={groupIndex === 0 ? "pw-opening" : "pw-mosaic"}>
                {photos.map(src => {
                  const i = PRE_WEDDING_IMAGES.indexOf(src);
                  return (
                    <Print
                      key={src}
                      src={src}
                      i={i}
                      inView={inView}
                      onOpen={() => setZoom(i)}
                      label={
                        lang === "TH"
                          ? `เปิดรูปที่ ${i + 1} จาก ${PRE_WEDDING_IMAGES.length}`
                          : `Open photo ${i + 1} of ${PRE_WEDDING_IMAGES.length}`
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>}
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {zoom !== null && (
          <Lightbox
            images={PRE_WEDDING_IMAGES}
            index={zoom}
            onIndex={setZoom}
            onClose={() => setZoom(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
