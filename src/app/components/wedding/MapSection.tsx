import { motion } from "motion/react";
import { useLang } from "./wedding-context";
import { useReveal, Divider, COLORS } from "./shared";

const MAP_VENUE_IMAGE = "https://images.unsplash.com/photo-1758612120966-b20c01160c7b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYXJkZW4lMjB2ZW51ZSUyMG91dGRvb3IlMjB3ZWRkaW5nJTIwdmVudWUlMjBtYXAlMjBhZXJpYWx8ZW58MXx8fHwxNzc4NDY5MjE1fDA&ixlib=rb-4.1.0&q=80&w=1080";

// Replace with the actual Google Maps embed URL for SailomSangdad Homey Studio
const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3875.0!2d100.5231!3d13.7399!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTPCsDQ0JzIzLjYiTiAxMDDCsDMxJzIzLjIiRQ!5e0!3m2!1sen!2sth!4v1234567890";

const DIRECTIONS = [
  { icon: "🚗", label: "By Car", detail: "25 min from Siam, free parking available on site." },
  { icon: "🚇", label: "By BTS/MRT", detail: "Nearest station: Take BTS to On Nut, then 10 min by taxi." },
  { icon: "🛺", label: "By Grab", detail: "Search 'SailomSangdad Homey Studio' in the Grab app." },
];

export function MapSection() {
  const { t } = useLang();
  const { ref, inView } = useReveal();

  const googleMapsUrl = "https://maps.google.com/?q=SailomSangdad+Homey+Studio+Bangkok";

  return (
    <section
      ref={ref}
      style={{
        padding: "96px 24px",
        background: COLORS.navy,
        color: COLORS.white,
        textAlign: "center",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ maxWidth: 600, margin: "0 auto 56px" }}
      >
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.7rem", letterSpacing: "0.28em", color: "rgba(255,248,238,0.55)", textTransform: "uppercase", marginBottom: 14 }}>
          {t.map_label}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 0C7 0 7.6 3.5 10.5 3.5C7.6 3.5 7 7 7 7C7 7 6.4 3.5 3.5 3.5C6.4 3.5 7 0 7 0Z" fill="rgba(255,248,238,0.3)"/>
            <path d="M7 7C7 7 7.6 10.5 10.5 10.5C7.6 10.5 7 14 7 14C7 14 6.4 10.5 3.5 10.5C6.4 10.5 7 7 7 7Z" fill="rgba(255,248,238,0.3)"/>
          </svg>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 500, color: "#FFF8EE", marginBottom: 8, lineHeight: 1.2 }}>
          {t.map_title}
        </h2>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.82rem", color: "rgba(255,248,238,0.6)", letterSpacing: "0.1em" }}>
          {t.map_address}
        </p>
      </motion.div>

      {/* Map + info grid */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, delay: 0.2 }}
        style={{
          maxWidth: 1000,
          margin: "0 auto 48px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 0,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Map embed */}
        <div style={{ position: "relative", minHeight: 320 }}>
          {/* Real Google Maps embed — replace MAP_EMBED_URL with actual venue URL */}
          <iframe
            src={MAP_EMBED_URL}
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: 320, display: "block", filter: "grayscale(20%) contrast(0.95) brightness(0.9)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Venue Location"
          />
          {/* Overlay pin */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              style={{ background: COLORS.navy, borderRadius: "50% 50% 50% 0", width: 36, height: 36, transform: "rotate(-45deg)", boxShadow: "0 4px 16px rgba(27,74,92,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div style={{ transform: "rotate(45deg)", color: "#FFF8EE", fontSize: "1rem" }}>♥</div>
            </motion.div>
          </div>
        </div>

        {/* Directions panel */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "40px 36px",
            display: "flex",
            flexDirection: "column",
            gap: 28,
            textAlign: "left",
          }}
        >
          {DIRECTIONS.map(({ icon, label, detail }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.7 }}
              style={{ display: "flex", gap: 16, alignItems: "flex-start" }}
            >
              <div style={{ width: 40, height: 40, background: "rgba(138,158,122,0.15)", border: "1px solid rgba(138,158,122,0.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                {icon}
              </div>
              <div>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.72rem", letterSpacing: "0.16em", color: COLORS.sage, textTransform: "uppercase", marginBottom: 4 }}>
                  {label}
                </p>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.85rem", fontWeight: 300, color: "rgba(255,248,238,0.65)", lineHeight: 1.7 }}>
                  {detail}
                </p>
              </div>
            </motion.div>
          ))}

          <div style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem", fontStyle: "italic", color: "rgba(255,248,238,0.5)", lineHeight: 1.7 }}>
              {t.map_note}
            </p>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.6, duration: 0.7 }}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255,248,238,0.08)",
          border: "1px solid rgba(255,248,238,0.25)",
          borderRadius: 100,
          padding: "14px 32px",
          fontFamily: "'Jost', sans-serif",
          fontSize: "0.75rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#FFF8EE",
          textDecoration: "none",
          backdropFilter: "blur(8px)",
          transition: "background 0.3s",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5C8 14.5 12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z" stroke="#FFF8EE" strokeWidth="1.2"/>
          <circle cx="8" cy="6" r="1.5" stroke="#FFF8EE" strokeWidth="1.2"/>
        </svg>
        {t.map_btn}
      </motion.a>
    </section>
  );
}
