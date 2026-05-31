import { useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from "motion/react";
import { LangProvider, useLang } from "./wedding/wedding-context";
import { LangToggle } from "./wedding/LangToggle";
import { MusicPlayer } from "./wedding/MusicPlayer";
import { GallerySection } from "./wedding/GallerySection";
import { RSVPSection } from "./wedding/RSVPSection";
import { GiftSection } from "./wedding/GiftSection";
import { IntroAnimation } from "./wedding/IntroAnimation";
import { NameIntroWithCountdown } from "./wedding/NameIntroWithCountdown";
import { HashtagSection } from "./wedding/HashtagSection";
import {
  useReveal,
  Divider,
  LeafSvg,
  COLORS,
} from "./wedding/shared";
import heroIllustration from "../../imports/Hero.jpg";
import pnLogo from "../../imports/Logo.svg";

const MAPS_LINK = "https://maps.google.com/?q=SailomSangdad+Homey+Studio+Bangkok";

const DIRECTIONS = [
  { icon: "🚗", label: "By Car", detail: "25 min from Siam, free parking available on site." },
  { icon: "🚇", label: "By BTS/MRT", detail: "Nearest station: Take BTS to On Nut, then 10 min by taxi." },
  { icon: "🛺", label: "By Grab", detail: "Search 'SailomSangdad Homey Studio' in the Grab app." },
];

/* Program icons — client drops ring-icon / camera-icon / glasses-icon into
   src/imports/. import.meta.glob resolves only files that actually exist at
   build time, so a missing icon simply falls back to its emoji (no build
   error). Rebuild after adding the files and they appear automatically. */
const ICON_MODULES = import.meta.glob(
  "../../imports/{ring,camera,glasses}-icon.{png,svg}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const PROGRAM_ICONS = [
  { base: "ring", emoji: "💍" },
  { base: "camera", emoji: "📷" },
  { base: "glasses", emoji: "🥂" },
].map(({ base, emoji }) => ({
  emoji,
  src: Object.entries(ICON_MODULES).find(([k]) => k.includes(`/${base}-icon.`))?.[1],
}));

/* Program card icon — loads the PNG/SVG if present, otherwise (or on load
   error) shows a gold circle with the matching emoji placeholder. */
function ProgramIcon({ src, emoji }: { src?: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        onError={() => setFailed(true)}
        style={{ width: 46, height: 46, objectFit: "contain", display: "block" }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: 46, height: 46, borderRadius: "50%",
        background: "linear-gradient(135deg, rgba(138,112,48,0.18), rgba(138,112,48,0.08))",
        border: "1px solid rgba(138,112,48,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.4rem",
      }}
    >
      {emoji}
    </div>
  );
}

/* ── Floating golden particles ── */
function Particles() {
  const pts = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 2, dur: Math.random() * 6 + 7, delay: Math.random() * 5,
    })),
    [],
  );
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

function ArchSwatch({ color, label }: { color: string; label: string }) {
  return (
    <motion.div whileHover={{ scale: 1.08, y: -5 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 42, height: 58, background: color, borderRadius: "50% 50% 0 0 / 40% 40% 0 0", border: "1px solid rgba(138,107,75,0.18)", boxShadow: "0 3px 12px rgba(61,34,21,0.12)" }} />
      <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.55rem", letterSpacing: "0.1em", color: COLORS.lightBrown, textTransform: "uppercase", textAlign: "center", maxWidth: 44 }}>{label}</span>
    </motion.div>
  );
}

/* ════════════════════════════════════════
   MAIN INVITATION CONTENT
════════════════════════════════════════ */
function InvitationContent() {
  const { t } = useLang();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 700], [0, 140]);
  const springY = useSpring(heroY, { stiffness: 70, damping: 20 });
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.15]);

  const venueSec = useReveal();
  const programSec = useReveal();
  const dressSec = useReveal();
  const footerSec = useReveal();

  const FLORAL_IMAGE = "https://images.unsplash.com/photo-1634562984686-5e559a782117?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwd2hpdGUlMjBmbG9yYWxzJTIwZ3JlZW5lcnklMjB3ZWRkaW5nJTIwdGFibGV8ZW58MXx8fHwxNzc4NDY4NTYxfDA&ixlib=rb-4.1.0&q=80&w=1080";

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'TT Interphases', sans-serif", color: COLORS.warmBrown }}>

      {/* ═══ HERO ═══ */}
      <section
        ref={heroRef}
        style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", overflow: "hidden", background: "linear-gradient(180deg, #EAC898 0%, #EDD8A8 40%, #F3E8CC 75%, #F8F1E6 100%)" }}
      >
        <motion.div style={{ position: "absolute", inset: "-5% 0", y: springY, zIndex: 0 }}>
          <img src={heroIllustration} alt="Pantika & Natthakorn" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "bottom center", display: "block" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "20%", background: "linear-gradient(to bottom, transparent, #F8F1E6)" }} />
        </motion.div>

        <Particles />

        <div style={{ position: "absolute", top: "15%", left: -20, opacity: 0.35, zIndex: 1, pointerEvents: "none" }}>
          <LeafSvg style={{ transform: "rotate(-20deg) scale(2.2)" }} />
        </div>
        <div style={{ position: "absolute", top: "15%", right: -20, opacity: 0.35, zIndex: 1, pointerEvents: "none" }}>
          <LeafSvg style={{ transform: "rotate(200deg) scale(2.2)" }} />
        </div>

        {/* PN Monogram + date — centered in the hero viewport */}
        <motion.div
          style={{ position: "absolute", top: "calc(50% - 90px)", left: "50%", transform: "translate(-50%, -50%)", zIndex: 3, opacity: heroOpacity, textAlign: "center", width: "100%", pointerEvents: "none" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={pnLogo}
              alt="PN"
              style={{ width: "min(200px,50vw)", height: "auto", display: "block", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.12))", margin: "0 auto" }}
            />
            <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.4rem, 4vw, 2rem)", letterSpacing: "0.38em", color: "#8A7030", marginTop: 14, fontWeight: 500 }}>
              22 · 11 · 26
            </p>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 1 }}
          style={{ position: "relative", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingBottom: 36 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            style={{ width: 26, height: 42, border: "1.5px solid rgba(27,74,92,0.4)", borderRadius: 13, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 7 }}
          >
            <motion.div animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} style={{ width: 3.5, height: 7, background: "rgba(27,74,92,0.5)", borderRadius: 2 }} />
          </motion.div>
          <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.58rem", letterSpacing: "0.2em", color: "rgba(27,74,92,0.4)", textTransform: "uppercase" }}>{t.scroll}</span>
        </motion.div>
      </section>

      {/* ═══ NAME INTRODUCTION ═══ */}
      <NameIntroWithCountdown />

      {/* ═══ GALLERY ═══ */}
      <GallerySection />

      {/* ═══ VENUE ═══ */}
      <section ref={venueSec.ref} style={{ padding: "40px 24px 80px", maxWidth: 760, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={venueSec.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1 }}>

          {/* BLOCK 1 — Full-width venue photo with name overlay */}
          <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: "0 16px 50px rgba(27,74,92,0.12)" }}>
            <img src={FLORAL_IMAGE} alt="Venue" style={{ width: "100%", height: "clamp(280px, 58vw, 440px)", objectFit: "cover", display: "block" }} />
            {/* dark gradient for legibility */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(42,26,10,0.7) 0%, rgba(42,26,10,0.15) 35%, transparent 60%)" }} />
            {/* gold pill — top-left */}
            <div style={{ position: "absolute", top: 16, left: 16, background: `linear-gradient(135deg, ${COLORS.gold}, #6B5520)`, borderRadius: 100, padding: "7px 16px", boxShadow: "0 4px 12px rgba(138,112,48,0.35)" }}>
              <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.6rem", letterSpacing: "0.2em", color: COLORS.white, textTransform: "uppercase" }}>{t.venue_label}</span>
            </div>
            {/* venue name — bottom-left */}
            <div style={{ position: "absolute", bottom: 18, left: 20, right: 20 }}>
              <h2 style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.5rem, 6vw, 2.4rem)", fontWeight: 600, color: "#FFF8EE", lineHeight: 1.15, textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>{t.map_title}</h2>
            </div>
          </div>

          {/* BLOCK 2 — Address + CTA */}
          <div style={{ marginTop: 20, background: "rgba(255,248,240,0.55)", border: "1px solid rgba(138,107,75,0.18)", borderRadius: 20, padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
            <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.95rem, 2.6vw, 1.1rem)", fontWeight: 400, color: COLORS.navy, letterSpacing: "0.04em" }}>{t.map_address}</p>
            <motion.a
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 10, background: `linear-gradient(135deg, ${COLORS.gold}, #6B5520)`, border: "none", borderRadius: 100, padding: "14px 32px", fontFamily: "'TT Interphases', sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#FFF8EE", textDecoration: "none", boxShadow: "0 8px 24px rgba(138,112,48,0.3)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5C8 14.5 12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z" stroke="#FFF8EE" strokeWidth="1.2"/>
                <circle cx="8" cy="6" r="1.5" stroke="#FFF8EE" strokeWidth="1.2"/>
              </svg>
              {t.map_btn}
            </motion.a>
          </div>

          {/* BLOCK 3 — Directions */}
          <div style={{ marginTop: 20, background: "rgba(255,248,240,0.55)", border: "1px solid rgba(138,107,75,0.18)", borderRadius: 20, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24, textAlign: "left" }}>
            {DIRECTIONS.map(({ icon, label, detail }) => (
              <div key={label} style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, background: `linear-gradient(135deg, rgba(138,112,48,0.18), rgba(138,112,48,0.08))`, border: "1px solid rgba(138,112,48,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.72rem", letterSpacing: "0.16em", color: COLORS.gold, textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.85rem", fontWeight: 300, color: COLORS.midBrown, lineHeight: 1.7 }}>{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══ PROGRAM ═══ */}
      <section ref={programSec.ref} style={{ padding: "96px 24px", maxWidth: 920, margin: "0 auto", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ paddingTop: 20, position: "relative", zIndex: 2 }}>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={programSec.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }} style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.68rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 12 }}>{t.program_label}</motion.p>
          <Divider className="mb-12" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {t.program.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, y: 28 }} animate={programSec.inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 + i * 0.15, duration: 0.8 }}
                whileHover={{ y: -6 }}
                style={{ background: "rgba(255,248,240,0.6)", border: "1px solid rgba(138,107,75,0.15)", borderTop: `3px solid ${COLORS.gold}`, borderRadius: 16, padding: "36px 24px", boxShadow: "0 10px 30px rgba(61,34,21,0.1)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
              >
                <ProgramIcon src={PROGRAM_ICONS[i]?.src} emoji={PROGRAM_ICONS[i]?.emoji ?? "•"} />
                <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.9rem, 5vw, 2.4rem)", fontWeight: 500, color: COLORS.gold, letterSpacing: "0.04em", lineHeight: 1 }}>{item.time}</span>
                <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "1.05rem", fontWeight: 600, color: COLORS.navy, lineHeight: 1.3 }}>{item.title}</p>
                <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.82rem", fontWeight: 300, color: COLORS.lightBrown, lineHeight: 1.65 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DRESS CODE ═══ */}
      <section ref={dressSec.ref} style={{ padding: "96px 24px", textAlign: "center", maxWidth: 600, margin: "0 auto", position: "relative", overflow: "hidden" }}>
        <div style={{ paddingTop: 24, position: "relative", zIndex: 2 }}>
          <motion.div initial={{ opacity: 0, y: 28 }} animate={dressSec.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9 }}>
            <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.68rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 12 }}>{t.dress_label}</p>
            <Divider className="mb-8" />
            <h2 style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 400, fontStyle: "italic", color: COLORS.navy, marginBottom: 16 }}>{t.dress_title}</h2>
            <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.86rem", fontWeight: 300, color: COLORS.midBrown, lineHeight: 1.9, marginBottom: 44 }}>{t.dress_desc}</p>
            {[
              [{ color: "#3A2C18", label: "Dark Brown" }, { color: "#7A5C30", label: "Brown" }, { color: "#B8956A", label: "Tan" }],
              [{ color: "#6B5020", label: "Mustard" }, { color: "#A88030", label: "Gold" }, { color: "#D4BC70", label: "Pale Gold" }],
              [{ color: "#2A3C1E", label: "Forest" }, { color: "#4A6030", label: "Olive" }, { color: "#7A9060", label: "Sage" }],
            ].map((row, ri) => (
              <div key={ri} style={{ display: "flex", justifyContent: "center", gap: "clamp(12px, 3vw, 28px)", marginBottom: 20 }}>
                {row.map(({ color, label }) => <ArchSwatch key={color} color={color} label={label} />)}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ HASHTAG — directly under dress code, before RSVP ═══ */}
      <HashtagSection />

      <RSVPSection />

      {/* ═══ GIFT / ใส่ซอง ═══ */}
      <GiftSection />

      {/* ═══ FOOTER ═══ */}
      <footer ref={footerSec.ref} style={{ background: "transparent", padding: "0 24px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={footerSec.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1 }} style={{ maxWidth: 520, margin: "0 auto", position: "relative", zIndex: 3 }}>
          <Divider className="mb-10" />
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1rem, 2.5vw, 1.2rem)", fontStyle: "italic", color: COLORS.midBrown, lineHeight: 1.8, marginBottom: 16 }}>{t.quote}</p>
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.65rem", letterSpacing: "0.18em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 44 }}>{t.quote_author}</p>

          {/* PN Logo in footer — SVG โปร่งใส */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <img src={pnLogo} alt="PN" style={{ width: 64, height: "auto" }} />
          </div>

          <div style={{ width: 48, height: 1.5, background: COLORS.gold, opacity: 0.5, borderRadius: 1, margin: "12px auto 16px" }} />
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 48 }}>22 · 11 · 2026</p>
          <Divider className="mb-8" />
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.62rem", letterSpacing: "0.14em", color: "#A89078", textTransform: "uppercase", marginBottom: 18 }}>{t.footer_venue}</p>
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.95rem, 2.4vw, 1.1rem)", fontStyle: "italic", color: COLORS.midBrown, letterSpacing: "0.04em" }}>{t.footer_closing}</p>
        </motion.div>
      </footer>
    </div>
  );
}

export function WeddingInvitation() {
  const [showIntro, setShowIntro] = useState(true);
  return (
    <LangProvider>
      <AnimatePresence>
        {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: showIntro ? 0 : 1 }} transition={{ duration: 0.9, delay: 0.2 }}
        style={{ pointerEvents: showIntro ? "none" : "auto" }}
      >
        <LangToggle />
        <MusicPlayer />
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: showIntro ? 0 : 1 }} transition={{ duration: 1.2, delay: 0.3 }}>
        <InvitationContent />
      </motion.div>
    </LangProvider>
  );
}
