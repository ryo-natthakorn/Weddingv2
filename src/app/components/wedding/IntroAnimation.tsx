import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import ringImg from "../../../imports/Ring.svg";
import pnLogo from "../../../imports/Logo.svg";

interface Props {
  onComplete: () => void;
}

const Petal = memo(function Petal({ x, delay, size, duration }: { x: number; delay: number; size: number; duration: number }) {
  return (
    <motion.div
      animate={{ y: ["0vh", "105vh"], rotate: [0, 280], opacity: [0, 0.5, 0.5, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
      style={{
        position: "absolute", left: `${x}%`, top: "-4%",
        width: size, height: size * 1.5,
        borderRadius: "50% 50% 50% 0",
        background: "rgba(138,112,48,0.28)",
        pointerEvents: "none",
      }}
    />
  );
});

const PETAL_CONFIG = [8, 18, 32, 47, 60, 74, 88].map((x, i) => ({
  x, delay: i * 1.1, size: 5 + (i % 3) * 2, duration: 9 + (i % 4) * 1.3,
}));

const CORNERS = [
  { style: { top: 0, left: 0 }, rotate: "0deg" },
  { style: { top: 0, right: 0 }, rotate: "90deg" },
  { style: { bottom: 0, left: 0 }, rotate: "-90deg" },
  { style: { bottom: 0, right: 0 }, rotate: "180deg" },
] as const;

// Thumb hitbox width — matches the 72px track height. The ring artwork inside is 80px per spec.
const THUMB_W = 72;
const UNLOCK_AT = 88;
const SNAP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function IntroAnimation({ onComplete }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [pos, setPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const triggerUnlock = () => {
    if (unlocked) return;
    setUnlocked(true);
    setIsDragging(false);
    setPos(100);
    setTimeout(() => {
      setLeaving(true);
      setTimeout(onComplete, 900);
    }, 700);
  };

  const movePos = (next: number) => {
    if (unlocked) return;
    const clamped = Math.max(0, Math.min(100, next));
    setPos(clamped);
    if (clamped >= UNLOCK_AT) triggerUnlock();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (unlocked) return;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current || unlocked) return;
    const rect = trackRef.current.getBoundingClientRect();
    const usable = rect.width - THUMB_W;
    const raw = e.clientX - rect.left - THUMB_W / 2;
    movePos((raw / usable) * 100);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (!unlocked && pos < UNLOCK_AT) setPos(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (unlocked) return;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        movePos(pos + 12);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        movePos(pos - 12);
        break;
      case "Home":
        e.preventDefault();
        setPos(0);
        break;
      case "End":
      case "Enter":
      case " ":
        e.preventDefault();
        triggerUnlock();
        break;
    }
  };

  const burstParticles = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      x: 150 + Math.cos(i * 60 * Math.PI / 180) * 80,
      y: 36 + Math.sin(i * 60 * Math.PI / 180) * 60,
    })),
    [],
  );

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: reduceMotion ? 1 : 1.04 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "linear-gradient(175deg, #EAC898 0%, #EDD8A8 30%, #F3E8CC 60%, #F8F1E6 100%)",
            overflow: "hidden", userSelect: "none",
          }}
        >
          {!reduceMotion && PETAL_CONFIG.map((p, i) => <Petal key={i} {...p} />)}

          {/* Soft radial glow centered behind monogram */}
          <div
            style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              width: "min(500px,90vw)", height: "min(500px,90vw)",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(232,192,154,0.22) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {CORNERS.map((corner, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 1 }}
              style={{ position: "absolute", width: 100, height: 100, ...corner.style, pointerEvents: "none" }}
            >
              <svg viewBox="0 0 100 100" fill="none" style={{ width: "100%", height: "100%", transform: `rotate(${corner.rotate})` }}>
                <path d="M5 5 Q20 30 15 55 Q30 40 28 25Z" fill="#7A8A5A" fillOpacity="0.22" />
                <path d="M15 55 Q5 42 10 30 Q22 44 15 55Z" fill="#6B8A5A" fillOpacity="0.18" />
                <path d="M5 5 Q25 8 38 20" stroke="#7A8A5A" strokeWidth="0.8" strokeOpacity="0.3" fill="none" strokeLinecap="round" />
                <circle cx="38" cy="20" r="2" fill="#8A7030" fillOpacity="0.25" />
              </svg>
            </motion.div>
          ))}

          {/* PN Monogram + date — one centered unit, pushed up 60px from center
              (keeping them together prevents the desktop/Windows overlap) */}
          <div
            style={{
              position: "absolute",
              top: "calc(50% - 60px)",
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 5,
              pointerEvents: "none",
              padding: "0 24px",
            }}
          >
            <motion.img
              src={pnLogo}
              alt="PN"
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: "min(200px,50vw)",
                height: "auto",
                display: "block",
              }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.9 }}
              style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.4rem, 4.5vw, 2rem)", letterSpacing: "0.25em", marginRight: "-0.25em", color: "#8A7030", marginTop: 28 }}
            >
              22 · 11 · 26
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.9 }}
              style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.8rem", letterSpacing: "0.2em", marginRight: "-0.2em", color: "rgba(27,74,92,0.72)", textTransform: "uppercase", marginTop: 8 }}
            >
              SailomSangdad · Bangkok
            </motion.p>
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { scaleX: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { scaleX: 1 }}
              transition={{ delay: 1.3, duration: 0.8 }}
              style={{ display: "block", width: 80, height: 1, background: "rgba(138,112,48,0.35)", margin: "20px auto 0" }}
            />
          </div>

          {/* Bottom area — hint + slider. The hint is always mounted (fading in place)
              so its arrival never shifts the slider down. */}
          <div
            style={{
              position: "absolute",
              bottom: "8vh",
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
              padding: "0 32px",
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={showHint ? { opacity: 1, y: 0 } : { opacity: 0, y: reduceMotion ? 0 : 8 }}
              transition={{ duration: 0.7 }}
              aria-hidden={!showHint}
              style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)", fontStyle: "italic", color: "rgba(27,74,92,0.78)", letterSpacing: "0.05em" }}
            >
              Slide to open
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              style={{ width: "min(300px,80vw)", position: "relative" }}
            >
              <div
                ref={trackRef}
                style={{
                  position: "relative", height: 72,
                  background: "rgba(255,255,255,0.55)", borderRadius: 100,
                  border: "1px solid rgba(138,112,48,0.25)", backdropFilter: "blur(8px)",
                  boxShadow: "inset 0 2px 8px rgba(27,74,92,0.08)",
                }}
              >
                <motion.div
                  style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${pos}%`,
                    background: "linear-gradient(to right, rgba(138,112,48,0.12), rgba(138,112,48,0.06))",
                    borderRadius: 100,
                    transition: isDragging ? undefined : `width 0.45s ${SNAP_EASE}`,
                  }}
                />

                <div style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 3, opacity: Math.max(0, 1 - pos / 50) }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={reduceMotion ? { opacity: 0.6 } : { opacity: [0.3, 0.8, 0.3] }}
                      transition={reduceMotion ? { duration: 0 } : { repeat: Infinity, duration: 1.2, delay: i * 0.18 }}
                    >
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                        <path d="M2 2L8 7L2 12" stroke="#8A7030" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  role="slider"
                  aria-label="Slide to open the invitation"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pos)}
                  tabIndex={unlocked ? -1 : 0}
                  onKeyDown={handleKeyDown}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  animate={unlocked ? { y: reduceMotion ? 0 : -80, opacity: 0, scale: reduceMotion ? 1 : 0.7 } : { y: 0, opacity: 1, scale: 1 }}
                  transition={unlocked ? { duration: 0.6, ease: [0.22, 1, 0.36, 1] } : undefined}
                  style={{
                    position: "absolute",
                    left: `calc(${pos / 100} * (100% - ${THUMB_W}px))`,
                    top: 0, bottom: 0, width: THUMB_W, height: 72,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: isDragging ? "grabbing" : "grab", touchAction: "none", zIndex: 2,
                    transition: isDragging ? undefined : `left 0.45s ${SNAP_EASE}`,
                  }}
                >
                  {!unlocked && !reduceMotion && (
                    <motion.div
                      animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                      style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1.5px solid rgba(138,112,48,0.5)" }}
                    />
                  )}
                  <img
                    src={ringImg}
                    alt=""
                    draggable={false}
                    style={{
                      width: 80, height: 80, objectFit: "contain",
                      filter: "drop-shadow(0 4px 12px rgba(27,74,92,0.25))",
                      pointerEvents: "none",
                    }}
                  />
                </motion.div>
              </div>

              <AnimatePresence>
                {unlocked && !reduceMotion && (
                  <>
                    {burstParticles.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 1, scale: 0, x: 150, y: 36 }}
                        animate={{ opacity: 0, scale: 1.5, x: p.x, y: p.y }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        style={{ position: "absolute", top: 0, left: 0, width: 8, height: 8, borderRadius: "50%", background: "#8A7030", pointerEvents: "none" }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
