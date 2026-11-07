/* iPad-at-a-party plumbing: synthesized sound (no audio files to load over
   venue Wi-Fi), keep-the-screen-awake, and fullscreen. Every call is wrapped
   so a browser that lacks the API simply skips it. */

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let enabled = true;
let lastTick = 0;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/* iOS only lets audio start inside a tap, so the Draw button calls this
   before anything else. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.9;
      out.connect(ctx.destination);
      // A one-sample silent buffer fully unlocks WebKit's audio session.
      const b = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.connect(out);
      src.start(0);
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* no audio — the draw is still fully visual */
  }
}

function voice(
  type: OscillatorType,
  f0: number,
  f1: number,
  start: number,
  dur: number,
  peak: number,
) {
  if (!ctx || !out) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, start);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(out);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/* Ratchet click as a digit passes the window. Throttled so six fast reels
   don't turn into a buzz; as they slow down the clicks space out on their own. */
export function tick() {
  if (!enabled || !ctx) return;
  const now = performance.now();
  if (now - lastTick < 55) return;
  lastTick = now;
  voice("triangle", 2400, 1100, ctx.currentTime, 0.04, 0.08);
}

/* A reel locking into place. */
export function thunk() {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  voice("sine", 220, 70, t, 0.22, 0.35);
  voice("triangle", 1500, 700, t, 0.05, 0.1);
}

/* Winner chime — a rising major arpeggio with a soft bell on top. */
export function fanfare() {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + 0.05;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    voice("triangle", f, f, t + i * 0.12, 0.9, 0.16);
    voice("sine", f * 2, f * 2, t + i * 0.12, 0.6, 0.05);
  });
  [1046.5, 1318.5, 1568].forEach((f) => voice("sine", f, f, t + 0.55, 1.8, 0.07));
}

/* ── Keep the screen on ── Safari 16.4+ supports the Wake Lock API; the
   lock drops whenever the page is hidden, so it is re-taken on return. */
let lock: any = null;
let wantLock = false;

export async function keepAwake() {
  wantLock = true;
  try {
    const wl = (navigator as any).wakeLock;
    if (!wl || lock) return;
    lock = await wl.request("screen");
    lock.addEventListener?.("release", () => {
      lock = null;
    });
  } catch {
    lock = null;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && wantLock) void keepAwake();
  });
}

/* ── Fullscreen ── iPadOS Safari supports element fullscreen (prefixed on
   older versions); iPhone does not, and an installed home-screen app is
   already fullscreen, so the button hides itself in both cases. */
export function isStandalone() {
  return (
    (navigator as any).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches
  );
}

export function canFullscreen() {
  const el = document.documentElement as any;
  return !isStandalone() && !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreen() {
  const d = document as any;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

export function toggleFullscreen() {
  const d = document as any;
  const el = document.documentElement as any;
  try {
    if (isFullscreen()) (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  } catch {
    /* ignore */
  }
}
