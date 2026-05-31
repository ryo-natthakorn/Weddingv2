import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
} from "./shared";

type Status = "idle" | "submitted-yes" | "submitted-no";
type Spark = { id: number; x: number; y: number; size: number; color: string };

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL as string | undefined;

export function RSVPSection() {
  const { t } = useLang();
  const { ref, inView } = useReveal();

  const [name, setName] = useState("");
  const [attending, setAttending] = useState<"yes" | "no" | null>(null);
  const [guests, setGuests] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [burst, setBurst] = useState<Spark[]>([]);

  // 14-particle gold/navy burst fired when "Joyfully Accept" is tapped.
  const fireBurst = () => {
    const palette = [COLORS.gold, COLORS.navy];
    const sparks: Spark[] = Array.from({ length: 14 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.45;
      const dist = 40 + Math.random() * 40; // 40–80px
      return {
        id: Date.now() + i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: 5 + Math.random() * 5, // 5–10px diameter
        color: palette[Math.floor(Math.random() * palette.length)],
      };
    });
    setBurst(sparks);
    window.setTimeout(() => setBurst([]), 720); // remove from DOM after the 0.7s anim
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !attending || submitting) return;
    setSubmitting(true);
    setError(false);

    const payload = {
      name,
      attending,
      guests: attending === "yes" ? guests : 0,
    };

    try {
      if (SCRIPT_URL) {
        // text/plain avoids a CORS preflight; no-cors keeps the POST from
        // throwing on Apps Script's opaque response — the row still writes.
        await fetch(SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      }

      setSubmitting(false);
      setStatus(attending === "yes" ? "submitted-yes" : "submitted-no");

      // Show the confirmation briefly, then glide down to the gift section.
      setTimeout(() => {
        document
          .getElementById("gift-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 2500);
    } catch {
      setSubmitting(false);
      setError(true);
    }
  };

  const resetForm = () => {
    setStatus("idle");
    setName("");
    setAttending(null);
    setGuests(1);
    setError(false);
  };

  const inputStyle = (id: string): React.CSSProperties => ({
    width: "100%",
    background: focused === id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
    border: `1px solid ${focused === id ? COLORS.navy : "rgba(27,74,92,0.15)"}`,
    borderRadius: 12,
    padding: "14px 18px",
    fontFamily: "'TT Interphases', sans-serif",
    fontSize: "0.88rem",
    fontWeight: 300,
    color: COLORS.warmBrown,
    outline: "none",
    transition: "all 0.3s",
    boxSizing: "border-box",
    boxShadow: focused === id ? `0 0 0 3px rgba(27,42,74,0.08)` : "none",
  });

  const labelStyle: React.CSSProperties = {
    fontFamily: "'TT Interphases', sans-serif",
    fontSize: "0.68rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: COLORS.lightBrown,
    display: "block",
    marginBottom: 8,
  };

  return (
    <section
      ref={ref}
      style={{
        padding: "96px 24px",
        background: "transparent",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ maxWidth: 560, margin: "0 auto", position: "relative", zIndex: 2 }}
      >
        <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.7rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 12 }}>
          {t.rsvp_label}
        </p>
        <Divider className="mb-6" />
        <h2 style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 500, color: COLORS.warmBrown, marginBottom: 12, lineHeight: 1.2 }}>
          {t.rsvp_title}
        </h2>
        <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.82rem", color: COLORS.lightBrown, marginBottom: status === "idle" ? 28 : 48, letterSpacing: "0.06em" }}>
          {t.rsvp_subtitle}
        </p>

        {/* Importance message — warm, gentle, between subtitle and form */}
        {status === "idle" && (
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.82rem", fontStyle: "italic", fontWeight: 300, color: COLORS.midBrown, lineHeight: 1.8, letterSpacing: "0.02em", marginBottom: 40, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
            {t.rsvp_importance}
          </p>
        )}

        <AnimatePresence mode="wait">
          {status === "idle" ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 20, textAlign: "left" }}
            >
              {/* Name */}
              <div>
                <label style={labelStyle}>{t.rsvp_name}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  placeholder="Your name..."
                  required
                  style={inputStyle("name")}
                />
              </div>

              {/* Attending */}
              <div>
                <label style={labelStyle}>{t.rsvp_attend}</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {(["yes", "no"] as const).map((val) => {
                    const isYes = val === "yes";
                    const selected = attending === val;
                    const accent = isYes ? COLORS.navy : COLORS.lightBrown;
                    return (
                      <motion.button
                        key={val}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setAttending(val);
                          if (isYes) fireBurst();
                        }}
                        style={{
                          position: "relative",
                          padding: "14px",
                          borderRadius: 12,
                          border: `1.5px solid ${selected ? (isYes ? COLORS.navy : "rgba(138,107,75,0.5)") : "rgba(138,107,75,0.2)"}`,
                          background: selected
                            ? isYes ? "rgba(27,42,74,0.08)" : "rgba(138,107,75,0.07)"
                            : "rgba(255,255,255,0.5)",
                          cursor: "pointer",
                          fontFamily: "'TT Interphases', sans-serif",
                          fontSize: "0.8rem",
                          letterSpacing: "0.1em",
                          color: selected ? accent : COLORS.lightBrown,
                          // Yes pops; No simply dims with a quiet, slower fade.
                          opacity: selected && !isYes ? 0.7 : 1,
                          transition: isYes
                            ? "all 0.3s"
                            : "border-color 0.6s ease, color 0.6s ease, background 0.6s ease, opacity 0.6s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: "1rem" }}>{isYes ? "♥" : "✦"}</span>
                        {isYes ? t.rsvp_yes : t.rsvp_no}
                        {/* Burst particles — Yes button only */}
                        {isYes && burst.map((s) => (
                          <motion.span
                            key={s.id}
                            aria-hidden
                            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                            animate={{ opacity: 0, x: s.x, y: s.y, scale: 0.5 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: "50%",
                              width: s.size,
                              height: s.size,
                              marginLeft: -s.size / 2,
                              marginTop: -s.size / 2,
                              borderRadius: "50%",
                              background: s.color,
                              pointerEvents: "none",
                              zIndex: 5,
                            }}
                          />
                        ))}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Number of guests — only if attending */}
              <AnimatePresence>
                {attending === "yes" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div>
                      <label style={labelStyle}>{t.rsvp_guests}</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        onFocus={() => setFocused("guests")}
                        onBlur={() => setFocused(null)}
                        style={inputStyle("guests")}
                      />
                      <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.72rem", fontWeight: 300, color: COLORS.lightBrown, letterSpacing: "0.04em", marginTop: 6 }}>
                        {t.rsvp_guests_help}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              {error && (
                <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.8rem", color: "#C0392B", textAlign: "center" }}>
                  {t.rsvp_error}
                </p>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={submitting ? {} : { scale: 1.02, y: -2 }}
                whileTap={submitting ? {} : { scale: 0.97 }}
                style={{
                  background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyLight})`,
                  color: "#FFF8EE",
                  border: "none",
                  borderRadius: 100,
                  padding: "16px 40px",
                  fontFamily: "'TT Interphases', sans-serif",
                  fontSize: "0.78rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  marginTop: 8,
                  boxShadow: "0 8px 24px rgba(27,42,74,0.25)",
                  transition: "box-shadow 0.3s",
                }}
              >
                {submitting ? t.rsvp_sending : t.rsvp_submit}
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: status === "submitted-yes" ? `rgba(27,42,74,0.06)` : "rgba(192,57,43,0.05)",
                border: `1px solid ${status === "submitted-yes" ? "rgba(27,42,74,0.2)" : "rgba(192,57,43,0.2)"}`,
                borderRadius: 20,
                padding: "56px 40px",
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                style={{ fontSize: "3rem", marginBottom: 20 }}
              >
                {status === "submitted-yes" ? "♥" : "✦"}
              </motion.div>
              <h3 style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.4rem, 3.5vw, 2rem)", fontWeight: 500, color: COLORS.warmBrown, marginBottom: 12, lineHeight: 1.3 }}>
                {name}
              </h3>
              <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.9rem", fontWeight: 300, color: COLORS.midBrown, lineHeight: 1.8 }}>
                {status === "submitted-yes" ? t.rsvp_thanks : t.rsvp_sorry}
              </p>
              <button
                onClick={resetForm}
                style={{ marginTop: 28, background: "none", border: `1px solid rgba(138,107,75,0.3)`, borderRadius: 100, padding: "10px 24px", fontFamily: "'TT Interphases', sans-serif", fontSize: "0.7rem", letterSpacing: "0.16em", color: COLORS.lightBrown, cursor: "pointer", textTransform: "uppercase" }}
              >
                ← Go Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
