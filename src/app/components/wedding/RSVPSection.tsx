import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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

type Status = "idle" | "submitted-yes" | "submitted-no";

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
      <WatercolorWash variant="warm" intensity={0.6} />
      <PaperTexture opacity={0.3} />
      <BotanicalBorder />
      <WatercolorFlower size={32} color="#D4A574" style={{ position: "absolute", top: 90, left: 36, opacity: 0.55, zIndex: 1 }} />
      <WatercolorFlower size={28} color="#A8B080" centerColor="#7A8A5A" style={{ position: "absolute", top: 120, right: 40, opacity: 0.5, zIndex: 1 }} />

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
        <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.82rem", color: COLORS.lightBrown, marginBottom: 48, letterSpacing: "0.06em" }}>
          {t.rsvp_subtitle}
        </p>

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
                  {(["yes", "no"] as const).map((val) => (
                    <motion.button
                      key={val}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setAttending(val)}
                      style={{
                        padding: "14px",
                        borderRadius: 12,
                        border: `1.5px solid ${attending === val ? (val === "yes" ? COLORS.navy : "#C0392B") : "rgba(138,107,75,0.2)"}`,
                        background: attending === val
                          ? val === "yes"
                            ? `rgba(27,42,74,0.08)`
                            : `rgba(192,57,43,0.06)`
                          : "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                        fontFamily: "'TT Interphases', sans-serif",
                        fontSize: "0.8rem",
                        letterSpacing: "0.1em",
                        color: attending === val
                          ? val === "yes" ? COLORS.navy : "#C0392B"
                          : COLORS.lightBrown,
                        transition: "all 0.3s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: "1rem" }}>{val === "yes" ? "♥" : "✦"}</span>
                      {val === "yes" ? t.rsvp_yes : t.rsvp_no}
                    </motion.button>
                  ))}
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
