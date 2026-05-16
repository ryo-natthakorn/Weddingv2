import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useLang } from "./wedding-context";
import { useReveal } from "./shared";

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
      {/* Blinking cursor */}
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

/* Instagram icon SVG */
function InstagramIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="rgba(255,248,240,0.7)" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="4.5" stroke="rgba(255,248,240,0.7)" strokeWidth="1.5"/>
      <circle cx="17.5" cy="6.5" r="1" fill="rgba(255,248,240,0.7)"/>
    </svg>
  );
}

/* Facebook icon SVG */
function FacebookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="rgba(255,248,240,0.7)" strokeWidth="1.5"/>
      <path d="M13.5 7H15V4.5H13C11.3 4.5 10 5.8 10 7.5V9H8V12H10V20H13V12H15L15.5 9H13V7.5C13 7.2 13.2 7 13.5 7Z" fill="rgba(255,248,240,0.7)"/>
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
        background: "#1B4A5C",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Watercolor texture rings */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", border: "1px solid rgba(255,248,240,0.04)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 900, height: 900, borderRadius: "50%", border: "1px solid rgba(255,248,240,0.02)" }} />
        {/* Soft leaf silhouettes */}
        <motion.div
          animate={{ rotate: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          style={{ position: "absolute", top: -30, left: -20, opacity: 0.06, pointerEvents: "none" }}
        >
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <path d="M100 10 C60 50, 10 80, 20 140 C60 160, 90 120, 100 80 C110 120, 140 160, 180 140 C190 80, 140 50, 100 10Z" fill="white"/>
          </svg>
        </motion.div>
        <motion.div
          animate={{ rotate: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
          style={{ position: "absolute", bottom: -30, right: -20, opacity: 0.06, pointerEvents: "none" }}
        >
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <path d="M100 10 C60 50, 10 80, 20 140 C60 160, 90 120, 100 80 C110 120, 140 160, 180 140 C190 80, 140 50, 100 10Z" fill="white"/>
          </svg>
        </motion.div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto" }}>
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.65rem", letterSpacing: "0.28em", color: "rgba(255,248,240,0.45)", textTransform: "uppercase", marginBottom: 24 }}
        >
          Social
        </motion.p>

        {/* Social icons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15, duration: 0.8 }}
          style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 32 }}
        >
          <InstagramIcon />
          <FacebookIcon />
        </motion.div>

        {/* Hashtag — typewriter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 7vw, 4rem)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "#C4A840",
            marginBottom: 24,
            lineHeight: 1.1,
            minHeight: "1.2em",
          }}
        >
          <TypewriterText text={t.hashtag} active={inView} color="#C4A840" />
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ width: 60, height: 1, background: "rgba(196,168,64,0.4)", margin: "0 auto 20px" }}
        />

        {/* Sub text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7, duration: 0.9 }}
          style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.82rem", fontWeight: 300, letterSpacing: "0.12em", color: "rgba(255,248,240,0.55)", textTransform: "uppercase" }}
        >
          {t.hashtag_sub}
        </motion.p>
      </div>
    </section>
  );
}
