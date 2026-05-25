import { motion } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
  WatercolorWash,
  PaperTexture,
  WatercolorFlower,
  BotanicalBorder,
} from "./shared";

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
        background: "linear-gradient(180deg, #EBDDc4 0%, #E3D2B0 50%, #DBC59A 100%)",
        color: COLORS.warmBrown,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Watercolor texture layers — match Hero */}
      <WatercolorWash variant="warm" intensity={0.7} />
      <PaperTexture opacity={0.3} />
      <BotanicalBorder />
      <BotanicalBorder flip />

      <WatercolorFlower
        size={36}
        style={{ position: "absolute", top: 90, left: 30, opacity: 0.55, zIndex: 1 }}
      />
      <WatercolorFlower
        size={30}
        color="#A8B080"
        centerColor="#7A8A5A"
        style={{ position: "absolute", top: 120, right: 36, opacity: 0.5, zIndex: 1 }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ maxWidth: 600, margin: "0 auto 56px", position: "relative", zIndex: 2 }}
      >
        <p style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: "0.7rem",
          letterSpacing: "0.28em",
          color: COLORS.lightBrown,
          textTransform: "uppercase",
          marginBottom: 14,
        }}>
          {t.map_label}
        </p>
        <Divider className="mb-4" />
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: 500,
          color: COLORS.navy,
          marginBottom: 8,
          lineHeight: 1.2,
        }}>
          {t.map_title}
        </h2>
        <p style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: "0.82rem",
          color: COLORS.midBrown,
          letterSpacing: "0.1em",
        }}>
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
          boxShadow: "0 20px 60px rgba(61,34,21,0.15)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Map embed */}
        <div style={{ position: "relative", minHeight: 320 }}>
          <iframe
            src={MAP_EMBED_URL}
            width="100%"
            height="100%"
            style={{
              border: 0, minHeight: 320, display: "block",
              filter: "sepia(15%) saturate(0.9) brightness(0.96)",
            }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Venue Location"
          />
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              style={{
                background: COLORS.gold,
                borderRadius: "50% 50% 50% 0",
                width: 36, height: 36,
                transform: "rotate(-45deg)",
                boxShadow: "0 4px 16px rgba(138,112,48,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{ transform: "rotate(45deg)", color: "#FFF8EE", fontSize: "1rem" }}>♥</div>
            </motion.div>
          </div>
        </div>

        {/* Directions panel — warm cream tones */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(248,241,230,0.85), rgba(235,221,196,0.85))",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(138,107,75,0.15)",
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
              <div style={{
                width: 40, height: 40,
                background: "rgba(138,112,48,0.12)",
                border: "1px solid rgba(138,112,48,0.25)",
                borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.1rem", flexShrink: 0,
              }}>
                {icon}
              </div>
              <div>
                <p style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "0.72rem",
                  letterSpacing: "0.16em",
                  color: COLORS.gold,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}>
                  {label}
                </p>
                <p style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 300,
                  color: COLORS.midBrown,
                  lineHeight: 1.7,
                }}>
                  {detail}
                </p>
              </div>
            </motion.div>
          ))}

          <div style={{ paddingTop: 8, borderTop: "1px solid rgba(138,107,75,0.18)" }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "0.95rem",
              fontStyle: "italic",
              color: COLORS.lightBrown,
              lineHeight: 1.7,
            }}>
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
          background: `linear-gradient(135deg, ${COLORS.gold}, #6B5520)`,
          border: "none",
          borderRadius: 100,
          padding: "14px 32px",
          fontFamily: "'Jost', sans-serif",
          fontSize: "0.75rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#FFF8EE",
          textDecoration: "none",
          boxShadow: "0 8px 24px rgba(138,112,48,0.3)",
          transition: "box-shadow 0.3s",
          position: "relative",
          zIndex: 2,
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
