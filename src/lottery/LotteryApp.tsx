import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import {
  Check,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import pnLogo from "../imports/Logo.svg";
import { Drums, type DrumsHandle } from "./Drums";
import { ResultBoard } from "./ResultBoard";
import { hush, initAnnouncer, say } from "./announcer";
import { SettingsSheet } from "./SettingsSheet";
import {
  drawPool,
  loadState,
  parseSpec,
  pickRandom,
  positionName,
  saveState,
  THAI_DIGITS,
  type DrawState,
} from "./store";
import {
  canFullscreen,
  clack,
  fanfare,
  isFullscreen,
  keepAwake,
  pok,
  preloadSounds,
  rumbleLevel,
  rumbleStart,
  rumbleStop,
  setSoundEnabled,
  signal,
  toggleFullscreen,
  unlockAudio,
} from "./device";

type Phase = "ready" | "spinning" | "reveal";

const EASE = [0.22, 1, 0.36, 1] as const;
const swap = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/* LINE's in-app browser can keep the draw quiet and can't work offline.
   LINE opens a link in the phone's real browser when the URL carries
   ?openExternalBrowser=1, so the notice links to exactly that. */
const IN_LINE = typeof navigator !== "undefined" && /\bLine\//i.test(navigator.userAgent);

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

const CONFETTI_COLORS = ["#8A7030", "#C4A840", "#1B4A5C", "#2A6A80", "#FFF8F0", "#E8C09A"];

function celebrate() {
  const base = { colors: CONFETTI_COLORS, disableForReducedMotion: true, zIndex: 40 };
  confetti({ ...base, particleCount: 150, spread: 95, startVelocity: 48, origin: { x: 0.5, y: 0.5 }, scalar: 1.1 });
  const end = Date.now() + 1500;
  (function side() {
    confetti({ ...base, particleCount: 4, angle: 60, spread: 58, origin: { x: 0, y: 0.8 } });
    confetti({ ...base, particleCount: 4, angle: 120, spread: 58, origin: { x: 1, y: 0.8 } });
    if (Date.now() < end) requestAnimationFrame(side);
  })();
}

export default function LotteryApp() {
  const [s, setS] = useState<DrawState>(loadState);
  const [phase, setPhase] = useState<Phase>(() => (s.pending ? "reveal" : "ready"));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [fs, setFs] = useState(false);
  const [caption, setCaption] = useState("");
  const [clock, setClock] = useState("");
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const drums = useRef<DrumsHandle>(null);
  const runId = useRef(0);
  // Latest settings, read between steps of a running draw (mute mid-draw).
  const latest = useRef(s);
  latest.current = s;
  const reduced = !!useReducedMotion();

  const parsed = useMemo(() => parseSpec(s.spec), [s.spec]);
  const pool = useMemo(() => drawPool(s, parsed.numbers), [s, parsed.numbers]);
  const active = s.prizes.find((p) => p.id === s.activeId) ?? s.prizes[0];
  const pendingPrize = s.pending ? s.prizes.find((p) => p.id === s.pending!.prizeId) : undefined;
  const nextPrize = s.prizes.find((p) => !p.winner && p.id !== active.id);
  const anyWinner = s.prizes.some((p) => p.winner);

  useEffect(() => saveState(s), [s]);
  useEffect(() => setSoundEnabled(s.sound), [s.sound]);
  useEffect(() => initAnnouncer(setVoiceName), []);

  // Settings can clear a pending draw (reset, clear prize) — fall back to ready.
  useEffect(() => {
    if (phase === "reveal" && !s.pending) setPhase("ready");
  }, [phase, s.pending]);

  // Rest the cups on whatever the screen is about: the number awaiting
  // confirmation, this prize's confirmed winner, or empty if it's still open.
  useEffect(() => {
    if (phase === "spinning") return;
    drums.current?.show(s.pending ? s.pending.n : active.winner);
  }, [phase, s.pending, active.winner, parsed.width]);

  // On-air clock in the LIVE badge.
  useEffect(() => {
    const fmt = () =>
      setClock(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    fmt();
    const id = window.setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);

  // Any tap or key: open (or re-open) the audio session and keep the iPad
  // from dimming. iOS only counts a finger lifting as a tap for audio, so
  // this listens to pointerup/touchend/click — not pointerdown.
  useEffect(() => {
    preloadSounds();
    const onGesture = () => {
      unlockAudio();
      void keepAwake();
    };
    const evs = ["pointerup", "touchend", "click", "keydown"] as const;
    evs.forEach((e) => window.addEventListener(e, onGesture, { capture: true, passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, onGesture, { capture: true }));
  }, []);

  useEffect(() => {
    const on = () => setFs(isFullscreen());
    document.addEventListener("fullscreenchange", on);
    document.addEventListener("webkitfullscreenchange", on);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      document.removeEventListener("webkitfullscreenchange", on);
    };
  }, []);

  /* The show, paced like the broadcast: the announcer opens, the long
     buzzer sounds while the drums churn, then for each drum a short buzz,
     the ball drops, and the announcer reads its digit. At the end the full
     number is read back. Each run has an id so a newer run (or a cancel)
     stops an older one between steps. */
  const runSpin = useCallback(
    async (base: DrawState, intro: string) => {
      const candidates = drawPool(base, parseSpec(base.spec).numbers);
      if (!candidates.length) {
        setS(base);
        return;
      }
      const n = pickRandom(candidates);
      const digits = n.split("").map(Number);
      const prizeName = base.prizes.find((p) => p.id === base.activeId)?.name ?? "รางวัล";
      const id = ++runId.current;
      const alive = () => runId.current === id;
      const talk = (text: string, rate?: number) =>
        latest.current.sound && latest.current.voice ? say(text, rate) : Promise.resolve();

      hush();
      // Saved before the drums turn: a reload mid-draw shows this same number.
      setS({ ...base, pending: { n, prizeId: base.activeId } });
      setPhase("spinning");
      setCaption(intro);
      await talk(intro); // first line is spoken inside the tap, as iOS requires
      if (!alive()) return;

      drums.current?.churn(reduced, { onClack: clack, onBounce: pok });
      signal("start");
      rumbleStart();
      await wait(reduced ? 900 : 3000);

      for (let i = 0; i < digits.length; i++) {
        if (!alive()) return;
        const place = positionName(i, digits.length);
        const d = digits[i];
        setCaption(`ลุ้น${place}…`);
        if (i === digits.length - 1 && !reduced) await wait(1000); // last drum: let the room shout
        if (!alive()) return;
        signal("release");
        await drums.current?.drop(i, d);
        if (!alive()) return;
        rumbleLevel((digits.length - i - 1) / digits.length);
        setCaption(`${place} ได้แก่ เลข ${d} · ${THAI_DIGITS[d]}`);
        // Just the digit, as the bride asked — the place is on screen already.
        await Promise.all([talk(THAI_DIGITS[d], 0.9), wait(reduced ? 150 : 300)]);
      }
      if (!alive()) return;

      rumbleStop();
      setPhase("reveal");
      signal("result", 0.1);
      celebrate();
      await wait(900);
      if (!alive()) return;
      await talk(`${prizeName} ได้แก่, ${digits.map((d) => THAI_DIGITS[d]).join(", ")}`, 0.85);
      if (!alive()) return;
      fanfare();
    },
    [reduced],
  );

  const draw = useCallback(() => {
    if (phase !== "ready" || active.winner || !pool.length) return;
    unlockAudio();
    void keepAwake();
    void runSpin(s, `ต่อไป เป็นการออก${active.name}`);
  }, [phase, active.winner, pool.length, runSpin, s]);

  function confirmWinner() {
    if (!s.pending) return;
    const { n, prizeId } = s.pending;
    const prizes = s.prizes.map((p) => (p.id === prizeId ? { ...p, winner: n } : p));
    const next = prizes.find((p) => !p.winner);
    const name = prizes.find((p) => p.id === prizeId)?.name ?? "";
    setS({
      ...s,
      prizes,
      pending: null,
      activeId: next ? next.id : prizeId,
      log: [...s.log, { n, prize: name, at: Date.now(), result: "won" }],
    });
    setPhase("ready");
    if (!next) setSummaryOpen(true);
  }

  /* Number called, nobody came up: that ticket leaves the drum for good and
     the wheels go again straight away for the same prize. */
  function redraw() {
    if (!s.pending) return;
    unlockAudio();
    const { n, prizeId } = s.pending;
    const name = s.prizes.find((p) => p.id === prizeId)?.name ?? "";
    void runSpin(
      {
        ...s,
        voided: [...s.voided, n],
        pending: null,
        activeId: prizeId,
        log: [...s.log, { n, prize: name, at: Date.now(), result: "void" }],
      },
      `ไม่มีผู้มารับรางวัล, ออก${name}ใหม่`,
    );
  }

  /* Spun by accident — put the ticket back as if nothing happened. */
  function cancelDraw() {
    if (!s.pending) return;
    const { n, prizeId } = s.pending;
    const name = s.prizes.find((p) => p.id === prizeId)?.name ?? "";
    runId.current++;
    hush();
    setS({ ...s, pending: null, log: [...s.log, { n, prize: name, at: Date.now(), result: "cancel" }] });
    setPhase("ready");
  }

  /* Space / Enter — or a Bluetooth presenter clicker (Page Down / arrow
     keys) — starts the draw, so it can be triggered while the iPad faces
     the guests. Confirming a winner always takes a deliberate tap. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen || summaryOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") return;
      if ([" ", "Enter", "PageDown", "ArrowRight", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        draw();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draw, settingsOpen, summaryOpen]);

  const busy = phase !== "ready";
  // The number to show on the big board: awaiting confirmation, or this
  // prize's confirmed winner. Otherwise the drums are on screen.
  const boardValue = phase === "reveal" ? s.pending?.n : phase === "ready" ? active.winner : null;

  return (
    <div className="ld-app" data-stage={busy || undefined}>
      <header className="ld-top">
        <div className="ld-brand">
          <img className="ld-logo" src={pnLogo} alt="Pantika & Natthakorn" />
          <span className="ld-live">
            <i aria-hidden /> LIVE <time>{clock}</time>
          </span>
        </div>
        <div className="ld-heading">
          <p className="ld-kicker">Wedding Lucky Draw</p>
          <h1 className="ld-title">การออกสลากกินแบ่งบ่าวสาว</h1>
          <p className="ld-date">งวดประจำวันที่ 22 พฤศจิกายน 2569</p>
        </div>
        <div className="ld-tools">
          {anyWinner && (
            <button className="ld-icon" onClick={() => setSummaryOpen(true)} disabled={phase === "spinning"} aria-label="ผู้โชคดีทั้งหมด">
              <Trophy size={22} strokeWidth={1.6} />
            </button>
          )}
          {canFullscreen() && (
            <button className="ld-icon" onClick={toggleFullscreen} aria-label={fs ? "ออกจากเต็มจอ" : "เต็มจอ"}>
              {fs ? <Minimize2 size={22} strokeWidth={1.6} /> : <Maximize2 size={22} strokeWidth={1.6} />}
            </button>
          )}
          <button
            className="ld-icon"
            onClick={() => {
              if (s.sound) hush();
              setS({ ...s, sound: !s.sound });
            }}
            aria-label={s.sound ? "ปิดเสียง" : "เปิดเสียง"}
            aria-pressed={s.sound}
          >
            {s.sound ? <Volume2 size={22} strokeWidth={1.6} /> : <VolumeX size={22} strokeWidth={1.6} />}
          </button>
          <button className="ld-icon" onClick={() => setSettingsOpen(true)} disabled={phase === "spinning"} aria-label="ตั้งค่า">
            <Settings size={22} strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <main className="ld-stage">
        {busy ? (
          // On air: the prize name, large, in place of the prize buttons.
          <p className="ld-onair-prize">{(pendingPrize ?? active).name}</p>
        ) : (
        <div className="ld-prizes" role="group" aria-label="เลือกรางวัล">
          {s.prizes.map((p) => (
            <button
              key={p.id}
              className="ld-prize"
              data-active={p.id === active.id || undefined}
              data-won={p.winner ? true : undefined}
              aria-pressed={p.id === active.id}
              disabled={busy && p.id !== active.id}
              onClick={() => !busy && setS({ ...s, activeId: p.id })}
            >
              <span className="ld-prize-name">{p.name}</span>
              <span className="ld-prize-sub">
                {p.winner ? (
                  <>
                    <Check size={14} strokeWidth={2.4} /> {p.winner}
                  </>
                ) : (
                  p.sub || " "
                )}
              </span>
            </button>
          ))}
        </div>
        )}

        <Drums ref={drums} digits={parsed.width} hidden={!!boardValue} />
        <AnimatePresence initial={false}>
          {boardValue && <ResultBoard key={boardValue} value={boardValue} digits={parsed.width} reduced={reduced} />}
        </AnimatePresence>

        <div className="ld-action">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "spinning" && (
              <motion.div key="spinning" className="ld-lower" {...swap}>
                <span className="ld-lower-tag">{active.name}</span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={caption}
                    className="ld-lower-text"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } }}
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                  >
                    {caption}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            )}

            {phase === "reveal" && s.pending && (
              <motion.div key="reveal" className="ld-reveal" {...swap}>
                <p className="ld-congrats ld-congrats-big">ขอแสดงความยินดี!</p>
                <p className="ld-reveal-sub">
                  ผู้ถือสลากหมายเลข <span className="ld-num">{s.pending.n}</span> · {pendingPrize?.name}
                </p>
                <div className="ld-buttons">
                  <button className="ld-btn ld-btn-teal" onClick={confirmWinner}>
                    <Check size={22} strokeWidth={2.2} /> มีผู้มารับรางวัล
                  </button>
                  <button className="ld-btn ld-btn-ghost" onClick={redraw}>
                    <RotateCcw size={20} strokeWidth={2} /> ไม่มีผู้มารับ · ออกรางวัลใหม่
                  </button>
                </div>
                <button className="ld-link" onClick={cancelDraw}>
                  ยกเลิกครั้งนี้ (ไม่นับผล)
                </button>
              </motion.div>
            )}

            {phase === "ready" && active.winner && (
              <motion.div key={`won-${active.id}`} className="ld-reveal" {...swap}>
                <p className="ld-won-badge">
                  <Check size={18} strokeWidth={2.4} /> ได้ผู้โชคดีแล้ว
                </p>
                <p className="ld-congrats">
                  {active.name} · สลากหมายเลข <span className="ld-num">{active.winner}</span>
                </p>
                <div className="ld-buttons">
                  {nextPrize ? (
                    <button className="ld-btn ld-btn-gold" onClick={() => setS({ ...s, activeId: nextPrize.id })}>
                      ต่อไป: {nextPrize.name}
                    </button>
                  ) : (
                    <button className="ld-btn ld-btn-gold" onClick={() => setSummaryOpen(true)}>
                      <Trophy size={20} strokeWidth={1.8} /> ดูผู้โชคดีทั้งหมด
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {phase === "ready" && !active.winner && (
              <motion.div key={`ready-${active.id}`} className="ld-ready" {...swap}>
                {pool.length ? (
                  <>
                    <button className="ld-draw" onClick={draw}>
                      <span className="ld-draw-th">เริ่มออกรางวัล</span>
                      <span className="ld-draw-en">Draw</span>
                    </button>
                    <p className="ld-hint">ออก{active.name} จากสลาก {pool.length} ใบที่ร่วมลุ้น</p>
                  </>
                ) : (
                  <>
                    <p className="ld-congrats">ไม่มีสลากเหลือให้ลุ้นแล้ว</p>
                    <button className="ld-btn ld-btn-ghost" onClick={() => setSettingsOpen(true)}>
                      <Settings size={20} strokeWidth={1.8} /> ตรวจสอบในการตั้งค่า
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Screen-reader announcement of the result */}
        <p className="ld-sr" aria-live="assertive">
          {phase === "reveal" && s.pending ? `ผู้โชคดี ${pendingPrize?.name ?? ""} หมายเลข ${s.pending.n.split("").join(" ")}` : ""}
        </p>
      </main>

      {IN_LINE && !busy && (
        <p className="ld-inapp">
          กำลังเปิดในแอป LINE — เสียงอาจไม่ดัง
          <a href={`${location.pathname}?openExternalBrowser=1`}>เปิดใน Safari / Chrome</a>
        </p>
      )}

      <footer className="ld-foot">
        <span>
          สลากที่ร่วมลุ้น <b>{pool.length}</b> / {parsed.numbers.length} ใบ
        </span>
        <span aria-hidden>·</span>
        <span>Pantika &amp; Natthakorn · 22.11.2026</span>
      </footer>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsSheet
            s={s}
            parsed={parsed}
            poolSize={pool.length}
            voiceName={voiceName}
            update={setS}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {summaryOpen && (
          <motion.div
            className="ld-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSummaryOpen(false)}
          >
            <motion.div
              className="ld-summary"
              role="dialog"
              aria-modal="true"
              aria-label="ผู้โชคดีทั้งหมด"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } }}
              exit={{ opacity: 0, y: 16, transition: { duration: 0.2 } }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="ld-icon ld-summary-close" onClick={() => setSummaryOpen(false)} aria-label="ปิด">
                <X size={22} strokeWidth={1.8} />
              </button>
              <p className="ld-kicker">Lucky Winners</p>
              <h2 className="ld-summary-title">ผู้โชคดีของเรา</h2>
              <ul className="ld-summary-list">
                {s.prizes.map((p) => (
                  <li key={p.id}>
                    <span className="ld-summary-prize">
                      <span>{p.name}</span>
                      {p.sub && <small>{p.sub}</small>}
                    </span>
                    <span className="ld-summary-num" data-empty={!p.winner || undefined}>
                      {p.winner ?? "รอจับรางวัล"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="ld-summary-thanks">ขอบคุณทุกคนที่มาร่วมเป็นส่วนหนึ่งของวันสำคัญของเรา</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
