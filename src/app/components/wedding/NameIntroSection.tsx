import { motion } from "motion/react";
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
import pnLogo from "../../../imports/Logo.svg";

export function NameIntroSection() {
  const { t } = useLang();
  const { ref, inView } = useReveal("-40px");

  return (
    <section
      ref={ref}
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #F8F1E6 0%, #F2E8D2 50%, #EEE2C8 100%)",
        padding: "110px 24px 100px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Watercolor texture layers */}
      <WatercolorWash variant="warm" intensity={0.9} />
      <PaperTexture opacity={0.35} />

      {/* Botanical borders */}
      <BotanicalBorder />
      <BotanicalBorder flip />

      {/* Decorative flowers */}
      <WatercolorFlower size={38} style={{ position: "absolute", top: 90, left: 28, opacity: 0.55, zIndex: 2 }} />
      <WatercolorFlower size={32} color="#A8B080" centerColor="#7A8A5A" style={{ position: "absolute", top: 130, right: 36, opacity: 0.5, zIndex: 2 }} />
      <WatercolorFlower size={28} color="#D4A574" style={{ position: "absolute", bottom: 110, left: 50, opacity: 0.5, zIndex: 2 }} />

      <div style={{ position: "relative", zIndex: 3 }}>
        {/* PN Logo — SVG โปร่งใสอยู่แล้ว ไม่ต้อง mix-blend */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}
        >
          <img
            src={pnLogo}
            alt="PN"
            style={{ width: "min(90px,22vw)", height: "auto" }}
          />
        </motion.div>

        {/* Parents line */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15, duration: 0.8 }}
          style={{ display: "flex", justifyContent: "center", gap: "clamp(12px, 4vw, 48px)", flexWrap: "wrap", marginBottom: 8 }}
        >
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "clamp(0.72rem, 1.8vw, 0.85rem)", color: COLORS.midBrown, letterSpacing: "0.04em" }}>
            {t.parents_groom}
          </span>
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "clamp(0.72rem, 1.8vw, 0.85rem)", color: COLORS.midBrown, opacity: 0.5 }}>|</span>
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "clamp(0.72rem, 1.8vw, 0.85rem)", color: COLORS.midBrown, letterSpacing: "0.04em" }}>
            {t.parents_bride}
          </span>
        </motion.div>

        {/* Invite line */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.25, duration: 0.8 }}
          style={{ fontFamily: "'Jost', sans-serif", fontSize: "clamp(0.75rem, 1.8vw, 0.88rem)", color: COLORS.lightBrown, letterSpacing: "0.06em", marginBottom: 32 }}
        >
          {t.invite_line}
        </motion.p>

        {/* Bride name */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.38, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 4 }}
        >
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1rem, 2.5vw, 1.3rem)", fontWeight: 400, color: COLORS.navy, letterSpacing: "0.04em" }}>
            {t.bride_title}{" "}
          </span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.6rem, 4.5vw, 2.8rem)", fontWeight: 600, color: COLORS.navy, letterSpacing: "0.02em" }}>
            {t.bride_name}
          </span>
        </motion.div>

        {/* Ring divider — SVG โปร่งใสอยู่แล้ว */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.52, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", margin: "18px 0" }}
        >
          <div style={{ flex: 1, maxWidth: 80, height: 1, background: "rgba(138,112,48,0.3)" }} />
          <img
            src={ringImg}
            alt="ring"
            style={{
              width: 44, height: 44, objectFit: "contain",
              filter: "drop-shadow(0 2px 6px rgba(27,74,92,0.18))",
            }}
          />
          <div style={{ flex: 1, maxWidth: 80, height: 1, background: "rgba(138,112,48,0.3)" }} />
        </motion.div>

        {/* Groom name */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.65, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 40 }}
        >
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1rem, 2.5vw, 1.3rem)", fontWeight: 400, color: COLORS.navy, letterSpacing: "0.04em" }}>
            {t.groom_title}{" "}
          </span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.6rem, 4.5vw, 2.8rem)", fontWeight: 600, color: COLORS.navy, letterSpacing: "0.02em" }}>
            {t.groom_name}
          </span>
        </motion.div>

        {/* Date */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.78, duration: 0.9 }}
        >
          <Divider className="mb-6" />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.1rem, 3vw, 1.5rem)", fontWeight: 400, color: COLORS.navy, letterSpacing: "0.12em", marginBottom: 4 }}>
            {t.sunday}
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.3rem, 3.5vw, 1.9rem)", fontWeight: 500, color: COLORS.navy, letterSpacing: "0.1em" }}>
            22 November 2026
          </p>
        </motion.div>
      </div>
    </section>
  );
}
