import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { THAI_DIGITS } from "./store";

/* The drum machine: one vertical number wheel per digit, like the old
   government-lottery draw wheels. Each wheel carries 0–9 round its rim; it is
   drawn as a cylinder by placing each face at R·sin(θ) and squashing it by
   cos(θ), so no 3D transforms are needed and Safari stays smooth.

   Frames are painted straight onto the DOM through refs — a spin is ~6s of
   60fps updates on six wheels, which React state would only slow down. */

const FACES = 5; // faces rendered per wheel: centre ± 2
const STEP = Math.PI / 5; // ten faces round the rim, 36° apart
const R = 1 / (2 * Math.sin(STEP / 2)); // rim radius in face heights (≈1.618)

const mod10 = (n: number) => ((n % 10) + 10) % 10;

type Hooks = { onTick?: () => void; onReelStop?: (i: number) => void };

export type ReelsHandle = {
  /** Spin every wheel and land on `target`. Resolves when the last one stops. */
  spin(target: string, hooks: Hooks, reduced: boolean): Promise<void>;
  /** Rest on a number, or on "?" faces when `value` is null. */
  show(value: string | null): void;
};

type Plan = { p0: number; pf: number; T: number; v: number; done: boolean; face: number };

export const Reels = forwardRef<ReelsHandle, { digits: number; glow: boolean }>(function Reels(
  { digits, glow },
  ref,
) {
  const reelEls = useRef<(HTMLDivElement | null)[]>([]);
  const faceEls = useRef<(HTMLSpanElement | null)[][]>([]);
  const stripEls = useRef<(HTMLDivElement | null)[]>([]);
  const wordEls = useRef<(HTMLSpanElement | null)[]>([]);
  const pos = useRef<number[]>([]);
  const idle = useRef(true);
  const raf = useRef(0);

  function paint(i: number, velocity = 0) {
    const faces = faceEls.current[i];
    if (!faces) return;
    const p = pos.current[i] ?? 0;
    const base = Math.round(p);
    for (let j = 0; j < FACES; j++) {
      const el = faces[j];
      if (!el) continue;
      const k = base - 2 + j;
      // Positive θ is below centre: as p grows the rim rolls downward and the
      // next digit comes in over the top, like a drum turning toward you.
      const theta = (p - k) * STEP;
      const c = Math.cos(theta);
      const text = idle.current ? (k === base ? "?" : "") : String(mod10(k));
      if (el.textContent !== text) el.textContent = text;
      el.style.transform = `translateY(${(R * Math.sin(theta) * 100).toFixed(2)}%) scaleY(${Math.max(c, 0).toFixed(3)})`;
      el.style.opacity = c > 0 ? (0.2 + 0.8 * c * c).toFixed(3) : "0";
    }
    const strip = stripEls.current[i];
    if (strip) {
      const blur = velocity > 7 ? Math.min((velocity - 7) / 9, 2.2) : 0;
      strip.style.filter = blur ? `blur(${blur.toFixed(2)}px)` : "";
    }
  }

  function setState(i: number, state: "idle" | "spin" | "stop") {
    const el = reelEls.current[i];
    if (el) el.dataset.state = state;
    const w = wordEls.current[i];
    if (w) w.textContent = state === "stop" ? THAI_DIGITS[mod10(Math.round(pos.current[i] ?? 0))] : "";
  }

  function show(value: string | null) {
    cancelAnimationFrame(raf.current);
    if (value == null) {
      idle.current = true;
      for (let i = 0; i < digits; i++) {
        pos.current[i] = 0;
        setState(i, "idle");
        paint(i);
      }
      return;
    }
    idle.current = false;
    const v = value.padStart(digits, "0").slice(-digits);
    for (let i = 0; i < digits; i++) {
      const r = Math.round(pos.current[i] ?? 0);
      pos.current[i] = r + (Number(v[i]) - mod10(r));
      setState(i, "stop");
      paint(i);
    }
  }

  function spin(target: string, hooks: Hooks, reduced: boolean) {
    cancelAnimationFrame(raf.current);
    idle.current = false;
    const t = target.padStart(digits, "0").slice(-digits);

    /* Motion per wheel: a short ramp up to cruising speed, then a cubic
       ease-out onto the target face. Wheels stop left to right and the last
       one gets an extra beat of crawl — that is where the room holds its
       breath. Distance is rounded up to a whole number of faces that ends on
       the target digit, and the cruising speed is re-solved from it so the
       motion stays continuous. */
    const A = reduced ? 0.1 : 0.35;
    const V = reduced ? 12 : 26;
    const plans: Plan[] = [];
    for (let i = 0; i < digits; i++) {
      const T = reduced ? 0.6 + 0.2 * i : 1.7 + 0.55 * i + (i === digits - 1 ? 1.1 : 0);
      const k = A / 2 + (T - A) / 3;
      const p0 = Math.round(pos.current[i] ?? 0);
      let pf = Math.ceil(p0 + V * k);
      pf += mod10(Number(t[i]) - mod10(pf));
      plans.push({ p0, pf, T, v: (pf - p0) / k, done: false, face: p0 });
      pos.current[i] = p0;
      setState(i, "spin");
    }

    return new Promise<void>((resolve) => {
      const t0 = performance.now();
      const frame = (now: number) => {
        const s = (now - t0) / 1000;
        let finished = true;
        plans.forEach((pl, i) => {
          if (pl.done) return;
          let p: number;
          let vel: number;
          if (s >= pl.T) {
            p = pl.pf;
            vel = 0;
            pl.done = true;
          } else if (s < A) {
            p = pl.p0 + (pl.v * s * s) / (2 * A);
            vel = (pl.v * s) / A;
          } else {
            const T2 = pl.T - A;
            const u = (s - A) / T2;
            p = pl.p0 + (pl.v * A) / 2 + ((pl.v * T2) / 3) * (1 - (1 - u) ** 3);
            vel = pl.v * (1 - u) ** 2;
          }
          pos.current[i] = p;
          const face = Math.round(p);
          if (face !== pl.face) {
            pl.face = face;
            hooks.onTick?.();
          }
          paint(i, vel);
          if (pl.done) {
            setState(i, "stop");
            hooks.onReelStop?.(i);
          } else finished = false;
        });
        if (finished) resolve();
        else raf.current = requestAnimationFrame(frame);
      };
      raf.current = requestAnimationFrame(frame);
    });
  }

  useImperativeHandle(ref, () => ({ spin, show }));

  useLayoutEffect(() => {
    pos.current = Array(digits).fill(0);
    for (let i = 0; i < digits; i++) {
      setState(i, "idle");
      paint(i);
    }
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  return (
    <div className="machine" data-glow={glow || undefined} style={{ ["--n" as string]: digits }}>
      <div className="machine-face">
        <span className="machine-pointer machine-pointer-l" aria-hidden />
        <span className="machine-pointer machine-pointer-r" aria-hidden />
        <div className="reels" aria-hidden>
          {Array.from({ length: digits }, (_, i) => (
            <div
              className="reel"
              key={i}
              data-state="idle"
              ref={(el) => {
                reelEls.current[i] = el;
              }}
            >
              <div className="reel-window">
                <div
                  className="reel-strip"
                  ref={(el) => {
                    stripEls.current[i] = el;
                  }}
                >
                  {Array.from({ length: FACES }, (_, j) => (
                    <span
                      className="reel-face"
                      key={j}
                      ref={(el) => {
                        (faceEls.current[i] ||= [])[j] = el;
                      }}
                    />
                  ))}
                </div>
                <div className="reel-shade" />
              </div>
              <span
                className="reel-word"
                ref={(el) => {
                  wordEls.current[i] = el;
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <p className="machine-plate">งวดประจำวันที่ 22 พฤศจิกายน 2569</p>
    </div>
  );
});
