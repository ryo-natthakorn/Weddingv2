import { useEffect, useState, type ReactNode } from "react";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
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
    const target = new Date("2026-11-22T16:09:00").getTime();
    let id: number | undefined;
    // returns false once the moment has arrived, so the interval can stop
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (id !== undefined) { clearInterval(id); id = undefined; }
        return false;
      }
      setTime({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) });
      return true;
    };
    if (tick()) id = window.setInterval(tick, 1000);
    return () => { if (id !== undefined) clearInterval(id); };
  }, []);
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
      {[{ label: "Days", v: time.days }, { label: "Hours", v: time.hours }, { label: "Min", v: time.minutes }, { label: "Sec", v: time.seconds }].map(({ label, v }) => (
        <motion.div key={label} whileHover={{ scale: 1.05, y: -4 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 64 }}>
          {/* Static tile — only the digit animates, so the blur/border/shadow
              never re-render and the tile never collapses between ticks */}
          <div style={{ background: "rgba(255,248,240,0.55)", border: "1px solid rgba(138,112,48,0.25)", borderRadius: 12, padding: "14px 16px", fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.6rem, 5vw, 2.2rem)", fontWeight: 500, color: COLORS.gold, lineHeight: 1, minWidth: 60, textAlign: "center", boxShadow: "0 4px 20px rgba(61,34,21,0.12)", backdropFilter: "blur(8px)" }}>
            <div style={{ height: "1em", overflow: "hidden" }}>
              <motion.span
                key={v}
                initial={{ y: "-100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{ display: "block", lineHeight: 1 }}
              >
                {String(v).padStart(2, "0")}
              </motion.span>
            </div>
          </div>
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
  // clipPath isn't a transform, so MotionConfig's reducedMotion can't tame it —
  // swap the wipe for a plain fade ourselves.
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <div style={{ overflow: "hidden" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }} transition={{ duration: 0.3, delay }}>
          {children}
        </motion.div>
      </div>
    );
  }
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
  const { t, lang } = useLang();
  // Three independent triggers — the section is ~2 phone screens tall, so a
  // single trigger would fire the name/date animations while still off-screen.
  const { ref, inView } = useReveal("-40px");
  const { ref: namesRef, inView: namesInView } = useReveal("-40px");
  const { ref: dateRef, inView: dateInView } = useReveal("-40px");

  // Single-line guard shared by the parent names, titles, and bride/groom
  // names — nowrap keeps each on one line; overflow+ellipsis is a safety net
  // rather than an overlap/clip if a string ever runs wider than its box.
  // lineHeight is generous (not the tight ~1.15 a Latin-only display face could
  // use) because Thai vowels/tone marks stack above and below the consonant
  // line (สระอือ, สระอุ) and some consonants (e.g. ฐ) have descenders — with
  // overflow hidden below, a tight line box would clip them.
  const singleLine = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;
  const nameStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.7rem, 7vw, 3rem)", fontWeight: 600, color: COLORS.navy, letterSpacing: "0.01em", lineHeight: 1.5, ...singleLine } as const;
  // Title (Flt. Lt. / Mr.) now fully matches the name's format — same color,
  // size, and weight — only the tracking stays slightly wider.
  const titleStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: nameStyle.fontSize, fontWeight: 600, color: nameStyle.color, letterSpacing: "0.06em", lineHeight: 1.5, marginBottom: 6, ...singleLine } as const;
  // Stacked full-width (not side-by-side columns) — a two-column split only
  // gives each parent line ~45% of the content width, too narrow for the
  // longer Thai strings at this font size without truncating.
  const parentStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.95rem, 2.4vw, 1.15rem)", color: COLORS.midBrown, letterSpacing: "0.04em", lineHeight: 1.6, textAlign: "center" as const, ...singleLine };

  return (
    <MotionConfig reducedMotion="user">
    <section
      ref={ref}
      style={{
        position: "relative",
        background: "transparent",
        padding: "56px 24px 40px",
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

        {/* 2. Parents — stacked, each on its own full-width line */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.25, duration: 0.8 }}
          style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 56 }}
        >
          <span style={parentStyle}>{t.parents_groom}</span>
          <span style={parentStyle}>{t.parents_bride}</span>
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
        <div ref={namesRef} style={{ marginTop: 40 }}>
          {/* Bride */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={namesInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.8 }}
            style={titleStyle}
          >
            {t.bride_title}
          </motion.p>
          <ClipReveal active={namesInView} duration={1.8}>
            <p style={nameStyle}>{t.bride_name}</p>
          </ClipReveal>

          {/* Ring — large focal point */}
          <motion.img
            src={ringImg}
            alt=""
            aria-hidden
            initial={{ opacity: 0, scale: 0.9 }}
            animate={namesInView ? { opacity: 1, scale: 1 } : {}}
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
            animate={namesInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.35, duration: 0.8 }}
            style={titleStyle}
          >
            {t.groom_title}
          </motion.p>
          <ClipReveal active={namesInView} duration={2.2} delay={0.3}>
            <p style={nameStyle}>{t.groom_name}</p>
          </ClipReveal>
        </div>

        {/* 7-8. Date + venue */}
        <motion.div
          ref={dateRef}
          initial={{ opacity: 0, y: 12 }}
          animate={dateInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15, duration: 0.9 }}
          style={{ marginTop: 52 }}
        >
          <Divider className="mb-6" />
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.4rem, 3.8vw, 1.9rem)", fontWeight: 400, color: COLORS.navy, letterSpacing: "0.12em", marginBottom: 4 }}>
            {t.sunday}
          </p>
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.65rem, 4.4vw, 2.4rem)", fontWeight: 500, color: COLORS.navy, letterSpacing: "0.1em" }}>
            {lang === "TH" ? "22 พฤศจิกายน 2569" : "22 November 2026"}
          </p>
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.78rem, 2vw, 0.92rem)", letterSpacing: "0.14em", color: COLORS.lightBrown, textTransform: "uppercase", marginTop: 12 }}>
            {t.map_title}
          </p>
        </motion.div>
      </div>
    </section>
    </MotionConfig>
  );
}
