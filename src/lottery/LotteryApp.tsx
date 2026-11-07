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
import { Reels, type ReelsHandle } from "./Reels";
import { SettingsSheet } from "./SettingsSheet";
import {
  drawPool,
  loadState,
  parseSpec,
  pickRandom,
  saveState,
  type DrawState,
} from "./store";
import {
  canFullscreen,
  fanfare,
  isFullscreen,
  keepAwake,
  setSoundEnabled,
  thunk,
  tick,
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
  const reels = useRef<ReelsHandle>(null);
  const reduced = !!useReducedMotion();

  const parsed = useMemo(() => parseSpec(s.spec), [s.spec]);
  const pool = useMemo(() => drawPool(s, parsed.numbers), [s, parsed.numbers]);
  const active = s.prizes.find((p) => p.id === s.activeId) ?? s.prizes[0];
  const pendingPrize = s.pending ? s.prizes.find((p) => p.id === s.pending!.prizeId) : undefined;
  const nextPrize = s.prizes.find((p) => !p.winner && p.id !== active.id);
  const anyWinner = s.prizes.some((p) => p.winner);

  useEffect(() => saveState(s), [s]);
  useEffect(() => setSoundEnabled(s.sound), [s.sound]);

  // Settings can clear a pending draw (reset, clear prize) — fall back to ready.
  useEffect(() => {
    if (phase === "reveal" && !s.pending) setPhase("ready");
  }, [phase, s.pending]);

  // Rest the wheels on whatever the screen is about: the number awaiting
  // confirmation, this prize's confirmed winner, or "?" if it's still open.
  useEffect(() => {
    if (phase === "spinning") return;
    reels.current?.show(s.pending ? s.pending.n : active.winner);
  }, [phase, s.pending, active.winner, parsed.width]);

  // First touch anywhere: keep the iPad from dimming mid-reception.
  useEffect(() => {
    const wake = () => void keepAwake();
    window.addEventListener("pointerdown", wake, { once: true });
    return () => window.removeEventListener("pointerdown", wake);
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

  const runSpin = useCallback(
    async (base: DrawState) => {
      const candidates = drawPool(base, parseSpec(base.spec).numbers);
      if (!candidates.length) {
        setS(base);
        return;
      }
      const n = pickRandom(candidates);
      // Saved before the wheels move: a reload mid-spin shows this same number.
      setS({ ...base, pending: { n, prizeId: base.activeId } });
      setPhase("spinning");
      await reels.current?.spin(n, { onTick: tick, onReelStop: () => thunk() }, reduced);
      setPhase("reveal");
      fanfare();
      celebrate();
    },
    [reduced],
  );

  const draw = useCallback(() => {
    if (phase !== "ready" || active.winner || !pool.length) return;
    unlockAudio();
    void keepAwake();
    void runSpin(s);
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
    void runSpin({
      ...s,
      voided: [...s.voided, n],
      pending: null,
      activeId: prizeId,
      log: [...s.log, { n, prize: name, at: Date.now(), result: "void" }],
    });
  }

  /* Spun by accident — put the ticket back as if nothing happened. */
  function cancelDraw() {
    if (!s.pending) return;
    const { n, prizeId } = s.pending;
    const name = s.prizes.find((p) => p.id === prizeId)?.name ?? "";
    setS({ ...s, pending: null, log: [...s.log, { n, prize: name, at: Date.now(), result: "cancel" }] });
    setPhase("ready");
  }

  // Space / Enter draws when a keyboard or presenter clicker is attached.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen || summaryOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        draw();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draw, settingsOpen, summaryOpen]);

  const busy = phase !== "ready";

  return (
    <div className="ld-app">
      <header className="ld-top">
        <img className="ld-logo" src={pnLogo} alt="Pantika & Natthakorn" />
        <div className="ld-heading">
          <p className="ld-kicker">Wedding Lucky Draw</p>
          <h1 className="ld-title">จับรางวัลผู้โชคดี</h1>
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
            onClick={() => setS({ ...s, sound: !s.sound })}
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

        <Reels ref={reels} digits={parsed.width} glow={phase === "reveal" || (!busy && !!active.winner)} />

        <div className="ld-action">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "spinning" && (
              <motion.p key="spinning" className="ld-spinning" {...swap}>
                กำลังหมุนวงล้อ…
              </motion.p>
            )}

            {phase === "reveal" && s.pending && (
              <motion.div key="reveal" className="ld-reveal" {...swap}>
                <p className="ld-congrats">
                  ขอแสดงความยินดีกับผู้ถือสลาก <span className="ld-num">{s.pending.n}</span>
                </p>
                <p className="ld-reveal-sub">{pendingPrize?.name}</p>
                <div className="ld-buttons">
                  <button className="ld-btn ld-btn-teal" onClick={confirmWinner}>
                    <Check size={22} strokeWidth={2.2} /> มีผู้มารับรางวัล
                  </button>
                  <button className="ld-btn ld-btn-ghost" onClick={redraw}>
                    <RotateCcw size={20} strokeWidth={2} /> ไม่มีผู้มารับ · หมุนใหม่
                  </button>
                </div>
                <button className="ld-link" onClick={cancelDraw}>
                  ยกเลิกครั้งนี้ (คืนสลากเข้าวงล้อ)
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
                      <span className="ld-draw-th">หมุนวงล้อ</span>
                      <span className="ld-draw-en">Draw</span>
                    </button>
                    <p className="ld-hint">สุ่ม{active.name}จากสลาก {pool.length} ใบในวงล้อ</p>
                  </>
                ) : (
                  <>
                    <p className="ld-congrats">ไม่มีสลากเหลือในวงล้อ</p>
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

      <footer className="ld-foot">
        <span>
          สลากในวงล้อ <b>{pool.length}</b> / {parsed.numbers.length} ใบ
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
