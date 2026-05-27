import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  BotanicalBorder,
  COLORS,
  WatercolorWash,
  PaperTexture,
  WatercolorFlower,
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
              style={{ background: "rgba(255,248,240,0.55)", border: "1px solid rgba(138,112,48,0.25)", borderRadius: 12, padding: "14px 16px", fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.6rem, 5vw, 2.2rem)", fontWeight: 500, color: COLORS.navy, lineHeight: 1, minWidth: 60, textAlign: "center", boxShadow: "0 4px 20px rgba(61,34,21,0.12)", backdropFilter: "blur(8px)" }}
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

export function NameIntroWithCountdown() {
  const { t } = useLang();
  const { ref, inView } = useReveal("-40px");

  const titleStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)", fontWeight: 400, color: COLORS.navy, letterSpacing: "0.04em", marginBottom: 6 } as const;
  const nameStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.2rem, 4.5vw, 2.4rem)", fontWeight: 600, color: COLORS.navy, letterSpacing: "0.02em", lineHeight: 1.2 } as const;

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
      {/* Watercolor texture layers */}
      <WatercolorWash variant="warm" intensity={0.9} />
      <PaperTexture opacity={0.35} />
      <BotanicalBorder />
      <BotanicalBorder flip />

      {/* Decorative flowers */}
      <WatercolorFlower size={38} style={{ position: "absolute", top: 90, left: 28, opacity: 0.55, zIndex: 2 }} />
      <WatercolorFlower size={32} color="#A8B080" centerColor="#7A8A5A" style={{ position: "absolute", top: 130, right: 36, opacity: 0.5, zIndex: 2 }} />
      <WatercolorFlower size={28} color="#D4A574" style={{ position: "absolute", bottom: 110, left: 50, opacity: 0.5, zIndex: 2 }} />

      <div style={{ position: "relative", zIndex: 3, maxWidth: 720, margin: "0 auto" }}>
        {/* Parents line */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15, duration: 0.8 }}
          style={{ display: "flex", justifyContent: "center", gap: "clamp(12px, 4vw, 48px)", flexWrap: "wrap", marginBottom: 8 }}
        >
          <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.72rem, 1.8vw, 0.85rem)", color: COLORS.midBrown, letterSpacing: "0.04em" }}>
            {t.parents_groom}
          </span>
          <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.72rem, 1.8vw, 0.85rem)", color: COLORS.midBrown, opacity: 0.5 }}>|</span>
          <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.72rem, 1.8vw, 0.85rem)", color: COLORS.midBrown, letterSpacing: "0.04em" }}>
            {t.parents_bride}
          </span>
        </motion.div>

        {/* Invite line */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.25, duration: 0.8 }}
          style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.75rem, 1.8vw, 0.88rem)", color: COLORS.lightBrown, letterSpacing: "0.06em", marginBottom: 40 }}
        >
          {t.invite_line}
        </motion.p>

        {/* Three-column name row: Bride | Ring | Groom */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.38, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(8px, 3vw, 24px)" }}
        >
          {/* Bride */}
          <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <p style={titleStyle}>{t.bride_title}</p>
            <p style={nameStyle}>{t.bride_name}</p>
          </div>

          {/* Ring */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={ringImg}
              alt="ring"
              style={{
                width: "clamp(40px, 12vw, 56px)", height: "auto", objectFit: "contain",
                filter: "drop-shadow(0 2px 6px rgba(27,74,92,0.18))",
              }}
            />
          </div>

          {/* Groom */}
          <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <p style={titleStyle}>{t.groom_title}</p>
            <p style={nameStyle}>{t.groom_name}</p>
          </div>
        </motion.div>

        {/* Countdown directly below the name row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.9 }}
          style={{ marginTop: 48 }}
        >
          <CountdownTimer />
        </motion.div>

        {/* Date */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.78, duration: 0.9 }}
          style={{ marginTop: 48 }}
        >
          <Divider className="mb-6" />
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.1rem, 3vw, 1.5rem)", fontWeight: 400, color: COLORS.navy, letterSpacing: "0.12em", marginBottom: 4 }}>
            {t.sunday}
          </p>
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.3rem, 3.5vw, 1.9rem)", fontWeight: 500, color: COLORS.navy, letterSpacing: "0.1em" }}>
            22 November 2026
          </p>
        </motion.div>
      </div>
    </section>
  );
}
