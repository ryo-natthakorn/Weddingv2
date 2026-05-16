import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from "motion/react";
import { LangProvider, useLang } from "./wedding/wedding-context";
import { LangToggle } from "./wedding/LangToggle";
import { MusicPlayer } from "./wedding/MusicPlayer";
import { StorySection } from "./wedding/StorySection";
import { MapSection } from "./wedding/MapSection";
import { RSVPSection } from "./wedding/RSVPSection";
import { IntroAnimation } from "./wedding/IntroAnimation";
import { NameIntroSection } from "./wedding/NameIntroSection";
import { HashtagSection } from "./wedding/HashtagSection";
import { useReveal, Divider, BotanicalBorder, LeafSvg, COLORS } from "./wedding/shared";
import heroIllustration from "../../imports/6.png";
import pnLogo from "../../imports/2712.png";
import ringImg from "../../imports/Ring.png";

/* ── Floating golden particles ── */
function Particles() {
  const pts = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 2,
    dur: Math.random() * 6 + 7,
    delay: Math.random() * 5,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 2 }}>
      {pts.map((p) => (
        <motion.div
          key={p.id}
          animate={{ y: [0, -28, 0], opacity: [0, 0.5, 0] }}
          transition={{ repeat: Infinity, duration: p.dur, delay: p.delay, ease: "easeInOut" }}
          style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: "50%", background: "rgba(196,168,64,0.7)" }}
        />
      ))}
    </div>
  );
}

/* ── Countdown ── */
function CountdownTimer() {
  const { t } = useLang();
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
    <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
      {[{ label: "Days", v: time.days }, { label: "Hours", v: time.hours }, { label: "Min", v: time.minutes }, { label: "Sec", v: time.seconds }].map(({ label, v }) => (
        <motion.div key={label} whileHover={{ scale: 1.05, y: -4 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 76 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={v}
              initial={{ y: -14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 14, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ background: "rgba(255,248,240,0.1)", border: "1px solid rgba(196,168,64,0.2)", borderRadius: 12, padding: "16px 20px", fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 5vw, 2.5rem)", fontWeight: 500, color: "#FFF8F0", lineHeight: 1, minWidth: 72, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", backdropFilter: "blur(8px)" }}
            >
              {String(v).padStart(2, "0")}
            </motion.div>
          </AnimatePresence>
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.6rem", letterSpacing: "0.2em", color: "rgba(196,168,64,0.55)", marginTop: 10, textTransform: "uppercase" }}>{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Timeline icon SVGs matching the physical card ── */
function EngagementIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24" stroke={COLORS.navy} strokeWidth="1.2" strokeOpacity="0.2" fill="none"/>
      {/* Two rings interlinked */}
      <circle cx="20" cy="26" r="9" stroke={COLORS.navy} strokeWidth="1.5" fill="none" strokeOpacity="0.7"/>
      <circle cx="32" cy="26" r="9" stroke={COLORS.navy} strokeWidth="1.5" fill="none" strokeOpacity="0.7"/>
      <circle cx="26" cy="26" r="2" fill="#8A7030" fillOpacity="0.7"/>
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24" stroke={COLORS.navy} strokeWidth="1.2" strokeOpacity="0.2" fill="none"/>
      <rect x="12" y="18" width="28" height="20" rx="3" stroke={COLORS.navy} strokeWidth="1.5" strokeOpacity="0.7" fill="none"/>
      <circle cx="26" cy="27" r="6" stroke={COLORS.navy} strokeWidth="1.5" strokeOpacity="0.7" fill="none"/>
      <circle cx="26" cy="27" r="2.5" fill={COLORS.navy} fillOpacity="0.4"/>
      <path d="M20 18V16C20 14.9 20.9 14 22 14H30C31.1 14 32 14.9 32 16V18" stroke={COLORS.navy} strokeWidth="1.5" strokeOpacity="0.7" fill="none"/>
      <circle cx="36" cy="22" r="1.5" fill={COLORS.navy} fillOpacity="0.5"/>
    </svg>
  );
}

function CelebrationIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24" stroke={COLORS.navy} strokeWidth="1.2" strokeOpacity="0.2" fill="none"/>
      {/* Champagne glasses */}
      <path d="M19 14L16 26H22L19 14Z" stroke={COLORS.navy} strokeWidth="1.5" strokeLinejoin="round" strokeOpacity="0.7" fill="none"/>
      <path d="M16 26H22" stroke={COLORS.navy} strokeWidth="1.5" strokeOpacity="0.7"/>
      <line x1="19" y1="26" x2="19" y2="34" stroke={COLORS.navy} strokeWidth="1.5" strokeOpacity="0.7"/>
      <path d="M15 34H23" stroke={COLORS.navy} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7"/>
      <path d="M33 14L30 26H36L33 14Z" stroke={COLORS.navy} strokeWidth="1.5" strokeLinejoin="round" strokeOpacity="0.7" fill="none"/>
      <path d="M30 26H36" stroke={COLORS.navy} strokeWidth="1.5" strokeOpacity="0.7"/>
      <line x1="33" y1="26" x2="33" y2="34" stroke={COLORS.navy} strokeWidth="1.5" strokeOpacity="0.7"/>
      <path d="M29 34H37" stroke={COLORS.navy} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7"/>
      {/* Clink lines */}
      <path d="M22 18L24 16M26 14L28 16M28 18L30 16" stroke="#8A7030" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6"/>
    </svg>
  );
}

/* ── Arch-shaped dress code swatch ── */
function ArchSwatch({ color, label }: { color: string; label: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.08, y: -5 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
    >
      <div style={{
        width: 42, height: 58,
        background: color,
        borderRadius: "50% 50% 0 0 / 40% 40% 0 0",
        border: "1px solid rgba(138,107,75,0.18)",
        boxShadow: "0 3px 12px rgba(61,34,21,0.12)",
      }} />
      <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.55rem", letterSpacing: "0.1em", color: COLORS.lightBrown, textTransform: "uppercase", textAlign: "center", maxWidth: 44 }}>
        {label}
      </span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN INVITATION CONTENT
═══════════════════════════════════════════ */
function InvitationContent() {
  const { t } = useLang();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 700], [0, 140]);
  const springY = useSpring(heroY, { stiffness: 70, damping: 20 });
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.15]);

  const dateSec = useReveal();
  const venueSec = useReveal();
  const programSec = useReveal();
  const countdownSec = useReveal();
  const dressSec = useReveal();
  const footerSec = useReveal();

  const FLORAL_IMAGE = "https://images.unsplash.com/photo-1634562984686-5e559a782117?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwd2hpdGUlMjBmbG9yYWxzJTIwZ3JlZW5lcnklMjB3ZWRkaW5nJTIwdGFibGV8ZW58MXx8fHwxNzc4NDY4NTYxfDA&ixlib=rb-4.1.0&q=80&w=1080";
  const GARDEN_IMAGE = "https://images.unsplash.com/photo-1673163077413-e0cc7bbf21c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwaG9tZSUyMGdhcmRlbiUyMHBhcnR5JTIwY2FuZGxlcyUyMHN0cmluZyUyMGxpZ2h0cyUyMGV2ZW5pbmd8ZW58MXx8fHwxNzc4NDY4NTY2fDA&ixlib=rb-4.1.0&q=80&w=1080";

  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream, fontFamily: "'Jost', sans-serif", color: COLORS.warmBrown }}>

      {/* ═══ HERO — watercolor illustration ═══ */}
      <section
        ref={heroRef}
        style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", overflow: "hidden", background: "linear-gradient(180deg, #EAC898 0%, #EDD8A8 40%, #F3E8CC 75%, #F8F1E6 100%)" }}
      >
        {/* Illustration as full-bleed bg with parallax */}
        <motion.div style={{ position: "absolute", inset: "-5% 0", y: springY, zIndex: 0 }}>
          <img
            src={heroIllustration}
            alt="Pantika & Natthakorn"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
          />
          {/* Subtle fade at very bottom only */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "20%", background: "linear-gradient(to bottom, transparent, #F8F1E6)" }} />
        </motion.div>

        {/* Floating particles */}
        <Particles />

        {/* Floating leaf edges */}
        <div style={{ position: "absolute", top: "15%", left: -20, opacity: 0.35, zIndex: 1, pointerEvents: "none" }}>
          <LeafSvg style={{ transform: "rotate(-20deg) scale(2.2)" }} />
        </div>
        <div style={{ position: "absolute", top: "15%", right: -20, opacity: 0.35, zIndex: 1, pointerEvents: "none" }}>
          <LeafSvg style={{ transform: "rotate(200deg) scale(2.2)" }} />
        </div>

        {/* PN Monogram — floats at top center in the sky area */}
        <motion.div
          style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", zIndex: 3, opacity: heroOpacity }}
          initial={{ opacity: 0, y: -20, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={pnLogo} alt="PN" style={{ width: "min(80px,20vw)", height: "auto", display: "block", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.12))" }} />
        </motion.div>

        {/* Scroll cue at bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
          style={{ position: "relative", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingBottom: 36 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            style={{ width: 26, height: 42, border: "1.5px solid rgba(27,74,92,0.4)", borderRadius: 13, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 7 }}
          >
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              style={{ width: 3.5, height: 7, background: "rgba(27,74,92,0.5)", borderRadius: 2 }}
            />
          </motion.div>
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.58rem", letterSpacing: "0.2em", color: "rgba(27,74,92,0.4)", textTransform: "uppercase" }}>
            {t.scroll}
          </span>
        </motion.div>
      </section>

      {/* ═══ NAME INTRODUCTION ═══ */}
      <NameIntroSection />

      {/* ═══ DATE CARD ═══ */}
      <section ref={dateSec.ref} style={{ padding: "0 24px 80px", maxWidth: 860, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={dateSec.inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            whileHover={{ y: -4, boxShadow: "0 24px 64px rgba(27,74,92,0.14)" }}
            transition={{ duration: 0.3 }}
            style={{
              background: "linear-gradient(135deg, #F2E8D2 0%, #EBDDc4 100%)",
              border: "1px solid rgba(27,74,92,0.1)",
              borderRadius: 24,
              padding: "64px 40px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 8px 40px rgba(27,74,92,0.08)",
            }}
          >
            {/* Gold top stripe */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, transparent, ${COLORS.gold}, transparent)`, opacity: 0.6 }} />

            <div style={{ position: "absolute", top: -20, left: -20, opacity: 0.3 }}>
              <LeafSvg style={{ transform: "rotate(25deg) scale(1.6)" }} />
            </div>
            <div style={{ position: "absolute", bottom: -20, right: -20, opacity: 0.3 }}>
              <LeafSvg style={{ transform: "rotate(205deg) scale(1.6)" }} />
            </div>

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.65rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 16, position: "relative" }}>
              {t.save_the_date}
            </p>

            {/* Ring ornament */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={dateSec.inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}
            >
              <img src={ringImg} alt="" style={{ width: 42, height: 42, objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(27,74,92,0.2))" }} />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, scale: 0.75 }}
              animate={dateSec.inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.8 }}
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(3rem, 9vw, 5.5rem)", fontWeight: 500, color: COLORS.navy, lineHeight: 1, marginBottom: 4, position: "relative" }}
            >22</motion.h2>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.2rem, 3vw, 1.8rem)", color: COLORS.navy, letterSpacing: "0.08em", marginBottom: 4, opacity: 0.85 }}>
              November 2026
            </p>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.7rem", letterSpacing: "0.22em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 40 }}>
              {t.sunday}
            </p>

            {/* Timeline icons — matching physical card */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 0, flexWrap: "wrap", position: "relative" }}>
              {[
                { label: t.ceremony, time: "16:09", Icon: EngagementIcon },
                { label: t.reception, time: "17:00", Icon: CameraIcon },
                { label: t.celebration, time: "17:30", Icon: CelebrationIcon },
              ].map(({ label, time, Icon }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={dateSec.inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.15, duration: 0.7 }}
                  whileHover={{ y: -4 }}
                  style={{ textAlign: "center", flex: "1 1 100px", padding: "0 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, position: "relative" }}
                >
                  <Icon />
                  {/* Dotted connector */}
                  {i < 2 && (
                    <div style={{ position: "absolute", left: "60%", top: 26, width: "80%", height: 1, borderTop: "1.5px dotted rgba(27,74,92,0.25)", pointerEvents: "none" }}>
                      <div style={{ position: "absolute", right: -4, top: -4, width: 7, height: 7, borderTop: "1.5px solid rgba(27,74,92,0.35)", borderRight: "1.5px solid rgba(27,74,92,0.35)", transform: "rotate(45deg)" }} />
                    </div>
                  )}
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.2rem, 3vw, 1.6rem)", fontWeight: 500, color: COLORS.navy, lineHeight: 1 }}>
                    {time}
                  </p>
                  <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.62rem", letterSpacing: "0.15em", color: COLORS.lightBrown, textTransform: "uppercase" }}>
                    {label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ VENUE ═══ */}
      <section ref={venueSec.ref} style={{ padding: "0 24px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={venueSec.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 0, borderRadius: 20, overflow: "hidden", boxShadow: "0 16px 60px rgba(27,74,92,0.1)" }}>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.5 }} style={{ position: "relative", minHeight: 400, overflow: "hidden" }}>
              <img src={FLORAL_IMAGE} alt="Venue" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 400 }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 50%, rgba(242,232,212,0.7) 100%)" }} />
              <div style={{ position: "absolute", top: 20, left: 20, background: COLORS.navy, borderRadius: 100, padding: "7px 16px" }}>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.6rem", letterSpacing: "0.2em", color: COLORS.white, textTransform: "uppercase" }}>{t.venue_label}</span>
              </div>
            </motion.div>
            <div style={{ background: "linear-gradient(135deg, #F2E8D2, #EBDDc4)", padding: "52px 44px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ width: 3, height: 44, background: COLORS.gold, opacity: 0.7, borderRadius: 2, marginBottom: 20 }} />
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 600, color: COLORS.navy, lineHeight: 1.1, marginBottom: 4 }}>{t.venue_name_line1}</h2>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 300, fontStyle: "italic", color: COLORS.navy, lineHeight: 1.1, marginBottom: 24, opacity: 0.75 }}>{t.venue_name_line2}</h2>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.86rem", fontWeight: 300, color: COLORS.midBrown, lineHeight: 1.9, marginBottom: 28 }}>{t.venue_desc}</p>
              <motion.a href="#map" whileHover={{ gap: 14 }} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "'Jost', sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.navy, textDecoration: "none", borderBottom: `1px solid rgba(27,74,92,0.3)`, paddingBottom: 3, width: "fit-content" }}>
                {t.directions}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5H11M11 6.5L7.5 3M11 6.5L7.5 10" stroke={COLORS.navy} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══ STORY GALLERY ═══ */}
      <StorySection />

      {/* ═══ HASHTAG ═══ */}
      <HashtagSection />

      {/* ═══ PROGRAM ═══ */}
      <section ref={programSec.ref} style={{ padding: "96px 24px", background: COLORS.cream, maxWidth: 660, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <BotanicalBorder />
        <div style={{ paddingTop: 20 }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={programSec.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.68rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 12 }}
          >
            {t.program_label}
          </motion.p>
          <Divider className="mb-12" />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {t.program.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
                animate={programSec.inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ x: 4 }}
                style={{ display: "flex", gap: 24, padding: "28px 0", borderBottom: i < t.program.length - 1 ? "1px solid rgba(27,74,92,0.1)" : "none", textAlign: "left" }}
              >
                <div style={{ minWidth: 60, paddingTop: 2 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 500, color: COLORS.gold }}>{item.time}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.navy, opacity: 0.6, flexShrink: 0 }} />
                  {i < t.program.length - 1 && <div style={{ width: 1, flex: 1, background: "rgba(27,74,92,0.15)", marginTop: 8 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 500, color: COLORS.navy, marginBottom: 5 }}>{item.title}</p>
                  <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.82rem", fontWeight: 300, color: COLORS.lightBrown, lineHeight: 1.75 }}>{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COUNTDOWN ═══ */}
      <section ref={countdownSec.ref} style={{ padding: "96px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img src={GARDEN_IMAGE} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(15,48,64,0.88) 0%, rgba(27,74,92,0.72) 100%)" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, border: "1px solid rgba(196,168,64,0.06)", borderRadius: "50%" }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={countdownSec.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          style={{ position: "relative", zIndex: 2, maxWidth: 600, margin: "0 auto" }}
        >
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.65rem", letterSpacing: "0.28em", color: "rgba(196,168,64,0.6)", textTransform: "uppercase", marginBottom: 16 }}>{t.countdown_label}</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 4.5vw, 2.6rem)", fontWeight: 400, fontStyle: "italic", color: "#FFF8F0", marginBottom: 48, lineHeight: 1.3 }}>{t.countdown_subtitle}</h2>
          <CountdownTimer />
        </motion.div>
      </section>

      {/* ═══ MAP ═══ */}
      <div id="map"><MapSection /></div>

      {/* ═══ DRESS CODE — 9 arch swatches ═══ */}
      <section ref={dressSec.ref} style={{ padding: "96px 24px", textAlign: "center", maxWidth: 600, margin: "0 auto", position: "relative" }}>
        <BotanicalBorder />
        <div style={{ paddingTop: 24 }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={dressSec.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9 }}
          >
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.68rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 12 }}>{t.dress_label}</p>
            <Divider className="mb-8" />
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 400, fontStyle: "italic", color: COLORS.navy, marginBottom: 16 }}>{t.dress_title}</h2>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.86rem", fontWeight: 300, color: COLORS.midBrown, lineHeight: 1.9, marginBottom: 44 }}>{t.dress_desc}</p>

            {/* 3×3 arch grid — rows: brown, gold, green */}
            {[
              [
                { color: "#3A2C18", label: "Dark\nBrown" },
                { color: "#7A5C30", label: "Brown" },
                { color: "#B8956A", label: "Tan" },
              ],
              [
                { color: "#6B5020", label: "Mustard" },
                { color: "#A88030", label: "Gold" },
                { color: "#D4BC70", label: "Pale\nGold" },
              ],
              [
                { color: "#2A3C1E", label: "Forest" },
                { color: "#4A6030", label: "Olive" },
                { color: "#7A9060", label: "Sage" },
              ],
            ].map((row, ri) => (
              <div key={ri} style={{ display: "flex", justifyContent: "center", gap: "clamp(12px, 3vw, 28px)", marginBottom: 20 }}>
                {row.map(({ color, label }) => (
                  <ArchSwatch key={color} color={color} label={label.replace("\n", " ")} />
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ RSVP ═══ */}
      <RSVPSection />

      {/* ═══ FOOTER ═══ */}
      <footer
        ref={footerSec.ref}
        style={{ background: "linear-gradient(180deg, #EBDDc4 0%, #E3D2B0 100%)", padding: "80px 24px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}
      >
        <BotanicalBorder />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={footerSec.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          style={{ maxWidth: 520, margin: "60px auto 0" }}
        >
          <Divider className="mb-10" />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1rem, 2.5vw, 1.2rem)", fontStyle: "italic", color: COLORS.midBrown, lineHeight: 1.8, marginBottom: 16 }}>{t.quote}</p>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.65rem", letterSpacing: "0.18em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 44 }}>{t.quote_author}</p>

          {/* PN logo in footer */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <img src={pnLogo} alt="PN" style={{ width: 64, height: "auto" }} />
          </div>

          <div style={{ width: 48, height: 1.5, background: COLORS.gold, opacity: 0.5, borderRadius: 1, margin: "12px auto 16px" }} />

          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 48 }}>
            22 · 11 · 2026
          </p>

          <Divider className="mb-8" />
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.62rem", letterSpacing: "0.14em", color: "#A89078", textTransform: "uppercase" }}>{t.footer_venue}</p>
        </motion.div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROOT EXPORT
═══════════════════════════════════════════ */
export function WeddingInvitation() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <LangProvider>
      <AnimatePresence>
        {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 0.9, delay: 0.2 }}
        style={{ pointerEvents: showIntro ? "none" : "auto" }}
      >
        <LangToggle />
        <MusicPlayer />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      >
        <InvitationContent />
      </motion.div>
    </LangProvider>
  );
}
