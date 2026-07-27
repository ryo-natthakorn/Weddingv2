import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
    // Four equal columns rather than a wrapping flex row: a fixed 4-track grid
    // can't drop "Sec" onto a second line at 320px, and minmax(0, 1fr) lets the
    // tiles shrink to whatever the viewport allows instead of overflowing.
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "clamp(6px, 2vw, 12px)", maxWidth: 420, margin: "0 auto" }}>
      {[{ label: "Days", v: time.days }, { label: "Hours", v: time.hours }, { label: "Min", v: time.minutes }, { label: "Sec", v: time.seconds }].map(({ label, v }) => (
        <motion.div key={label} whileHover={{ scale: 1.05, y: -4 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
          {/* Static tile — only the digit animates, so the blur/border/shadow
              never re-render and the tile never collapses between ticks */}
          <div style={{ width: "100%", background: "rgba(255,248,240,0.55)", border: "1px solid rgba(138,112,48,0.25)", borderRadius: 12, padding: "clamp(10px, 3vw, 14px) clamp(6px, 2vw, 16px)", fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.2rem, 5.6vw, 2.2rem)", fontWeight: 500, color: COLORS.gold, lineHeight: 1, textAlign: "center", boxShadow: "0 4px 20px rgba(61,34,21,0.12)", backdropFilter: "blur(8px)" }}>
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
          {/* nowrap + trimmed tracking at the small end so "HOURS" stays on one
              line inside a ~63px column at 320px */}
          <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.58rem", letterSpacing: "clamp(0.06em, 0.5vw, 0.2em)", color: COLORS.lightBrown, marginTop: 8, textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
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

/* Measures the two name lines and returns the one scale that keeps BOTH on a
   single line inside `wrapRef`. offsetWidth/offsetHeight are layout values —
   CSS transforms don't affect them — so the natural (unscaled) size stays
   readable even while a scale is already applied, and no reset/re-measure
   dance is needed. */
function useNameFit(
  wrapRef: RefObject<HTMLElement | null>,
  lineRefs: RefObject<HTMLElement | null>[],
  deps: unknown[],
) {
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const avail = wrap.clientWidth;
      const lines = lineRefs.map((r) => r.current).filter(Boolean) as HTMLElement[];
      if (!avail || lines.length === 0) return;

      let scale = 1;
      let height = 0;
      for (const el of lines) {
        height = Math.max(height, el.offsetHeight);
        // 0.995 leaves a hair of slack so sub-pixel rounding can't re-wrap.
        if (el.offsetWidth > avail) scale = Math.min(scale, (avail / el.offsetWidth) * 0.995);
      }
      // Bail out when nothing moved — pinning the row height changes `wrap`'s
      // own height, which re-fires the observer; without this it never settles.
      setFit((prev) =>
        Math.abs(prev.scale - scale) < 0.001 && prev.height === height ? prev : { scale, height },
      );
    };

    measure();

    // The webfont is ~140KB per face. On a slow connection the text first lays
    // out in the fallback face, gets measured, and only later swaps to TT
    // Interphases and grows — widening the line without resizing its container.
    // A single measurement therefore leaves a stale, too-large scale and the
    // name overflows (this shipped once). None of the signals below is
    // sufficient alone, so subscribe to all of them:
    //   • the container resizing (viewport / orientation change)
    //   • each line resizing (the swap itself; transforms don't change layout
    //     size, so observing the lines can't feed back into itself)
    //   • each font-load batch finishing
    //   • an explicit load of the exact face we render in — plain
    //     `fonts.ready` resolves as soon as nothing is pending, which in a
    //     layout effect is usually BEFORE these glyphs are ever requested
    //   • a few deferred passes, for swaps that surface no observable record
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    for (const r of lineRefs) if (r.current) ro.observe(r.current);

    const fonts = document.fonts;
    fonts?.addEventListener("loadingdone", measure);
    fonts?.load("600 2rem 'TT Interphases'").then(measure).catch(() => {});
    fonts?.ready.then(measure).catch(() => {});

    const timers = [150, 500, 1500, 3000].map((ms) => window.setTimeout(measure, ms));

    return () => {
      ro.disconnect();
      fonts?.removeEventListener("loadingdone", measure);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return fit;
}

export function NameIntroWithCountdown() {
  const { t, lang } = useLang();
  // Three independent triggers — the section is ~2 phone screens tall, so a
  // single trigger would fire the name/date animations while still off-screen.
  const { ref, inView } = useReveal("-40px");
  const { ref: namesRef, inView: namesInView } = useReveal("-40px");
  const { ref: dateRef, inView: dateInView } = useReveal("-40px");

  // Scale-to-fit for the two name lines — see nameStyle below.
  const fitWrapRef = useRef<HTMLDivElement>(null);
  const brideLineRef = useRef<HTMLSpanElement>(null);
  const groomLineRef = useRef<HTMLSpanElement>(null);
  const nameFit = useNameFit(fitWrapRef, [brideLineRef, groomLineRef], [
    t.bride_title, t.bride_name, t.groom_title, t.groom_name,
  ]);

  // Single-line guard for the parent names only — nowrap keeps each on one
  // line; overflow+ellipsis is a safety net rather than an overlap/clip if a
  // string ever runs wider than its box.
  const singleLine = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;
  // Title + name are one unbreakable line (see useNameFit): never wrapped,
  // never ellipsised. The longest string ("Mr. Natthakorn Suppasuesanguan")
  // is far wider than a 320px viewport at this display size, so instead of
  // breaking or truncating it we measure the real rendered width and scale
  // the whole line down just enough to fit. Guessing a vw-based size from
  // character counts can't work here — Thai and Latin have different
  // metrics, so only measurement is reliable for both languages.
  // lineHeight is generous (not the tight ~1.15 a Latin-only display face could
  // use) because Thai vowels/tone marks stack above and below the consonant
  // line (สระอือ, สระอุ) and some consonants (e.g. ฐ) have descenders —
  // ClipReveal's wrapper keeps overflow:hidden for its wipe animation, so a
  // tight line box would clip them.
  const nameStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(1.7rem, 7vw, 3rem)", fontWeight: 600, color: COLORS.navy, letterSpacing: "0.01em", lineHeight: 1.5 } as const;
  // Title (Flt. Lt. / Mr.) now fully matches the name's format — same color,
  // size, and weight — only the tracking stays slightly wider.
  const titleStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: nameStyle.fontSize, fontWeight: 600, color: nameStyle.color, letterSpacing: "0.06em", lineHeight: 1.5 } as const;
  // Title and name sit on one nowrap row, separated by a real space character
  // rather than a flex gap — a CSS gap looks right but leaves the words jammed
  // together ("Mr.Natthakorn") for screen readers and copy-paste. Both name
  // lines share a single scale (the smaller of the two) so bride and groom
  // always render at matching size rather than each shrinking independently.
  const nameLineStyle = {
    display: "inline-block",
    whiteSpace: "nowrap",
    transform: `scale(${nameFit.scale})`,
    transformOrigin: "center top",
  } as const;
  // Transforms don't shrink the layout box, so a scaled line would leave dead
  // space below it — pin the row to the height the line actually paints.
  const nameRowStyle = {
    height: nameFit.scale < 1 && nameFit.height ? nameFit.height * nameFit.scale : undefined,
  } as const;
  // Stacked full-width (not side-by-side columns) — a two-column split only
  // gives each parent line ~45% of the content width, too narrow for the
  // longer Thai strings at this font size without truncating.
  // Quieted a step further than before — these recede as setup so the
  // names/ring hero and the closing date read as the section's two peaks,
  // not three elements of similar weight.
  const parentStyle = { fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.85rem, 2.1vw, 1rem)", color: COLORS.lightBrown, letterSpacing: "0.04em", lineHeight: 1.6, textAlign: "center" as const, ...singleLine };

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

        {/* 4-6. Bride · Ring · Groom — title + name reveal together as one
            single line (left-to-right clip-wipe). Bride wipes first
            (1.8s); groom follows after 0.3s (2.2s). Both triggered together
            when the section enters the viewport. */}
        {/* fitWrapRef is the width the two name lines must fit inside. */}
        <div ref={namesRef} style={{ marginTop: 40 }}>
          <div ref={fitWrapRef}>
            {/* Bride */}
            <ClipReveal active={namesInView} duration={1.8}>
              <div style={nameRowStyle}>
                <span ref={brideLineRef} style={nameLineStyle}>
                  <span style={titleStyle}>{t.bride_title}</span>{" "}
                  <span style={nameStyle}>{t.bride_name}</span>
                </span>
              </div>
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
            <ClipReveal active={namesInView} duration={2.2} delay={0.3}>
              <div style={nameRowStyle}>
                <span ref={groomLineRef} style={nameLineStyle}>
                  <span style={titleStyle}>{t.groom_title}</span>{" "}
                  <span style={nameStyle}>{t.groom_name}</span>
                </span>
              </div>
            </ClipReveal>
          </div>
        </div>

        {/* 7-8. Date + venue — the section's closing beat. "Sunday" recedes
            to a true label (DESIGN.md Label tier) so the date itself can
            commit to Headline-tier scale instead of the two competing at
            similar weight. Entrance echoes the ring's confident scale-in
            rather than the plain fade used by the setup elements above. */}
        <motion.div
          ref={dateRef}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={dateInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ delay: 0.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: 64 }}
        >
          <Divider className="mb-6" />
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.68rem, 1.8vw, 0.78rem)", fontWeight: 400, color: COLORS.lightBrown, letterSpacing: "0.32em", marginRight: "-0.32em", textTransform: "uppercase", marginBottom: 10 }}>
            {t.sunday}
          </p>
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(2rem, 6.5vw, 3rem)", fontWeight: 500, color: COLORS.navy, letterSpacing: "0.03em", lineHeight: 1.15 }}>
            {lang === "TH" ? "22 พฤศจิกายน 2569" : "22 November 2026"}
          </p>
          <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "clamp(0.78rem, 2vw, 0.92rem)", letterSpacing: "0.14em", color: COLORS.lightBrown, textTransform: "uppercase", marginTop: 16 }}>
            {t.map_title}
          </p>
        </motion.div>
      </div>
    </section>
    </MotionConfig>
  );
}
