import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
} from "./shared";

/* 100% keeps the envelope inside the section's content box at any width, so it
   can never overflow the way a fixed vw value can.

   Landscape proportions rather than the original 257x340 — taller than it was
   wide, which read as an odd portrait shape rather than an envelope. Height
   grew from 280 to 300 to make room for a bigger QR (below) while keeping the
   width:height ratio close to where it was (0.92 -> 0.91 at the 320px floor,
   1.5 -> 1.4 at the 420px cap) — still landscape-at-rest, still near-square
   rather than portrait at the narrowest width. Height is a fixed px (not
   aspect-ratio) because the flap below is sized off ENV_H/2 in JS; switching
   to aspect-ratio would decouple the flap from the body's actual rendered
   height. */
const ENV_W = "min(420px, 100%)";
const ENV_H = 300;
/* QR display size, sized to clear both dimensions at every width. Content-
   layer padding (below) was trimmed from 18px/20px to 12px/16px specifically
   to free up more of this room without growing the envelope further. Available
   space inside the envelope is now width-32 / height-24. Height is the
   binding constraint since it's fixed: 300 − 24 = 276, comfortably above the
   250 cap (26px to spare). Width only gets tighter than that below ~390px
   viewport, where 64vw already caps QR_SIZE under the remaining room (checked
   at 320px: available width 240 vs. 64vw≈205). */
const QR_SIZE = "min(250px, 64vw)";
/* Placeholder QR is drawn as a fixed-size SVG grid, so it needs a number. */
const DUMMY_QR_PX = 250;

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

/* Hand the QR to the phone's own "save/share" sheet.

   There is deliberately no deep link into a banking app. Thai banking apps
   (SCB Easy, K PLUS, KMA, Bualuang…) each expose their own private URL
   schemes, none documented or guaranteed stable, and we cannot know which
   bank a guest uses — a wrong scheme just dead-ends on a blank page. What
   every one of them does support is scanning a PromptPay QR out of the photo
   library, so getting the image into the guest's photos is the reliable path.

   navigator.share with a file opens the native sheet, where "Save Image" sits
   next to the banking apps themselves — often a single tap into the app with
   the QR attached. Falls back to a plain download where that isn't supported
   (notably desktop browsers). */
function downloadQr(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "promptpay-qr.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function Envelope() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const reduceMotion = useReducedMotion();

  /* Fetch the QR as a File as soon as the envelope opens, not on click: iOS
     Safari revokes the user-gesture grant across an await, so navigator.share
     has to be reachable synchronously from the handler below. */
  useEffect(() => {
    if (!open || !REAL_QR_URL || qrFile) return;
    let cancelled = false;
    fetch(REAL_QR_URL)
      .then((r) => r.blob())
      .then((b) => {
        if (!cancelled) setQrFile(new File([b], "promptpay-qr.jpg", { type: b.type || "image/jpeg" }));
      })
      .catch(() => {
        /* stays null — the handler falls back to a plain download */
      });
    return () => { cancelled = true; };
  }, [open, qrFile]);

  const handleSave = () => {
    if (qrFile && navigator.canShare?.({ files: [qrFile] })) {
      // Rejection here is almost always the guest dismissing the sheet, which
      // is a completed interaction — firing a download after it would surprise.
      navigator.share({ files: [qrFile], title: t.gift_save }).catch(() => {});
      return;
    }
    downloadQr(REAL_QR_URL);
  };

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
              padding: "12px 16px",
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

      {/* Tap hint and save button share one fixed-height slot, both absolutely
          positioned, so swapping between them can't shift the closing line. */}
      <div style={{ position: "relative", width: "100%", height: 76, marginTop: 18 }}>
        <motion.p
          animate={open ? { opacity: 0 } : reduceMotion ? { opacity: 0.7 } : { opacity: [0.5, 1, 0.5] }}
          transition={open ? { duration: 0.4 } : reduceMotion ? { duration: 0.3 } : { repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          aria-hidden={open}
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'TT Interphases', sans-serif", fontSize: "0.78rem", fontWeight: 300, color: COLORS.lightBrown, letterSpacing: "0.08em" }}
        >
          {t.gift_tap}
        </motion.p>

        {REAL_QR_URL && (
          <motion.div
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ delay: open ? 0.5 : 0, duration: 0.4 }}
            aria-hidden={!open}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: open ? "auto" : "none" }}
          >
            <motion.button
              type="button"
              onClick={handleSave}
              tabIndex={open ? 0 : -1}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: `linear-gradient(135deg, ${COLORS.gold}, #6B5520)`,
                border: "none", borderRadius: 100, padding: "12px 26px",
                fontFamily: "'TT Interphases', sans-serif", fontSize: "0.72rem",
                letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFF8EE",
                cursor: "pointer", boxShadow: "0 8px 24px rgba(138,112,48,0.3)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 1.5V10.5M8 10.5L4.5 7M8 10.5L11.5 7" stroke="#FFF8EE" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12.5V13.5C2 14.05 2.45 14.5 3 14.5H13C13.55 14.5 14 14.05 14 13.5V12.5" stroke="#FFF8EE" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {t.gift_save}
            </motion.button>
            <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.66rem", fontWeight: 300, color: COLORS.lightBrown, letterSpacing: "0.04em", lineHeight: 1.4, padding: "0 12px" }}>
              {t.gift_save_hint}
            </span>
          </motion.div>
        )}
      </div>
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
