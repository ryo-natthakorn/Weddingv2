import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
} from "./shared";

type Status = "idle" | "submitted-yes" | "submitted-no";
type Spark = { id: number; x: number; y: number; size: number; color: string };

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL as string | undefined;

const GUEST_MIN = 1;
const GUEST_MAX = 10;

/* Round 48px control for the guest stepper — comfortably past the 44px touch
   target floor, so it stays easy for older guests to hit. */
function StepButton({
  sign,
  onClick,
  disabled,
  label,
}: {
  sign: "minus" | "plus";
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileHover={disabled ? {} : { scale: 1.06 }}
      whileTap={disabled ? {} : { scale: 0.94 }}
      style={{
        width: 48,
        height: 48,
        flexShrink: 0,
        borderRadius: "50%",
        border: `1px solid ${disabled ? "rgba(138,107,75,0.18)" : "rgba(138,112,48,0.45)"}`,
        background: disabled ? "rgba(255,255,255,0.4)" : "rgba(255,248,240,0.9)",
        color: disabled ? "rgba(138,107,75,0.35)" : COLORS.gold,
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: disabled ? "none" : "0 4px 14px rgba(138,112,48,0.18)",
        transition: "background 0.25s, border-color 0.25s, color 0.25s",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M3 8H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {sign === "plus" && <path d="M8 3V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
      </svg>
    </motion.button>
  );
}

export function RSVPSection() {
  const { t, lang } = useLang();
  const { ref, inView } = useReveal();
  const reduceMotion = useReducedMotion();

  const [name, setName] = useState("");
  const [attending, setAttending] = useState<"yes" | "no" | null>(null);
  const [guests, setGuests] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [attendHint, setAttendHint] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [burst, setBurst] = useState<Spark[]>([]);
  const scrollTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    if (scrollTimerRef.current !== undefined) clearTimeout(scrollTimerRef.current);
  }, []);

  // 14-particle gold/navy burst fired when "Joyfully Accept" is tapped.
  const fireBurst = () => {
    if (reduceMotion) return;
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
    if (submitting) return;
    if (!attending) {
      setAttendHint(true);
      return;
    }
    if (!name.trim()) return;
    setSubmitting(true);
    setError(false);

    const payload = {
      name: name.trim(),
      attending,
      guests: attending === "yes" ? Math.min(GUEST_MAX, Math.max(GUEST_MIN, guests)) : 0,
    };

    try {
      if (!SCRIPT_URL) {
        console.warn("RSVP: VITE_GOOGLE_SCRIPT_URL is not set — submission was NOT saved.");
      }
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
      scrollTimerRef.current = window.setTimeout(() => {
        document
          .getElementById("gift-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 2500);
    } catch {
      setSubmitting(false);
      setError(true);
    }
  };

  const stepGuests = (delta: number) =>
    setGuests((g) => Math.min(GUEST_MAX, Math.max(GUEST_MIN, g + delta)));

  const resetForm = () => {
    // Going back inside the 2.5s window must also cancel the pending glide.
    if (scrollTimerRef.current !== undefined) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = undefined;
    }
    setStatus("idle");
    setName("");
    setAttending(null);
    setGuests(1);
    setError(false);
    setAttendHint(false);
  };

  const inputStyle = (id: string): React.CSSProperties => ({
    width: "100%",
    background: focused === id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
    border: `1px solid ${focused === id ? COLORS.navy : "rgba(27,74,92,0.15)"}`,
    borderRadius: 12,
    padding: "14px 18px",
    fontFamily: "'TT Interphases', sans-serif",
    fontSize: "1rem", // 16px minimum — anything smaller triggers iOS focus auto-zoom
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
        padding: "44px 24px 48px",
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
        <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "1.1rem", letterSpacing: "0.28em", color: COLORS.lightBrown, textTransform: "uppercase", marginBottom: 12 }}>
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
                <label htmlFor="rsvp-name" style={labelStyle}>{t.rsvp_name}</label>
                <input
                  id="rsvp-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
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
                          setAttendHint(false);
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
                {attendHint && (
                  <p role="alert" style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.74rem", color: COLORS.midBrown, letterSpacing: "0.04em", marginTop: 8 }}>
                    {lang === "TH" ? "กรุณาเลือกว่าจะมาร่วมงานหรือไม่" : "Please choose whether you can join us"}
                  </p>
                )}
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
                      <label id="rsvp-guests-label" style={labelStyle}>{t.rsvp_guests}</label>
                      {/* Stepper rather than a number field: on mobile a numeric
                          input summons the keypad and covers the form, and the
                          native spinners are far too small to hit. */}
                      <div
                        role="spinbutton"
                        aria-labelledby="rsvp-guests-label"
                        aria-valuenow={guests}
                        aria-valuemin={GUEST_MIN}
                        aria-valuemax={GUEST_MAX}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); stepGuests(1); }
                          if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); stepGuests(-1); }
                        }}
                        onFocus={() => setFocused("guests")}
                        onBlur={() => setFocused(null)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 20,
                          background: focused === "guests" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
                          border: `1px solid ${focused === "guests" ? COLORS.navy : "rgba(27,74,92,0.15)"}`,
                          borderRadius: 12,
                          padding: "10px 16px",
                          outline: "none",
                          transition: "all 0.3s",
                          boxShadow: focused === "guests" ? "0 0 0 3px rgba(27,42,74,0.08)" : "none",
                        }}
                      >
                        <StepButton
                          sign="minus"
                          onClick={() => stepGuests(-1)}
                          disabled={guests <= GUEST_MIN}
                          label={lang === "TH" ? "ลดจำนวนผู้เข้าร่วม" : "One guest fewer"}
                        />
                        {/* Digit rolls like the countdown tiles; the box is fixed
                            so stepping never nudges the buttons sideways.

                            Height was previously "1.3em", which resolved against
                            this div's INHERITED font-size (the browser default
                            16px, since nothing sets a root font-size) rather
                            than the digit's own larger one — a 20.8px box
                            clipping a ~33px-tall digit. Flex-centering plus a
                            fixed height with real headroom (not just line-height
                            matched) fixes it properly: a hairline-exact box
                            would have left the digit one webfont-swap away from
                            clipping again, the same failure mode that broke the
                            names and date earlier in this project. */}
                        <div style={{ minWidth: 48, height: 40, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <motion.span
                            key={guests}
                            initial={reduceMotion ? false : { y: "-100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            style={{ display: "block", fontFamily: "'TT Interphases', sans-serif", fontSize: "1.6rem", fontWeight: 500, color: COLORS.navy, lineHeight: 1.3 }}
                          >
                            {guests}
                          </motion.span>
                        </div>
                        <StepButton
                          sign="plus"
                          onClick={() => stepGuests(1)}
                          disabled={guests >= GUEST_MAX}
                          label={lang === "TH" ? "เพิ่มจำนวนผู้เข้าร่วม" : "One guest more"}
                        />
                      </div>
                      <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.72rem", fontWeight: 300, color: COLORS.lightBrown, letterSpacing: "0.04em", marginTop: 6 }}>
                        {t.rsvp_guests_help}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              {error && (
                <p role="alert" style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.8rem", color: "#C0392B", textAlign: "center" }}>
                  {t.rsvp_error}
                </p>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
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
              role="status"
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
                style={{ marginTop: 28, minHeight: 44, background: "none", border: `1px solid rgba(138,107,75,0.3)`, borderRadius: 100, padding: "10px 24px", fontFamily: "'TT Interphases', sans-serif", fontSize: "0.7rem", letterSpacing: "0.16em", color: COLORS.lightBrown, cursor: "pointer", textTransform: "uppercase" }}
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
