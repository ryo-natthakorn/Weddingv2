import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
} from "./shared";

const ENV_W = "min(340px, 85vw)";
const ENV_H = 300;
/* QR display size. The envelope grew with it so the code still sits in a
   comfortable margin rather than crowding the edges: 300 tall − 36 padding
   leaves 264, and the width floor (85vw − 40 at 320px ≈ 232) clears 62vw. */
const QR_SIZE = "min(216px, 62vw)";
/* Placeholder QR is drawn as a fixed-size SVG grid, so it needs a number. */
const DUMMY_QR_PX = 216;

/* Real PromptPay QR — drop a file named "promptpay-qr" (any common image
   extension) into src/imports/ and it replaces the dummy placeholder
   automatically, no code changes needed. */
const QR_IMAGE_MODULES = import.meta.glob(
  "../../../imports/promptpay-qr.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;
const REAL_QR_URL = Object.values(QR_IMAGE_MODULES)[0];

/* Dummy QR placeholder — shown until the real file above exists. */
function DummyQR() {
  // A deterministic 9x9 pseudo-QR pattern so it reads as a QR at a glance.
  const cells = 9;
  const size = DUMMY_QR_PX;
  const unit = size / cells;
  const filled = (r: number, c: number) => {
    // three solid finder squares (top-left, top-right, bottom-left)
    const inFinder = (r0: number, c0: number) =>
      r >= r0 && r < r0 + 3 && c >= c0 && c < c0 + 3;
    if (inFinder(0, 0) || inFinder(0, 6) || inFinder(6, 0)) return true;
    return (r * 3 + c * 7) % 5 < 2;
  };

  return (
    <div style={{ position: "relative", width: QR_SIZE, aspectRatio: "1", background: "#fff", borderRadius: 6, padding: 0 }}>
      {/* viewBox does the scaling — the grid math stays in fixed units while
          the rendered box follows the same responsive size as the real QR. */}
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <rect width={size} height={size} fill="#fff" />
        {Array.from({ length: cells }).map((_, r) =>
          Array.from({ length: cells }).map((_, c) =>
            filled(r, c) ? (
              <rect
                key={`${r}-${c}`}
                x={c * unit}
                y={r * unit}
                width={unit}
                height={unit}
                fill="#2A1A0A"
              />
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}

function Envelope() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <motion.div
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        animate={open || reduceMotion ? { y: 0 } : { y: [0, -8, 0] }}
        transition={open ? { duration: 0.4 } : reduceMotion ? { duration: 0 } : { repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
        style={{
          position: "relative",
          width: ENV_W,
          height: ENV_H,
          perspective: 1000,
          cursor: open ? "default" : "pointer",
        }}
        whileHover={open ? {} : { scale: 1.02 }}
        whileTap={open ? {} : { scale: 0.98 }}
        role="button"
        tabIndex={open ? -1 : 0}
        aria-expanded={open}
        aria-label={t.gift_tap}
      >
        {/* Envelope body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            background: "rgba(255, 248, 235, 0.95)",
            border: "1.5px solid rgba(138, 112, 48, 0.5)",
            boxShadow: "0 12px 36px rgba(138, 112, 48, 0.25)",
            overflow: "visible",
          }}
        >
          {/* QR tucked inside the envelope body — just the picture, no card
              frame or labels: the QR image already carries its own white
              quiet-zone margin, so an extra white card behind it is
              redundant. */}
          <motion.div
            initial={false}
            animate={open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 12 }}
            transition={{ delay: open ? 0.38 : 0, duration: 0.5 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px 20px",
              zIndex: 2,
            }}
          >
            {REAL_QR_URL ? (
              <img
                src={REAL_QR_URL}
                alt="PromptPay QR code"
                style={{ width: QR_SIZE, aspectRatio: "1", objectFit: "contain", display: "block" }}
              />
            ) : (
              <DummyQR />
            )}
          </motion.div>

          {/* Envelope front pocket (lower V) — sits over the card edges */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              top: 0,
              clipPath: "polygon(0 38%, 50% 100%, 100% 38%, 100% 100%, 0 100%)",
              background: "linear-gradient(160deg, #E3D2B0 0%, #D4BC8E 100%)",
              borderRadius: 12,
              pointerEvents: "none",
              opacity: open ? 0.55 : 1,
              transition: "opacity 0.5s",
              zIndex: 1,
            }}
          />
        </div>

        {/* Flap — opens upward to reveal the card */}
        <motion.div
          animate={{ rotateX: open ? -172 : 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: ENV_H / 2,
            transformOrigin: "top center",
            transformStyle: "preserve-3d",
            zIndex: open ? 0 : 4,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              background: "linear-gradient(160deg, #E0CBA0 0%, #DCC89A 100%)",
              borderRadius: "12px 12px 0 0",
              boxShadow: "0 4px 10px rgba(61,34,21,0.12)",
            }}
          />
          {/* Heart seal at the flap tip — fades out as the flap lifts.
              Centering lives on this static wrapper, not the animated
              motion.div below: Framer Motion owns the `transform` property
              once scale/opacity are animated on an element and silently
              drops any hand-written translate(-50%,-50%) on that same node. */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "calc(100% - 18px)",
              transform: "translate(-50%, -50%)",
              width: 36,
              height: 36,
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ opacity: open ? 0 : 1, scale: open ? 0.8 : 1 }}
              transition={{ duration: 0.2 }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #A88030, #7A5520)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 3px 10px rgba(138,112,48,0.45)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 17.5C10 17.5 2 11.8 2 6.8C2 3.9 4.4 1.5 7.3 1.5C8.9 1.5 10 2.6 10 2.6C10 2.6 11.1 1.5 12.7 1.5C15.6 1.5 18 3.9 18 6.8C18 11.8 10 17.5 10 17.5Z"
                  fill="#FFF8EE"
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Tap hint — stays mounted and fades on open, so the closing line
          below never jumps up */}
      <motion.p
        animate={open ? { opacity: 0 } : reduceMotion ? { opacity: 0.7 } : { opacity: [0.5, 1, 0.5] }}
        transition={open ? { duration: 0.4 } : reduceMotion ? { duration: 0.3 } : { repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        aria-hidden={open}
        style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.78rem", fontWeight: 300, color: COLORS.lightBrown, letterSpacing: "0.08em", marginTop: 22 }}
      >
        {t.gift_tap}
      </motion.p>
    </div>
  );
}

export function GiftSection() {
  const { t } = useLang();
  const { ref, inView } = useReveal("-80px");

  return (
    <section
      id="gift-section"
      ref={ref}
      style={{
        padding: "44px 24px 72px",
        background: "transparent",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ position: "relative", zIndex: 2, maxWidth: 520, margin: "0 auto" }}
      >
        <p style={{ position: "relative", zIndex: 3, fontFamily: "'TT Interphases', sans-serif", fontSize: "1.1rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 14, lineHeight: 1.6 }}>
          {t.gift_heading}
        </p>
        <Divider className="mb-12" />

        <div style={{ marginTop: 36, marginBottom: 40 }}>
          <Envelope />
        </div>

        <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.85rem, 2.2vw, 1rem)", fontStyle: "italic", fontWeight: 300, color: COLORS.midBrown, lineHeight: 1.8 }}>
          {t.gift_closing}
        </p>
      </motion.div>
    </section>
  );
}
