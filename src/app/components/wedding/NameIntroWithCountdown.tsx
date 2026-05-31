import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
} from "./shared";
import ringImg from "../../../imports/Ring.svg";

/* ── Countdown ── */
function CountdownTimer() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const target = new Date("2026-11-22T16:09:00");
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTime({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
      {[{ label: "Days", v: time.days }, { label: "Hours", v: time.hours }, { label: "Min", v: time.minutes }, { label: "Sec", v: time.seconds }].map(({ label, v }) => (
        <motion.div key={label} whileHover={{ scale: 1.05, y: -4 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 64 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={v} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }} transition={{ duration: 0.3 }}
              style={{ background: "rgba(255,248,240,0.55)", border: "1px solid rgba(138,112,48,0.25)", borderRadius: 12, padding: "14px 16px", fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.6rem, 5vw, 2.2rem)", fontWeight: 500, color: COLORS.gold, lineHeight: 1, minWidth: 60, textAlign: "center", boxShadow: "0 4px 20px rgba(61,34,21,0.12)", backdropFilter: "blur(8px)" }}
            >
              {String(v).padStart(2, "0")}
            </motion.div>
          </AnimatePresence>
          <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.58rem", letterSpacing: "0.2em", color: COLORS.lightBrown, marginTop: 8, textTransform: "uppercase" }}>{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* Left-to-right "signing" reveal via a clip-path wipe.
   Chosen over SVG stroke-dashoffset because Thai ligatures make stroke
   length unreliable — a clip-rect wipe reveals any script correctly. */
function ClipReveal({
  active,
  duration,
  delay = 0,
  children,
}: {
  active: boolean;
  duration: number;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <div style={{ overflow: "hidden" }}>
      <motion.div
        initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
        animate={active ? { clipPath: "inset(0% 0% 0% 0%)" } : { clipPath: "inset(0% 100% 0% 0%)" }}
        transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function NameIntroWithCountdown() {
  const { t } = useLang();
  const { ref, inView } = useReveal("-40px");

  const titleStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.85rem, 2.2vw, 1.1rem)", fontWeight: 400, color: COLORS.lightBrown, letterSpacing: "0.06em", marginBottom: 6 } as const;
  const nameStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.7rem, 7vw, 3rem)", fontWeight: 600, color: COLORS.navy, letterSpacing: "0.01em", lineHeight: 1.15 } as const;
  const parentStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.74rem, 1.9vw, 0.9rem)", color: COLORS.midBrown, letterSpacing: "0.04em", lineHeight: 1.5, flex: 1, minWidth: 0 } as const;

  return (
    <section
      ref={ref}
      style={{
        position: "relative",
        background: "transparent",
        padding: "110px 24px 100px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", zIndex: 3, maxWidth: 720, margin: "0 auto" }}>
        {/* 1. Countdown — moved to the top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.9 }}
        >
          <CountdownTimer />
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.78rem, 2vw, 0.95rem)", fontStyle: "italic", color: COLORS.lightBrown, letterSpacing: "0.06em", marginTop: 18 }}>
            {t.countdown_caption}
          </p>
        </motion.div>

        {/* 2. Parents — left / right columns */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.25, duration: 0.8 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "clamp(16px, 6vw, 60px)", marginTop: 56 }}
        >
          <span style={{ ...parentStyle, textAlign: "left" }}>{t.parents_groom}</span>
          <span style={{ ...parentStyle, textAlign: "right" }}>{t.parents_bride}</span>
        </motion.div>

        {/* 3. Invite line — centered */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.32, duration: 0.8 }}
          style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.78rem, 1.9vw, 0.9rem)", color: COLORS.lightBrown, letterSpacing: "0.06em", marginTop: 32 }}
        >
          {t.invite_line}
        </motion.p>

        {/* 4-6. Bride · Ring · Groom — names reveal left-to-right (clip-wipe).
            Bride wipes first (1.8s); groom follows after 0.3s (2.2s). Both
            triggered together when the section enters the viewport. */}
        <div style={{ marginTop: 40 }}>
          {/* Bride */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.42, duration: 0.8 }}
            style={titleStyle}
          >
            {t.bride_title}
          </motion.p>
          <ClipReveal active={inView} duration={1.8}>
            <p style={nameStyle}>{t.bride_name}</p>
          </ClipReveal>

          {/* Ring — large focal point */}
          <motion.img
            src={ringImg}
            alt="ring"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "min(120px, 28vw)", height: "auto", objectFit: "contain",
              display: "block", margin: "26px auto",
              filter: "drop-shadow(0 3px 10px rgba(27,74,92,0.2))",
            }}
          />

          {/* Groom */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.42, duration: 0.8 }}
            style={titleStyle}
          >
            {t.groom_title}
          </motion.p>
          <ClipReveal active={inView} duration={2.2} delay={0.3}>
            <p style={nameStyle}>{t.groom_name}</p>
          </ClipReveal>
        </div>

        {/* 7-8. Date + venue */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.62, duration: 0.9 }}
          style={{ marginTop: 52 }}
        >
          <Divider className="mb-6" />
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.1rem, 3vw, 1.5rem)", fontWeight: 400, color: COLORS.navy, letterSpacing: "0.12em", marginBottom: 4 }}>
            {t.sunday}
          </p>
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.3rem, 3.5vw, 1.9rem)", fontWeight: 500, color: COLORS.navy, letterSpacing: "0.1em" }}>
            22 November 2026
          </p>
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.78rem, 2vw, 0.92rem)", letterSpacing: "0.14em", color: COLORS.lightBrown, textTransform: "uppercase", marginTop: 12 }}>
            {t.map_title}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
