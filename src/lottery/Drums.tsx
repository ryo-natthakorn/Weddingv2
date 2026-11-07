import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { positionName } from "./store";

/* The draw machines — a send-up of the government lottery broadcast: one
   clear drum per digit, each holding ten ping-pong balls numbered 0–9. On a
   draw the drums churn, then left to right each one drops the ball for its
   digit down a chute into a cup where it is shown to the room.

   The winning ticket is picked first (uniformly, in LotteryApp); the drums
   are theatre that land on it, and LotteryApp paces the show — buzzer,
   announcer, then each drop. Each drum is a small 2D physics sim drawn on
   its own canvas — gravity, an air jet and paddle kicks while spinning,
   ball/wall and ball/ball collisions — stepped from one shared rAF loop that
   stops once every drum has settled. */

/* Canvas geometry as fractions of the drum's CSS width W. */
export const ASPECT = 1.78; // canvas height / width
const GR = 0.44; // globe radius
const GCY = 0.48; // globe centre y
const TB = 0.34; // result-ball radius in the cup
const TRAY_Y = GCY + GR + 0.12 + TB; // result-ball centre y

/* Physics units: globe radii. */
const BR = 0.19; // ball radius
const GRAV = 14;
const E_WALL = 0.55;
const E_BALL = 0.8;
const TRAY_U = (TRAY_Y - GCY) / GR;
const TB_U = TB / GR;
const TAU = Math.PI * 2;

const rand = Math.random;
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

type Ball = { d: number; x: number; y: number; vx: number; vy: number; a: number; va: number };
type Mode = "rest" | "spin" | "pull" | "fall" | "land" | "shown";

class DrumSim {
  balls: Ball[] = [];
  moving: Ball | null = null; // the ball leaving the drum or sitting in the cup
  mode: Mode = "rest";
  omega = 0;
  omegaT = 0;
  churn = 0;
  churnT = 0;
  theta = rand() * TAU;
  t = 0;
  scale = BR;
  hop = 0;
  hopV = 0;
  quiet = 0;
  restFor = 0;
  awake = true;
  onClack?: (v: number) => void;
  onBounce?: (v: number) => void;
  private landed?: () => void;

  constructor() {
    for (let d = 0; d < 10; d++) {
      const ang = rand() * TAU;
      const rr = rand() * 0.6;
      this.balls.push({ d, x: Math.cos(ang) * rr, y: Math.sin(ang) * rr, vx: 0, vy: 0, a: rand() * TAU, va: 0 });
    }
    this.settle();
  }

  /* Run the sim silently until the balls lie in a heap at the bottom. */
  settle() {
    const clack = this.onClack;
    this.onClack = undefined;
    for (let i = 0; i < 360; i++) this.physics(1 / 240);
    for (const b of this.balls) {
      b.vx = b.vy = b.va = 0;
    }
    this.onClack = clack;
  }

  wake() {
    this.awake = true;
    this.quiet = 0;
    this.restFor = 0;
  }

  /* Drop the ball from the cup back in through the top of the drum. */
  returnBall() {
    const b = this.moving;
    if (!b) return;
    this.moving = null;
    b.x = (rand() - 0.5) * 0.3;
    b.y = -0.55;
    b.vx = 0;
    b.vy = 0;
    this.balls.push(b);
  }

  startSpin(intensity: number) {
    this.returnBall();
    this.mode = "spin";
    this.omegaT = 7 * intensity;
    this.churnT = intensity;
    this.wake();
  }

  release(d: number, done: () => void) {
    let i = this.balls.findIndex((b) => b.d === d);
    if (i < 0) {
      this.returnBall();
      i = this.balls.findIndex((b) => b.d === d);
    }
    this.moving = this.balls.splice(i, 1)[0];
    this.mode = "pull";
    this.t = 0;
    this.landed = done;
    this.wake();
  }

  /* Rest on a digit in the cup (or an empty cup) without any draw. */
  showStatic(d: number | null) {
    if (d === null) {
      if (this.moving) {
        this.returnBall();
        this.wake();
      }
      this.mode = "rest";
      this.omegaT = this.churnT = 0;
      return;
    }
    if (this.mode === "shown" && this.moving?.d === d) return;
    this.returnBall();
    const i = this.balls.findIndex((b) => b.d === d);
    this.moving = this.balls.splice(i, 1)[0];
    this.moving.a = 0;
    this.scale = TB_U;
    this.hop = this.hopV = 0;
    this.mode = "shown";
    this.omegaT = this.churnT = 0;
    this.wake();
  }

  step(dt: number) {
    const subs = 3;
    const h = dt / subs;
    for (let i = 0; i < subs; i++) {
      this.physics(h);
      this.transit(h);
    }
    if (this.mode === "rest" || this.mode === "shown") {
      this.restFor += dt;
      let max = 0;
      for (const b of this.balls) max = Math.max(max, Math.abs(b.vx) + Math.abs(b.vy));
      if ((max < 0.15 && this.omega < 0.03 && this.churn < 0.03) || this.restFor > 4) {
        this.quiet += dt;
        if (this.quiet > 0.4) this.awake = false;
      } else this.quiet = 0;
    }
  }

  private physics(h: number) {
    this.omega += (this.omegaT - this.omega) * Math.min(1, h * 2);
    this.churn += (this.churnT - this.churn) * Math.min(1, h * 2.5);
    this.theta += this.omega * h;
    const lim = 1 - BR;
    const ch = this.churn;

    for (const b of this.balls) {
      b.vy += GRAV * h;
      if (ch > 0.01) {
        // air jet from the floor plus sideways turbulence
        if (b.y > 0.15) b.vy -= ch * 34 * h * (0.5 + rand());
        b.vx += ch * (rand() - 0.5) * 50 * h;
      }
      b.vx *= 1 - 0.3 * h;
      b.vy *= 1 - 0.3 * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.a += b.va * h;
      b.va *= 1 - 1.2 * h;

      const dist = Math.hypot(b.x, b.y);
      if (dist > lim) {
        const nx = b.x / dist;
        const ny = b.y / dist;
        b.x = nx * lim;
        b.y = ny * lim;
        const vn = b.vx * nx + b.vy * ny;
        if (vn > 0) {
          if (vn > 1.8) this.onClack?.(vn);
          const e = vn < 0.4 ? 0 : E_WALL;
          b.vx -= (1 + e) * vn * nx;
          b.vy -= (1 + e) * vn * ny;
          // the turning wall drags the ball along and sets it rolling
          const tx = -ny;
          const ty = nx;
          const vt = b.vx * tx + b.vy * ty;
          const dvt = (this.omega * lim - vt) * 0.35;
          b.vx += dvt * tx;
          b.vy += dvt * ty;
          b.va = ((vt + dvt) / BR) * 0.5;
          // paddles inside the drum kick it back into the air
          if (ch > 0.3 && rand() < 0.25) {
            const k = (1.5 + rand() * 3.5) * ch;
            b.vx -= nx * k;
            b.vy -= ny * k;
          }
        }
      }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 9) {
        b.vx *= 9 / sp;
        b.vy *= 9 / sp;
      }
    }

    const n = this.balls.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) this.collide(this.balls[i], this.balls[j], false);
    if (this.mode === "pull" && this.moving) for (const b of this.balls) this.collide(b, this.moving, true);
  }

  private collide(p: Ball, q: Ball, qFixed: boolean) {
    let dx = q.x - p.x;
    let dy = q.y - p.y;
    const min = 2 * BR;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return;
    let d = Math.sqrt(d2);
    if (d < 1e-6) {
      dx = 1e-3;
      dy = 0;
      d = 1e-3;
    }
    const nx = dx / d;
    const ny = dy / d;
    const over = min - d;
    if (qFixed) {
      p.x -= nx * over;
      p.y -= ny * over;
    } else {
      p.x -= (nx * over) / 2;
      p.y -= (ny * over) / 2;
      q.x += (nx * over) / 2;
      q.y += (ny * over) / 2;
    }
    const rv = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
    if (rv >= 0) return;
    if (-rv > 2.2) this.onClack?.(-rv);
    const e = -rv < 0.4 ? 0 : E_BALL;
    if (qFixed) {
      p.vx += (1 + e) * rv * nx;
      p.vy += (1 + e) * rv * ny;
    } else {
      const j = (-(1 + e) * rv) / 2;
      p.vx -= j * nx;
      p.vy -= j * ny;
      q.vx += j * nx;
      q.vy += j * ny;
    }
  }

  /* The chosen ball: pulled to the gate, dropped down the chute, then it
     pops up to full size in the cup with a few ping-pong bounces. */
  private transit(h: number) {
    const m = this.moving;
    if (!m) return;
    if (this.mode === "pull") {
      this.t += h;
      const gy = 1 - BR;
      const k = 140;
      const c = 2 * Math.sqrt(k) * 0.9;
      m.vx += (k * (0 - m.x) - c * m.vx) * h;
      m.vy += (k * (gy - m.y) - c * m.vy) * h;
      m.x += m.vx * h;
      m.y += m.vy * h;
      // turn the number upright on its way out
      const a = ((m.a % TAU) + TAU) % TAU;
      m.a = a > Math.PI ? a + (TAU - a) * Math.min(1, 6 * h) : a * (1 - Math.min(1, 6 * h));
      if (Math.hypot(m.x, gy - m.y) < 0.03 || this.t > 0.9) {
        m.x = 0;
        m.y = gy;
        m.vx = 0;
        m.vy = 1.5;
        m.a = 0;
        this.mode = "fall";
      }
    } else if (this.mode === "fall") {
      m.vy += 45 * h;
      m.y += m.vy * h;
      if (m.y >= TRAY_U) {
        m.y = TRAY_U;
        this.mode = "land";
        this.t = 0;
        this.hop = 0;
        this.hopV = 3.4;
        this.onBounce?.(1);
      }
    } else if (this.mode === "land") {
      this.t += h;
      this.scale = BR + (TB_U - BR) * easeOutBack(Math.min(this.t / 0.4, 1));
      this.hopV -= 32 * h;
      this.hop += this.hopV * h;
      if (this.hop <= 0) {
        this.hop = 0;
        if (Math.abs(this.hopV) > 0.6) {
          this.onBounce?.(Math.abs(this.hopV) / 3.4);
          this.hopV = -this.hopV * 0.55;
        } else this.hopV = 0;
      }
      if (this.hopV === 0 && this.t >= 0.4) {
        this.mode = "shown";
        this.scale = TB_U;
        this.omegaT = 0;
        this.churnT = 0;
        const cb = this.landed;
        this.landed = undefined;
        cb?.();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, W: number) {
    const H = W * ASPECT;
    ctx.clearRect(0, 0, W, H);
    const R = GR * W;
    const cx = W / 2;
    const cy = GCY * W;
    const trayY = TRAY_Y * W;
    const Rb = TB * W;
    const rimY = trayY + Rb * 0.55;
    const r = BR * R;
    const m = this.moving;

    // chute — a glass tube from the gate down to the cup
    const cw = r * 1.3;
    const chuteTop = cy + R * 0.96;
    const chuteBot = rimY - Rb * 0.1;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(cx - cw, chuteTop, cw * 2, chuteBot - chuteTop);
    ctx.strokeStyle = "rgba(232,217,168,0.32)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - cw, chuteTop);
    ctx.lineTo(cx - cw, chuteBot);
    ctx.moveTo(cx + cw, chuteTop);
    ctx.lineTo(cx + cw, chuteBot);
    ctx.stroke();

    // globe, back half
    const back = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    back.addColorStop(0, "rgba(255,255,255,0.13)");
    back.addColorStop(0.75, "rgba(255,255,255,0.04)");
    back.addColorStop(1, "rgba(255,255,255,0.10)");
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();

    // paddles turning with the drum
    ctx.strokeStyle = "rgba(232,217,168,0.3)";
    ctx.lineWidth = Math.max(1.5, R * 0.045);
    ctx.lineCap = "round";
    for (let k = 0; k < 4; k++) {
      const ang = this.theta + (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * R * 0.97, cy + Math.sin(ang) * R * 0.97);
      ctx.quadraticCurveTo(
        cx + Math.cos(ang + 0.12) * R * 0.85,
        cy + Math.sin(ang + 0.12) * R * 0.85,
        cx + Math.cos(ang + 0.2) * R * 0.72,
        cy + Math.sin(ang + 0.2) * R * 0.72,
      );
      ctx.stroke();
    }

    // balls in the drum
    ctx.font = `600 ${r * 1.12}px "TT Interphases", "Noto Sans Thai", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const b of this.balls) drawBall(ctx, cx + b.x * R, cy + b.y * R, r, b.d, b.a);
    if (m && this.mode === "pull") drawBall(ctx, cx + m.x * R, cy + m.y * R, r, m.d, m.a);

    // globe, front: glass highlight and gold rim
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = R * 0.06;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.84, Math.PI * 1.08, Math.PI * 1.36);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(cx - R * 0.5, cy - R * 0.58, R * 0.045, 0, TAU);
    ctx.fill();
    const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rim.addColorStop(0, "#e3cf86");
    rim.addColorStop(0.35, "#8a7030");
    rim.addColorStop(0.6, "#c4a840");
    rim.addColorStop(1, "#6b5520");
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(2, R * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();

    // gate collar at the bottom of the drum
    ctx.fillStyle = rim;
    roundRect(ctx, cx - cw * 1.35, cy + R * 0.9, cw * 2.7, R * 0.16, R * 0.05);
    ctx.fill();

    if (m && this.mode === "fall") drawBall(ctx, cx, cy + m.y * R, r, m.d, 0);

    // the cup: back of the rim, the ball (or an empty "?"), then the front
    ctx.fillStyle = "#4a3a12";
    ctx.beginPath();
    ctx.ellipse(cx, rimY, Rb * 0.8, Rb * 0.2, 0, 0, TAU);
    ctx.fill();

    if (m && (this.mode === "land" || this.mode === "shown")) {
      const by = trayY - this.hop * R;
      const br = this.scale * R;
      ctx.font = `600 ${br * 1.12}px "TT Interphases", "Noto Sans Thai", sans-serif`;
      drawBall(ctx, cx, by, br, m.d, 0);
    } else {
      ctx.setLineDash([Rb * 0.18, Rb * 0.14]);
      ctx.strokeStyle = "rgba(232,217,168,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, trayY, Rb * 0.92, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(232,217,168,0.55)";
      ctx.font = `600 ${Rb * 0.95}px "TT Interphases", "Noto Sans Thai", sans-serif`;
      ctx.fillText("?", cx, trayY + Rb * 0.05);
    }

    const body = ctx.createLinearGradient(cx - Rb, 0, cx + Rb, 0);
    body.addColorStop(0, "#6b5520");
    body.addColorStop(0.35, "#c4a840");
    body.addColorStop(0.55, "#e3cf86");
    body.addColorStop(1, "#7a6224");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(cx + Rb * 0.8, rimY);
    ctx.bezierCurveTo(cx + Rb * 0.78, rimY + Rb * 0.3, cx + Rb * 0.5, rimY + Rb * 0.42, cx + Rb * 0.3, rimY + Rb * 0.44);
    ctx.lineTo(cx - Rb * 0.3, rimY + Rb * 0.44);
    ctx.bezierCurveTo(cx - Rb * 0.5, rimY + Rb * 0.42, cx - Rb * 0.78, rimY + Rb * 0.3, cx - Rb * 0.8, rimY);
    ctx.ellipse(cx, rimY, Rb * 0.8, Rb * 0.2, 0, Math.PI, 0, true);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, rimY + Rb * 0.47, Rb * 0.5, Rb * 0.08, 0, 0, TAU);
    ctx.fill();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* A ping-pong ball: shaded white, the digit in teal ink, and an underline on
   6 and 9 as on real draw balls. Font is set by the caller. */
function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, d: number, a: number) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.55, "#f6f1e7");
  g.addColorStop(1, "#c9bea6");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = "#123a4c";
  ctx.fillText(String(d), 0, r * 0.06);
  if (d === 6 || d === 9) ctx.fillRect(-r * 0.28, r * 0.52, r * 0.56, Math.max(1, r * 0.08));
  ctx.restore();
}

/* ── React wrapper ─────────────────────────────────── */

export type DrumsHandle = {
  /** Start every drum churning (balls in the cups go back in first). */
  churn(reduced: boolean, sounds: { onClack?: (v: number) => void; onBounce?: (v: number) => void }): void;
  /** Drum `i` drops the ball numbered `d`; resolves once it sits in the cup. */
  drop(i: number, d: number): Promise<void>;
  /** Show a number in the cups (or empty cups for null) with no draw. */
  show(value: string | null): void;
};

export const Drums = forwardRef<DrumsHandle, { digits: number; hidden: boolean }>(function Drums(
  { digits, hidden },
  ref,
) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const widths = useRef<number[]>([]);
  const sims = useRef<DrumSim[]>([]);
  const raf = useRef(0);
  const running = useRef(false);
  const last = useRef(0);

  function drawOne(i: number) {
    const c = canvases.current[i];
    const s = sims.current[i];
    const W = widths.current[i];
    if (!c || !s || !W) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = c.width / W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    s.draw(ctx, W);
  }
  const drawAll = () => sims.current.forEach((_, i) => drawOne(i));

  function frame(now: number) {
    const dt = Math.min((now - last.current) / 1000, 1 / 30);
    last.current = now;
    let any = false;
    sims.current.forEach((s, i) => {
      if (!s.awake) return;
      s.step(dt);
      drawOne(i);
      any = true;
    });
    if (any) raf.current = requestAnimationFrame(frame);
    else running.current = false;
  }

  function kick() {
    if (running.current) return;
    running.current = true;
    last.current = performance.now();
    raf.current = requestAnimationFrame(frame);
  }

  useImperativeHandle(ref, () => ({
    churn(reduced, sounds) {
      sims.current.forEach((s) => {
        s.onClack = sounds.onClack;
        s.onBounce = sounds.onBounce;
        s.startSpin(reduced ? 0.6 : 1);
      });
      kick();
    },
    drop(i, d) {
      const s = sims.current[i];
      if (!s) return Promise.resolve();
      return new Promise<void>((resolve) => {
        s.release(d, resolve);
        kick();
      });
    },
    show(value) {
      const n = sims.current.length;
      const v = value == null ? null : value.padStart(n, "0").slice(-n);
      sims.current.forEach((s, i) => s.showStatic(v == null ? null : Number(v[i])));
      drawAll();
      kick();
    },
  }));

  useLayoutEffect(() => {
    sims.current = Array.from({ length: digits }, () => new DrumSim());
    widths.current = [];
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvases.current.slice(0, digits).forEach((c, i) => {
        if (!c) return;
        const W = c.clientWidth;
        if (!W) return;
        widths.current[i] = W;
        c.width = Math.round(W * dpr);
        c.height = Math.round(W * ASPECT * dpr);
      });
      drawAll();
    });
    canvases.current.slice(0, digits).forEach((c) => c && ro.observe(c));
    // Canvas text only uses a web font once it has loaded — redraw then.
    document.fonts?.load('600 40px "TT Interphases"').then(drawAll, () => {});
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf.current);
      running.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  return (
    <div
      className="stage"
      hidden={hidden}
      style={{ ["--n" as string]: digits, ["--half" as string]: Math.ceil(digits / 2) }}
    >
      <div className="stage-panel">
        <div className="drums" aria-hidden>
          {Array.from({ length: digits }, (_, i) => (
            <div className="drum" key={i}>
              <canvas
                className="drum-canvas"
                ref={(el) => {
                  canvases.current[i] = el;
                }}
              />
              <span className="drum-label">{positionName(i, digits)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
