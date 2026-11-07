/* iPad-at-a-party plumbing: sound, keep-the-screen-awake, and fullscreen.
   Every call is wrapped so a browser that lacks the API simply skips it.
   The draw-hall buzzer is a real recording (47 KB, cached for offline use
   with the rest of the page); everything else is synthesized. */

import buzzerUrl from "../imports/lottery-buzzer.mp3";

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let enabled = true;

/* iOS gives web audio the "ambient" session by default: the silent switch /
   Silent Mode mutes it completely, and so do some in-app browsers. Ask for
   the "playback" session, like a music app, so the draw is always heard.
   Safari 16.4+ has an API for it; older iOS switches session when a media
   element plays, so there a silent looping <audio> is started in the tap. */
let silentEl: HTMLAudioElement | null = null;
let apiSession = false; // navigator.audioSession accepted "playback"
let mediaSession = false; // the silent media loop is playing

export const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && "ontouchend" in document);

/* Both routes, on every Apple touch device: the API where it exists, and a
   silent looping <audio> started inside a tap. WebKit switches the whole
   page to the playback session while any media element plays, which is the
   long-proven fix — and the API alone may be ignored inside in-app browsers
   such as LINE's. If iOS pauses the loop (a call, Siri), the next tap
   restarts it. */
function preferPlayback(inGesture: boolean) {
  try {
    const as = (navigator as any).audioSession;
    if (as && "type" in as) {
      if (as.type !== "playback") as.type = "playback";
      apiSession = as.type === "playback";
    }
  } catch {
    apiSession = false;
  }
  if (!inGesture || !isIOS()) return;
  try {
    if (!silentEl) {
      silentEl = document.createElement("audio");
      silentEl.setAttribute("x-webkit-airplay", "deny");
      silentEl.setAttribute("playsinline", "");
      silentEl.loop = true;
      silentEl.preload = "auto";
      silentEl.src = silentWav();
      silentEl.addEventListener("playing", () => (mediaSession = true));
      silentEl.addEventListener("pause", () => (mediaSession = false));
    }
    if (silentEl.paused) void silentEl.play().catch(() => (mediaSession = false));
  } catch {
    mediaSession = false;
  }
}
preferPlayback(false);

/* 0.25 s of 16-bit 22 kHz mono silence as a WAV blob. */
function silentWav() {
  const rate = 22050;
  const bytes = (rate / 4) * 2;
  const buf = new ArrayBuffer(44 + bytes); // sample data stays zero = silence
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + bytes, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, bytes, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

/* Wake the audio context if iOS has suspended or "interrupted" it (another
   app's audio, Siri, the announcer's speech). Harmless when already running. */
export function ensureAudio() {
  if (ctx && ctx.state !== "running") void ctx.resume().catch(() => {});
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on) rumbleStop(0.1);
}

/* iOS only lets audio start inside a real tap — a finger *lifting*
   (pointerup / touchend / click) or a key press, not pointerdown. Called on
   every such gesture and by the Draw button; cheap once audio is running. */
export function unlockAudio() {
  preferPlayback(true);
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.9;
      out.connect(ctx.destination);
      ctx.onstatechange = () => {
        // Interrupted by speech / another app: try to come straight back.
        if (ctx && ctx.state !== "running" && ctx.state !== "closed") ensureAudio();
      };
      void clip();
    }
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => {});
      // A one-sample silent buffer, played inside the gesture, completes
      // the unlock on older WebKit.
      const b = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.connect(out!);
      src.start(0);
    }
  } catch {
    /* no audio — the draw is still fully visual */
  }
}

/* For the settings screen: what the sound system is doing right now. */
export function audioStatus() {
  return {
    context: ctx ? (ctx.state as string) : "none",
    clip: clipState,
    ios: isIOS(),
    // iOS: is the page out of the "ambient" session that Silent Mode mutes?
    session: mediaSession ? "media" : apiSession ? "api" : "none",
    enabled,
  };
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

let noiseBuf: AudioBuffer | null = null;
function noise() {
  if (!ctx) return null;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/* ── The buzzer ("แอ๊ด") ──
   Thai lottery draw-hall buzzer, from myinstants.com ("เสียงออกสลากกินแบ่ง
   ประเทศไทย", uploaded by tosapon). The 2.9 s file is one long buzz, then
   two short ones; the draw uses three cuts of it (seconds into the file). */
const CUTS = {
  start: [0.2, 2.9], // แอ๊ดดดดด… แอ๊ด แอ๊ด — the draw begins
  release: [2.44, 2.63], // แอ๊ด — a drum lets its ball go
  result: [2.44, 2.9], // แอ๊ด แอ๊ด — the full number is in
} as const;
export type Signal = keyof typeof CUTS;
const CLIP_GAIN = 2.4; // the recording peaks at about −12 dBFS

let clipFile: Promise<ArrayBuffer | null> | null = null;
let clipBuf: Promise<AudioBuffer | null> | null = null;
let clipState: "idle" | "loading" | "ok" | "failed" = "idle";

/* Start downloading on page load so the first tap has nothing to wait for. */
export function preloadSounds() {
  if (clipFile) return;
  clipState = "loading";
  clipFile = fetch(buzzerUrl)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
}

function clip(): Promise<AudioBuffer | null> {
  if (!ctx) return Promise.resolve(null);
  preloadSounds();
  const ac = ctx;
  clipBuf ??= clipFile!.then((data) =>
    data
      ? new Promise<AudioBuffer | null>((res) => {
          try {
            // callback form: older Safari has no promise-returning decode
            const r = ac.decodeAudioData(
              data.slice(0),
              (b) => {
                clipState = "ok";
                res(b);
              },
              () => {
                clipState = "failed";
                res(null);
              },
            ) as unknown as Promise<AudioBuffer> | undefined;
            r?.catch?.(() => {}); // newer Safari also rejects the promise
          } catch {
            clipState = "failed";
            res(null);
          }
        })
      : ((clipState = "failed"), null),
  );
  return clipBuf;
}

export function signal(kind: Signal, when = 0) {
  if (!enabled || !ctx || !out) return;
  ensureAudio();
  const at = ctx.currentTime + when;
  void clip().then((buf) => {
    if (!enabled || !ctx || !out) return;
    if (!buf) return synthSignal(kind, Math.max(0, at - ctx.currentTime));
    const [from, to] = CUTS[kind];
    const start = Math.max(at, ctx.currentTime);
    const len = to - from;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(CLIP_GAIN, start);
    g.gain.setValueAtTime(CLIP_GAIN, start + len - 0.02);
    g.gain.linearRampToValueAtTime(0, start + len); // no click at the cut
    src.connect(g).connect(out);
    src.start(start, from, len);
  });
}

/* Fallback if the recording can't load: the same shape, synthesized as a
   100 Hz mains-hum buzzer (what the recording measures as). */
function synthSignal(kind: Signal, when: number) {
  if (kind === "start") {
    buzz(1.9, when);
    buzz(0.13, when + 2.25);
    buzz(0.13, when + 2.45);
  } else if (kind === "release") buzz(0.15, when);
  else {
    buzz(0.13, when);
    buzz(0.13, when + 0.2);
  }
}

function buzz(dur: number, when: number) {
  if (!ctx || !out) return;
  const t = ctx.currentTime + 0.01 + when;
  const end = t + dur;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
  env.gain.setValueAtTime(0.22, end - 0.04);
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 750;
  bp.Q.value = 0.7;
  const parts: [number, OscillatorType][] = [
    [100, "square"],
    [100.6, "sawtooth"],
  ];
  for (const [f, type] of parts) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.connect(bp);
    o.start(t);
    o.stop(end + 0.05);
  }
  bp.connect(env).connect(out);
}

/* Motor hum + air roar while the drums churn. Level follows how many drums
   are still turning. */
let rumble: { src: AudioBufferSourceNode; osc: OscillatorNode; gain: GainNode } | null = null;

export function rumbleStart() {
  if (!enabled || !ctx || !out || rumble) return;
  ensureAudio();
  const buf = noise();
  if (!buf) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 320;
  bp.Q.value = 0.6;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 58;
  const oscLp = ctx.createBiquadFilter();
  oscLp.type = "lowpass";
  oscLp.frequency.value = 180;
  const oscG = ctx.createGain();
  oscG.gain.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.05, t + 0.6);
  src.connect(bp).connect(gain);
  osc.connect(oscLp).connect(oscG).connect(gain);
  gain.connect(out);
  src.start(t);
  osc.start(t);
  rumble = { src, osc, gain };
}

export function rumbleLevel(x: number) {
  if (!rumble || !ctx) return;
  const t = ctx.currentTime;
  rumble.gain.gain.cancelScheduledValues(t);
  rumble.gain.gain.setValueAtTime(Math.max(rumble.gain.gain.value, 0.0001), t);
  rumble.gain.gain.exponentialRampToValueAtTime(Math.max(0.05 * x, 0.0001), t + 0.5);
}

export function rumbleStop(fade = 0.8) {
  if (!rumble || !ctx) return;
  const { src, osc, gain } = rumble;
  rumble = null;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  src.stop(t + fade + 0.05);
  osc.stop(t + fade + 0.05);
}

/* Balls knocking into each other and the drum wall — the clatter that
   carries the broadcast. A bright noise click plus a short plastic "tik",
   loud enough to stay clear under the announcer and through a mic. */
let lastClack = 0;
export function clack(v: number) {
  if (!enabled || !ctx || !out) return;
  const now = performance.now();
  if (now - lastClack < 24) return;
  lastClack = now;
  const buf = noise();
  if (!buf) return;
  const t = ctx.currentTime;
  const peak = Math.min(0.14 + v * 0.05, 0.42);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2400 + Math.random() * 2200;
  bp.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  src.connect(bp).connect(g).connect(out);
  src.start(t, Math.random() * 0.9, 0.045);
  const f = 3200 + Math.random() * 1400;
  voice("triangle", f, f * 0.75, t, 0.025, peak * 0.45);
}

/* One ping-pong "pok" — the result ball bouncing in its cup: a hollow body
   tone, a bright tip and a click of air. */
export function pok(v = 1) {
  if (!enabled || !ctx || !out) return;
  ensureAudio();
  const t = ctx.currentTime;
  voice("sine", 1750, 1250, t, 0.075, 0.5 * v);
  voice("triangle", 3800, 2600, t, 0.02, 0.18 * v);
  const buf = noise();
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3000;
  bp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.25 * v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
  src.connect(bp).connect(g).connect(out);
  src.start(t, Math.random() * 0.9, 0.03);
}

/* Winner chime — a rising major arpeggio with a soft bell on top. */
export function fanfare(when = 0) {
  if (!enabled || !ctx) return;
  ensureAudio();
  const t = ctx.currentTime + 0.05 + when;
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
