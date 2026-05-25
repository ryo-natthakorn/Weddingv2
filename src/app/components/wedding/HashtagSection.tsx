import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  COLORS,
  WatercolorWash,
  PaperTexture,
  WatercolorFlower,
  BotanicalBorder,
  Divider,
} from "./shared";

/* Letter-by-letter typewriter */
function TypewriterText({ text, active, color }: { text: string; active: boolean; color: string }) {
  const [visible, setVisible] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!active) { setVisible(0); return; }
    setVisible(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setVisible(i);
      if (i < text.length) timerRef.current = setTimeout(tick, 60);
    };
    timerRef.current = setTimeout(tick, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, text]);

  return (
    <span>
      {text.split("").map((char, idx) => (
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={idx < visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ color, display: "inline-block" }}
        >
          {char}
        </motion.span>
      ))}
      {visible < text.length && visible > 0 && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          style={{ color, marginLeft: 2 }}
        >
          |
        </motion.span>
      )}
    </span>
  );
}

function InstagramIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke={COLORS.gold} strokeWidth="1.5" strokeOpacity="0.7"/>
      <circle cx="12" cy="12" r="4.5" stroke={COLORS.gold} strokeWidth="1.5" strokeOpacity="0.7"/>
      <circle cx="17.5" cy="6.5" r="1" fill={COLORS.gold} fillOpacity="0.7"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke={COLORS.gold} strokeWidth="1.5" strokeOpacity="0.7"/>
      <path d="M13.5 7H15V4.5H13C11.3 4.5 10 5.8 10 7.5V9H8V12H10V20H13V12H15L15.5 9H13V7.5C13 7.2 13.2 7 13.5 7Z" fill={COLORS.gold} fillOpacity="0.7"/>
    </svg>
  );
}

export function HashtagSection() {
  const { t } = useLang();
  const { ref, inView } = useReveal("-80px");

  return (
    <section
      ref={ref}
      style={{
        padding: "96px 24px",
        background: "linear-gradient(180deg, #F2E8D2 0%, #EBDDc4 50%, #E3D2B0 100%)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Watercolor texture layers — match Hero */}
      <WatercolorWash variant="warm" intensity={0.8} />
      <PaperTexture opacity={0.3} />
      <BotanicalBorder />
      <BotanicalBorder flip />

      {/* Soft watercolor circles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600, height: 600, borderRadius: "50%",
          border: `1px solid rgba(138,112,48,0.08)`,
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 900, height: 900, borderRadius: "50%",
          border: `1px solid rgba(138,112,48,0.05)`,
        }} />
      </div>

      {/* Decorative watercolor flowers */}
      <WatercolorFlower
        size={36}
        style={{ position: "absolute", top: 90, left: 36, opacity: 0.55, zIndex: 1 }}
      />
      <WatercolorFlower
        size={32}
        color="#A8B080"
        centerColor="#7A8A5A"
        style={{ position: "absolute", top: 130, right: 40, opacity: 0.5, zIndex: 1 }}
      />
      <WatercolorFlower
        size={28}
        color="#D4A574"
        style={{ position: "absolute", bottom: 110, left: 50, opacity: 0.5, zIndex: 1 }}
      />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 600, margin: "0 auto" }}>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "0.7rem",
            letterSpacing: "0.28em",
            color: COLORS.lightBrown,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Social
        </motion.p>
        <Divider className="mb-6" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15, duration: 0.8 }}
          style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 32 }}
        >
          <InstagramIcon />
          <FacebookIcon />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 7vw, 4rem)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: COLORS.gold,
            marginBottom: 24,
            lineHeight: 1.1,
            minHeight: "1.2em",
            textShadow: "0 2px 8px rgba(138,112,48,0.15)",
          }}
        >
          <TypewriterText text={t.hashtag} active={inView} color={COLORS.gold} />
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ width: 60, height: 1, background: "rgba(138,112,48,0.45)", margin: "0 auto 20px" }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7, duration: 0.9 }}
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "0.82rem",
            fontWeight: 300,
            letterSpacing: "0.12em",
            color: COLORS.midBrown,
            textTransform: "uppercase",
          }}
        >
          {t.hashtag_sub}
        </motion.p>
      </div>
    </section>
  );
}
