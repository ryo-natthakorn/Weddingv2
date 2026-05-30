import { useState } from "react";
import { motion } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
  WatercolorWash,
  PaperTexture,
  WatercolorFlower,
} from "./shared";

const ENV_W = "min(300px, 80vw)";
const ENV_H = 220;

/* Dummy QR placeholder — client swaps in the real PromptPay PNG later.
   Drop the real file at src/imports/promptpay-qr.png and replace
   <DummyQR /> with an <img>. */
function DummyQR() {
  // A deterministic 9x9 pseudo-QR pattern so it reads as a QR at a glance.
  const cells = 9;
  const size = 108;
  const unit = size / cells;
  const filled = (r: number, c: number) => {
    // three finder squares (top-left, top-right, bottom-left)
    const inFinder = (r0: number, c0: number) =>
      r >= r0 && r < r0 + 3 && c >= c0 && c < c0 + 3;
    if (inFinder(0, 0) || inFinder(0, 6) || inFinder(6, 0)) {
      const ring =
        (r === 0 || r === 2 || r === 6 || r === 8) ||
        (c === 0 || c === 2 || c === 6 || c === 8);
      return ring || (r % 8 === 1 && c % 8 === 1) ? true : (r + c) % 2 === 0 && false;
    }
    return (r * 3 + c * 7) % 5 < 2;
  };

  return (
    <div style={{ position: "relative", width: size, height: size, background: "#fff", borderRadius: 6, padding: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
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

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <motion.div
        onClick={() => setOpen(true)}
        animate={open ? { y: 0 } : { y: [0, -8, 0] }}
        transition={open ? { duration: 0.4 } : { repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
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
        aria-label={t.gift_tap}
      >
        {/* Envelope body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            background: "linear-gradient(160deg, #EBDDC4 0%, #DFCBA6 100%)",
            border: "1px solid rgba(138,112,48,0.3)",
            boxShadow: "0 16px 40px rgba(61,34,21,0.18)",
            overflow: "visible",
          }}
        >
          {/* QR + details tucked inside the envelope body */}
          <motion.div
            initial={false}
            animate={open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 12 }}
            transition={{ delay: open ? 0.38 : 0, duration: 0.5 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 8,
                borderRadius: 8,
                boxShadow: "0 4px 14px rgba(61,34,21,0.18)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <DummyQR />
              <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.5rem", letterSpacing: "0.04em", color: "#A89078" }}>
                [ Replace with PromptPay QR ]
              </span>
            </div>
            <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.78rem", fontWeight: 500, color: COLORS.midBrown }}>
              {t.gift_account}
            </span>
            <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase", color: COLORS.gold }}>
              {t.gift_promptpay}
            </span>
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
              background: "linear-gradient(160deg, #DFCBA6 0%, #CDB884 100%)",
              borderRadius: "12px 12px 0 0",
              boxShadow: "0 4px 10px rgba(61,34,21,0.12)",
            }}
          />
          {/* Heart seal at the flap tip */}
          {!open && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "calc(100% - 18px)",
                transform: "translate(-50%, -50%)",
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${COLORS.gold}, #6B5520)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 3px 8px rgba(138,112,48,0.4)",
              }}
            >
              <span style={{ color: "#FFF8EE", fontSize: "0.85rem" }}>♥</span>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Tap hint — only before opening */}
      {!open && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.78rem", fontWeight: 300, color: COLORS.lightBrown, letterSpacing: "0.08em", marginTop: 22 }}
        >
          {t.gift_tap}
        </motion.p>
      )}
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
        padding: "80px 24px 96px",
        background: "transparent",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <WatercolorWash variant="soft" intensity={0.45} />
      <PaperTexture opacity={0.25} />
      <WatercolorFlower size={30} color="#D4A574" style={{ position: "absolute", top: 70, left: 32, opacity: 0.45, zIndex: 1 }} />
      <WatercolorFlower size={26} color="#A8B080" centerColor="#7A8A5A" style={{ position: "absolute", top: 100, right: 34, opacity: 0.4, zIndex: 1 }} />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ position: "relative", zIndex: 2, maxWidth: 520, margin: "0 auto" }}
      >
        <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.7rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 14, lineHeight: 1.6 }}>
          {t.gift_heading}
        </p>
        <Divider className="mb-12" />

        <div style={{ marginTop: 8, marginBottom: 40 }}>
          <Envelope />
        </div>

        <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.85rem, 2.2vw, 1rem)", fontStyle: "italic", fontWeight: 300, color: COLORS.midBrown, lineHeight: 1.8 }}>
          {t.gift_closing}
        </p>
      </motion.div>
    </section>
  );
}
